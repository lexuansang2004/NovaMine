import { useEffect, useRef, useState } from 'react'
import type { TransactionType } from '../../database/models'
import { createTransaction } from '../../repositories/transactionsRepository'
import {
  captureImageFromVideo,
  shouldMirrorCamera,
  startCamera,
  stopCamera,
} from '../../services/cameraService'
import {
  attachPhotoToTransaction,
  saveImage,
} from '../../services/imageStorageService'
import {
  isVietnameseSpeechRecognitionSupported,
  listenVietnameseCategoryName,
  logCategoryVoiceInput,
} from '../../services/speechService'
import { formatVnd } from '../../utils/currency'
import './CameraCapture.css'

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

type CapturedPhotoDraft = {
  blob: Blob
  capturedAt: string
  url: string
}

type CameraCaptureProps = {
  onTransactionCreated: () => Promise<void>
}

function formatCapturedAt(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

export function CameraCapture({ onTransactionCreated }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const capturedPhotoUrlRef = useRef<string | null>(null)
  const [capturedPhotoDraft, setCapturedPhotoDraft] =
    useState<CapturedPhotoDraft | null>(null)
  const [selectedTransactionType, setSelectedTransactionType] =
    useState<TransactionType | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCameraMirrored, setIsCameraMirrored] = useState(false)
  const [isCategoryConfirmed, setIsCategoryConfirmed] = useState(false)
  const [isListeningCategory, setIsListeningCategory] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionDraftMessage, setTransactionDraftMessage] = useState('')
  const [transactionNote, setTransactionNote] = useState('')
  const [transactionTitle, setTransactionTitle] = useState('')
  const [voiceConfidence, setVoiceConfidence] = useState<number | null>(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const voiceTranscriptRef = useRef('')

  function revokeCapturedPhotoUrl() {
    if (capturedPhotoUrlRef.current) {
      URL.revokeObjectURL(capturedPhotoUrlRef.current)
      capturedPhotoUrlRef.current = null
    }
  }

  function resetTransactionDraft() {
    setSelectedTransactionType(null)
    setIsCategoryConfirmed(false)
    setTransactionAmount('')
    setTransactionNote('')
    setTransactionTitle('')
    setVoiceConfidence(null)
    setVoiceTranscript('')
    voiceTranscriptRef.current = ''
  }

  function clearCapturedPhotoDraft() {
    revokeCapturedPhotoUrl()
    setCapturedPhotoDraft(null)
    resetTransactionDraft()
    setErrorMessage('')
  }

  useEffect(() => {
    return () => {
      stopCamera(streamRef.current)
      revokeCapturedPhotoUrl()
    }
  }, [])

  async function handleStartCamera() {
    setErrorMessage('')
    setIsStartingCamera(true)

    try {
      stopCamera(streamRef.current)

      const stream = await startCamera()
      streamRef.current = stream
      setIsCameraMirrored(shouldMirrorCamera(stream))

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsCameraActive(true)
    } catch (error) {
      stopCamera(streamRef.current)
      streamRef.current = null
      setIsCameraMirrored(false)
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
    setIsCameraMirrored(false)

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

    setIsSaving(true)

    try {
      const capturedImageBlob = await captureImageFromVideo(videoRef.current, {
        mirror: isCameraMirrored,
      })
      const capturedImageUrl = URL.createObjectURL(capturedImageBlob)

      revokeCapturedPhotoUrl()
      capturedPhotoUrlRef.current = capturedImageUrl
      setCapturedPhotoDraft({
        blob: capturedImageBlob,
        capturedAt: new Date().toISOString(),
        url: capturedImageUrl,
      })
      resetTransactionDraft()
      setTransactionDraftMessage('')
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể chụp ảnh.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  function handleSelectTransactionType(type: TransactionType) {
    setSelectedTransactionType(type)
    setIsCategoryConfirmed(false)
    setTransactionAmount('')
    setTransactionDraftMessage('')
    setTransactionNote('')
    setTransactionTitle('')
    setVoiceConfidence(null)
    setVoiceTranscript('')
    voiceTranscriptRef.current = ''
    setErrorMessage('')
  }

  async function handleListenCategoryName() {
    setErrorMessage('')
    setIsCategoryConfirmed(false)
    setIsListeningCategory(true)
    setTransactionTitle('')
    setVoiceConfidence(null)
    setVoiceTranscript('')
    voiceTranscriptRef.current = ''

    try {
      const result = await listenVietnameseCategoryName({
        onTranscript: (update) => {
          voiceTranscriptRef.current = update.transcript
          setVoiceTranscript(update.transcript)

          if (update.confidence !== null) {
            setVoiceConfidence(update.confidence)
          }
        },
      })

      voiceTranscriptRef.current = result.transcript
      setVoiceTranscript(result.transcript)
      setVoiceConfidence(result.confidence)
      setTransactionTitle(result.transcript)
      await logCategoryVoiceInput({
        confidence: result.confidence,
        status: 'recognized',
        transcript: result.transcript,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể nhận diện tên loại phí.'

      setErrorMessage(message)
      await logCategoryVoiceInput({
        errorMessage: message,
        status: 'failed',
        transcript: voiceTranscriptRef.current,
      })
    } finally {
      setIsListeningCategory(false)
    }
  }

  function handleConfirmCategoryName() {
    const normalizedCategoryName = voiceTranscript.trim()

    if (!normalizedCategoryName) {
      setErrorMessage('Vui lòng bấm micro để nhập tên loại phí trước.')
      return
    }

    setTransactionTitle(normalizedCategoryName)
    setIsCategoryConfirmed(true)
    setErrorMessage('')
  }

  async function handleSaveTransactionDraft() {
    if (!capturedPhotoDraft) {
      setErrorMessage('Vui lòng chụp ảnh trước khi lưu giao dịch.')
      return
    }

    if (!selectedTransactionType) {
      setErrorMessage('Vui lòng chọn Thu nhập hoặc Chi tiêu trước khi lưu.')
      return
    }

    if (!isCategoryConfirmed || !transactionTitle.trim()) {
      setErrorMessage('Vui lòng xác nhận tên loại phí bằng giọng nói.')
      return
    }

    const normalizedAmount = Number(transactionAmount)

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền VNĐ hợp lệ.')
      return
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      const savedPhoto = await saveImage(capturedPhotoDraft.blob)
      const transactionId = await createTransaction({
        amount: normalizedAmount,
        category: transactionTitle,
        note: transactionNote,
        title: transactionTitle,
        type: selectedTransactionType,
      })

      await logCategoryVoiceInput({
        confidence: voiceConfidence,
        status: 'confirmed',
        transcript: transactionTitle,
        transactionId,
      })

      await attachPhotoToTransaction(savedPhoto.id, transactionId)
      await onTransactionCreated()
      clearCapturedPhotoDraft()
      setTransactionDraftMessage('Đã lưu giao dịch kèm ảnh vào lịch sử.')
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu giao dịch kèm ảnh.',
      )
    } finally {
      setIsSaving(false)
    }
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
          <p className="camera-capture__eyebrow">Phase 6</p>
          <h2 id="camera-capture-title">Chụp ảnh và nhập tên loại phí</h2>
          <p>
            Chụp một ảnh, chọn loại giao dịch, nói tên loại phí bằng tiếng Việt
            rồi xác nhận để nhập thông tin tiếp theo.
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
            disabled={!isCameraActive || isSaving}
            onClick={() => {
              void handleCaptureImage()
            }}
            type="button"
          >
            {isSaving ? 'Đang xử lý...' : 'Chụp ảnh'}
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

      {transactionDraftMessage ? (
        <p className="camera-capture__success">{transactionDraftMessage}</p>
      ) : null}

      <div className="camera-capture__content">
        <div className="camera-capture__preview">
          <video
            aria-label="Camera preview"
            autoPlay
            className={isCameraMirrored ? 'camera-capture__video--mirrored' : ''}
            muted
            playsInline
            ref={videoRef}
          />
          {capturedPhotoDraft ? (
            <div className="camera-capture__captured-preview">
              <img alt="Ảnh hóa đơn vừa chụp" src={capturedPhotoDraft.url} />
              <div className="camera-capture__photo-overlay">
                <strong>{formatCapturedAt(capturedPhotoDraft.capturedAt)}</strong>
                <span>
                  {selectedTransactionType
                    ? transactionTypeLabels[selectedTransactionType]
                    : 'Chưa chọn loại giao dịch'}
                </span>
                <span>
                  {voiceTranscript.trim() ||
                    transactionTitle.trim() ||
                    'Chưa nhập tên loại phí'}
                  {transactionAmount
                    ? ` | ${formatVnd(Number(transactionAmount) || 0)}`
                    : ''}
                </span>
              </div>
            </div>
          ) : null}
          {!isCameraActive && !capturedPhotoDraft ? (
            <div className="camera-capture__placeholder">
              Camera preview sẽ hiển thị ở đây.
            </div>
          ) : null}
        </div>

        <div className="camera-capture__result">
          {capturedPhotoDraft ? (
            <div className="camera-capture__transaction-step">
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
                <div className="camera-capture__voice-step">
                  <h3>Tên loại phí bằng giọng nói</h3>
                  <p>
                    Nói tên loại phí bằng tiếng Việt, ví dụ: ăn uống.
                  </p>

                  <label className="camera-capture__field">
                    <span>Kết quả nhận diện</span>
                    <input
                      autoComplete="off"
                      placeholder="Bấm micro để nhận diện"
                      value={voiceTranscript}
                      onChange={(event) => {
                        const nextTranscript = event.target.value

                        voiceTranscriptRef.current = nextTranscript
                        setVoiceTranscript(nextTranscript)
                        setIsCategoryConfirmed(false)
                      }}
                    />
                  </label>

                  {isListeningCategory ? (
                    <p className="camera-capture__listening">
                      Đang nghe, chữ sẽ hiện trong lúc bạn nói...
                    </p>
                  ) : null}

                  {voiceConfidence !== null ? (
                    <p>
                      Độ tin cậy khoảng {Math.round(voiceConfidence * 100)}%.
                    </p>
                  ) : null}

                  <div className="camera-capture__voice-actions">
                    <button
                      disabled={
                        isListeningCategory ||
                        !isVietnameseSpeechRecognitionSupported()
                      }
                      onClick={() => {
                        void handleListenCategoryName()
                      }}
                      type="button"
                    >
                      {voiceTranscript ? 'Thử lại' : 'Bấm micro'}
                    </button>
                    <button
                      disabled={!voiceTranscript.trim() || isListeningCategory}
                      onClick={handleConfirmCategoryName}
                      type="button"
                    >
                      Xác nhận
                    </button>
                  </div>

                  {!isVietnameseSpeechRecognitionSupported() ? (
                    <p className="camera-capture__hint">
                      Trình duyệt hiện tại chưa hỗ trợ nhận diện giọng nói.
                    </p>
                  ) : null}

                  {isCategoryConfirmed ? (
                    <p className="camera-capture__success">
                      Đã xác nhận: {transactionTitle}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {selectedTransactionType && isCategoryConfirmed ? (
                <div className="camera-capture__info-step">
                  <h3>Nhập thông tin</h3>
                  <p>
                    Đang nhập giao dịch{' '}
                    {transactionTypeLabels[selectedTransactionType].toLowerCase()}
                    .
                  </p>

                  <label className="camera-capture__field">
                    <span>Số tiền VNĐ</span>
                    <input
                      inputMode="numeric"
                      min="0"
                      placeholder="Ví dụ: 150000"
                      step="1000"
                      type="number"
                      value={transactionAmount}
                      onChange={(event) =>
                        setTransactionAmount(event.target.value)
                      }
                    />
                  </label>

                  <label className="camera-capture__field">
                    <span>Ghi chú</span>
                    <textarea
                      placeholder="Ghi chú ngắn cho giao dịch này"
                      rows={3}
                      value={transactionNote}
                      onChange={(event) => setTransactionNote(event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              <div className="camera-capture__draft-actions">
                <button
                  disabled={
                    !selectedTransactionType || !isCategoryConfirmed || isSaving
                  }
                  onClick={() => {
                    void handleSaveTransactionDraft()
                  }}
                  type="button"
                >
                  {isSaving ? 'Đang lưu...' : 'Lưu thông tin'}
                </button>
                <button onClick={clearCapturedPhotoDraft} type="button">
                  Quay lại chụp tiếp
                </button>
              </div>
            </div>
          ) : (
            <div className="camera-capture__empty-result">
              <h3>Ảnh vừa chụp</h3>
              <p>Chưa có ảnh mới. Bấm Chụp ảnh để bắt đầu nhập giao dịch.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
