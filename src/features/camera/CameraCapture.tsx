import { useCallback, useEffect, useRef, useState } from 'react'
import type { PhotoMetadata } from '../../database/models'
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
  const [storedPhotos, setStoredPhotos] = useState<StoredPhotoPreview[]>([])
  const [errorMessage, setErrorMessage] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isSavingImage, setIsSavingImage] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

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
      await saveImage(capturedImageBlob)
      await loadStoredImages()
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

  return (
    <section className="camera-capture" aria-labelledby="camera-capture-title">
      <div className="camera-capture__header">
        <div>
          <p className="camera-capture__eyebrow">Phase 4</p>
          <h2 id="camera-capture-title">Chụp và lưu ảnh hóa đơn</h2>
          <p>
            Bật camera, xem preview, chụp ảnh và lưu ảnh đã nén vào OPFS hoặc
            IndexedDB fallback.
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
