import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoMetadata, TransactionType } from '../../database/models'
import {
  captureImageFromVideo,
  startCamera,
  stopCamera,
} from '../../services/cameraService'
import {
  getPhotoBlob,
  getStoredPhotos,
  saveImage,
} from '../../services/imageStorageService'
import './CameraCapture.css'

type StoredPhotoPreview = {
  metadata: PhotoMetadata
  url: string
}

const transactionTypeOptions: Array<{
  label: string
  value: TransactionType
}> = [
  { label: 'Thu nhập', value: 'income' },
  { label: 'Chi tiêu', value: 'expense' },
]

const transactionTypeLabels: Record<TransactionType, string> = {
  expense: 'Chi tiêu',
  income: 'Thu nhập',
}

async function buildStoredPhotoPreviews(): Promise<StoredPhotoPreview[]> {
  const photos = await getStoredPhotos()

  return Promise.all(
    photos.map(async (metadata) => {
      const blob = await getPhotoBlob(metadata)
      const url = URL.createObjectURL(blob)

      return {
        metadata,
        url,
      }
    }),
  )
}

export function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const previewUrlsRef = useRef<string[]>([])
  const [latestCapturedPhoto, setLatestCapturedPhoto] =
    useState<StoredPhotoPreview | null>(null)
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType | null>(null)
  const [storedPhotos, setStoredPhotos] = useState<StoredPhotoPreview[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [transactionDraftMessage, setTransactionDraftMessage] = useState('')

  const revokePreviewUrls = useCallback(() => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    previewUrlsRef.current = []
  }, [])

  const replaceStoredPhotoPreviews = useCallback((previews: StoredPhotoPreview[]) => {
    revokePreviewUrls()
    previewUrlsRef.current = previews.map((preview) => preview.url)
    setStoredPhotos(previews)
  }, [revokePreviewUrls])

  const loadStoredImages = useCallback(async () => {
    const previews = await buildStoredPhotoPreviews()
    replaceStoredPhotoPreviews(previews)

    return previews
  }, [replaceStoredPhotoPreviews])

  useEffect(() => {
    let isActive = true

    void buildStoredPhotoPreviews().then((previews) => {
      if (isActive) {
        replaceStoredPhotoPreviews(previews)
      }
    })

    return () => {
      isActive = false
      stopCamera(streamRef.current)
      revokePreviewUrls()
    }
  }, [replaceStoredPhotoPreviews, revokePreviewUrls])

  async function handleStartCamera() {
    setErrorMessage('')
    setIsStartingCamera(true)

    try {
      stopCamera(streamRef.current)

      const stream = await startCamera()
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsCameraActive(true)
    } catch (error) {
      stopCamera(streamRef.current)
      streamRef.current = null
      setIsCameraActive(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể bật camera. Vui lòng kiểm tra quyền truy cập camera.',
      )
    } finally {
      setIsStartingCamera(false)
    }
  }

  function handleStopCamera() {
    stopCamera(streamRef.current)
    streamRef.current = null

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraActive(false)
  }

  async function handleCaptureImage() {
    if (!videoRef.current) {
      setErrorMessage('Camera chưa sẵn sàng để chụp ảnh.')
      return
    }

    setIsSavingImage(true)

    try {
      const capturedImageBlob = await captureImageFromVideo(videoRef.current)
      const savedPhoto = await saveImage(capturedImageBlob)
      const previews = await loadStoredImages()
      const capturedPhoto =
        previews.find((photo) => photo.metadata.id === savedPhoto.id) ?? null

      setLatestCapturedPhoto(capturedPhoto)
      setSelectedTransactionType(null)
      setTransactionDraftMessage('')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể chụp và lưu ảnh.',
      )
    } finally {
      setIsSavingImage(false)
    }
  }

  function handleSelectTransactionType(type: TransactionType) {
    setSelectedTransactionType(type)
    setTransactionDraftMessage('')
  }

  function handleSaveTransactionDraft() {
    if (!selectedTransactionType) {
      setErrorMessage('Vui lòng chọn Thu nhập hoặc Chi tiêu trước khi lưu.')
      return
    }

    setErrorMessage('')
    setTransactionDraftMessage(
      `Đã chọn loại giao dịch: ${transactionTypeLabels[selectedTransactionType]}.`,
    )
  }

  const cameraCaptureClassName = selectedTransactionType
    ? `camera-capture camera-capture--${selectedTransactionType}`
    : 'camera-capture'

  return (
    <section
      className={cameraCaptureClassName}
      aria-labelledby="camera-capture-title"
    >
      <div className="camera-capture__header">
        <div>
          <p className="camera-capture__eyebrow">Phase 5</p>
          <h2 id="camera-capture-title">Chụp ảnh và chọn loại giao dịch</h2>
          <p>
            Bật camera, chụp ảnh hóa đơn, sau đó chọn Thu nhập hoặc Chi tiêu
            trước khi nhập thông tin giao dịch.
          </p>
        </div>

        <div className="camera-capture__actions">
          <button
            disabled={isStartingCamera}
            onClick={() => {
              void handleStartCamera()
            }}
            type="button"
          >
            {isStartingCamera ? 'Đang bật...' : 'Bật camera'}
          </button>
          <button
            disabled={!isCameraActive || isSavingImage}
            onClick={() => {
              void handleCaptureImage()
            }}
            type="button"
          >
            {isSavingImage ? 'Đang lưu...' : 'Chụp và lưu'}
          </button>
          <button
            disabled={!isCameraActive}
            onClick={handleStopCamera}
            type="button"
          >
            Tắt
          </button>
        </div>
      </div>

      {errorMessage ? (
        <p className="camera-capture__error">{errorMessage}</p>
      ) : null}

      <div className="camera-capture__content">
        <div className="camera-capture__preview">
          <video
            aria-label="Camera preview"
            autoPlay
            muted
            playsInline
            ref={videoRef}
          />
          {!isCameraActive ? (
            <div className="camera-capture__placeholder">
              Camera preview sẽ hiển thị ở đây.
            </div>
          ) : null}
        </div>

        <div className="camera-capture__result">
          {latestCapturedPhoto ? (
            <div className="camera-capture__transaction-step">
              <div className="camera-capture__latest-photo">
                <img
                  alt="Ảnh hóa đơn vừa chụp"
                  src={latestCapturedPhoto.url}
                />
              </div>

              <div className="camera-capture__type-step">
                <h3>Chọn loại giao dịch</h3>
                <div className="camera-capture__type-options">
                  {transactionTypeOptions.map((option) => (
                    <button
                      aria-pressed={selectedTransactionType === option.value}
                      className="camera-capture__type-button"
                      key={option.value}
                      onClick={() => handleSelectTransactionType(option.value)}
                      type="button"
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {selectedTransactionType ? (
                <div className="camera-capture__info-step">
                  <h3>Nhập thông tin</h3>
                  <p>
                    Đang nhập giao dịch{' '}
                    {transactionTypeLabels[
                      selectedTransactionType
                    ].toLowerCase()}
                    .
                  </p>
                  <button onClick={handleSaveTransactionDraft} type="button">
                    Lưu thông tin
                  </button>
                  {transactionDraftMessage ? (
                    <p className="camera-capture__success">
                      {transactionDraftMessage}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          <h3>Ảnh đã lưu</h3>
          {storedPhotos.length > 0 ? (
            <div className="camera-capture__photos">
              {storedPhotos.map((photo) => (
                <article key={photo.metadata.id}>
                  <img alt="Ảnh hóa đơn đã lưu" src={photo.url} />
                  <dl>
                    <div>
                      <dt>Kích thước</dt>
                      <dd>
                        {photo.metadata.width} x {photo.metadata.height}
                      </dd>
                    </div>
                    <div>
                      <dt>Dung lượng</dt>
                      <dd>{Math.round(photo.metadata.sizeBytes / 1024)} KB</dd>
                    </div>
                    <div>
                      <dt>Lưu trữ</dt>
                      <dd>{photo.metadata.storageType.toUpperCase()}</dd>
                    </div>
                  </dl>
                </article>
              ))}
            </div>
          ) : (
            <p>Chưa có ảnh nào được lưu.</p>
          )}
        </div>
      </div>
    </section>
  )
}
