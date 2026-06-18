import { useEffect, useRef, useState } from 'react'
import type { LocationRecord, TransactionType } from '../../database/models'
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
  formatLocationAddress,
  getCurrentLocationDraft,
  saveLocationDraft,
} from '../../services/locationService'
import {
  isVietnameseSpeechRecognitionSupported,
  listenVietnameseSpeech,
  listenVietnameseCategoryName,
  logAmountVoiceInput,
  logCategoryVoiceInput,
} from '../../services/speechService'
import { formatVnd } from '../../utils/currency'
import { formatVndCurrency, parseVndInput } from '../../utils/money'
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

type LocationDraft = Omit<LocationRecord, 'id'>

type CameraCaptureProps = {
  onTransactionCreated: () => Promise<void>
}

type SmartStepStatus = 'active' | 'confirmed' | 'locked'

function getSmartStepClassName(status: SmartStepStatus) {
  return `camera-capture__smart-card camera-capture__smart-card--${status}`
}

function getSmartStepStatusLabel(status: SmartStepStatus) {
  if (status === 'confirmed') {
    return 'Đã xác nhận'
  }

  if (status === 'locked') {
    return 'Chưa tới lượt'
  }

  return 'Đang nhập'
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
  const [amountParseError, setAmountParseError] = useState('')
  const [amountVoiceConfidence, setAmountVoiceConfidence] = useState<
    number | null
  >(null)
  const [amountVoiceTranscript, setAmountVoiceTranscript] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isCameraFullscreenOpen, setIsCameraFullscreenOpen] = useState(false)
  const [isAmountConfirmed, setIsAmountConfirmed] = useState(false)
  const [isCameraMirrored, setIsCameraMirrored] = useState(false)
  const [isCategoryConfirmed, setIsCategoryConfirmed] = useState(false)
  const [isListeningAmount, setIsListeningAmount] = useState(false)
  const [isListeningCategory, setIsListeningCategory] = useState(false)
  const [isResolvingLocation, setIsResolvingLocation] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)
  const [locationDraft, setLocationDraft] = useState<LocationDraft | null>(null)
  const [locationPreviewMessage, setLocationPreviewMessage] = useState('')
  const [transactionAmount, setTransactionAmount] = useState('')
  const [transactionDraftMessage, setTransactionDraftMessage] = useState('')
  const [transactionNote, setTransactionNote] = useState('')
  const [transactionTitle, setTransactionTitle] = useState('')
  const [voiceConfidence, setVoiceConfidence] = useState<number | null>(null)
  const [voiceTranscript, setVoiceTranscript] = useState('')
  const amountVoiceTranscriptRef = useRef('')
  const voiceTranscriptRef = useRef('')

  function revokeCapturedPhotoUrl() {
    if (capturedPhotoUrlRef.current) {
      URL.revokeObjectURL(capturedPhotoUrlRef.current)
      capturedPhotoUrlRef.current = null
    }
  }

  function resetTransactionDraft() {
    setSelectedTransactionType(null)
    setAmountParseError('')
    setAmountVoiceConfidence(null)
    setAmountVoiceTranscript('')
    setIsAmountConfirmed(false)
    setIsCategoryConfirmed(false)
    setIsResolvingLocation(false)
    setLocationDraft(null)
    setLocationPreviewMessage('')
    setTransactionAmount('')
    setTransactionNote('')
    setTransactionTitle('')
    setVoiceConfidence(null)
    setVoiceTranscript('')
    amountVoiceTranscriptRef.current = ''
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

  useEffect(() => {
    if (!isCameraFullscreenOpen) {
      return
    }

    const previousOverflow = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isCameraFullscreenOpen])

  useEffect(() => {
    if (!isCameraFullscreenOpen || !isCameraActive || !videoRef.current) {
      return
    }

    videoRef.current.srcObject = streamRef.current
    void videoRef.current.play()
  }, [isCameraActive, isCameraFullscreenOpen])

  useEffect(() => {
    if (!isCameraFullscreenOpen) {
      return
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        handleStopCamera()
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isCameraFullscreenOpen])

  async function handleStartCamera() {
    setErrorMessage('')
    setIsStartingCamera(true)
    setIsCameraFullscreenOpen(true)

    try {
      stopCamera(streamRef.current)

      const stream = await startCamera()
      streamRef.current = stream
      setIsCameraMirrored(shouldMirrorCamera(stream))
      setIsCameraActive(true)
    } catch (error) {
      stopCamera(streamRef.current)
      streamRef.current = null
      setIsCameraMirrored(false)
      setIsCameraActive(false)
      setIsCameraFullscreenOpen(false)
      const cameraErrorName = error instanceof DOMException ? error.name : ''
      const friendlyCameraMessage =
        cameraErrorName === 'NotFoundError'
          ? 'Không tìm thấy camera trên thiết bị này.'
          : cameraErrorName === 'NotAllowedError'
            ? 'Bạn đã từ chối quyền camera. Hãy cấp quyền camera để chụp ảnh giao dịch.'
            : null

      setErrorMessage(
        friendlyCameraMessage ??
          (error instanceof Error
          ? error.message
          : 'Không thể bật camera. Vui lòng kiểm tra quyền truy cập camera.'),
      )
    } finally {
      setIsStartingCamera(false)
    }
  }

  function handleStopCamera() {
    stopCamera(streamRef.current)
    streamRef.current = null
    setIsCameraMirrored(false)
    setIsCameraFullscreenOpen(false)

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
      handleStopCamera()
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
    setAmountParseError('')
    setAmountVoiceConfidence(null)
    setAmountVoiceTranscript('')
    setIsAmountConfirmed(false)
    setLocationDraft(null)
    setLocationPreviewMessage('')
    setTransactionAmount('')
    setTransactionDraftMessage('')
    setTransactionNote('')
    setTransactionTitle('')
    setVoiceConfidence(null)
    setVoiceTranscript('')
    amountVoiceTranscriptRef.current = ''
    voiceTranscriptRef.current = ''
    setErrorMessage('')
  }

  function updateAmountDraftFromTranscript(transcript: string) {
    amountVoiceTranscriptRef.current = transcript
    setAmountVoiceTranscript(transcript)
    setIsAmountConfirmed(false)

    const parsedAmount = parseVndInput(transcript)

    if (parsedAmount) {
      setAmountParseError('')
      setTransactionAmount(String(parsedAmount))
      return parsedAmount
    }

    setTransactionAmount('')
    setAmountParseError('Chưa đọc được số tiền hợp lệ. Bạn có thể sửa tay.')

    return null
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
    setAmountParseError('')
    setAmountVoiceConfidence(null)
    setAmountVoiceTranscript('')
    setIsAmountConfirmed(false)
    setTransactionAmount('')
    amountVoiceTranscriptRef.current = ''
    setErrorMessage('')
  }

  async function handleListenAmount() {
    setErrorMessage('')
    setAmountParseError('')
    setIsAmountConfirmed(false)
    setIsListeningAmount(true)
    setAmountVoiceConfidence(null)
    setAmountVoiceTranscript('')
    setTransactionAmount('')
    amountVoiceTranscriptRef.current = ''

    try {
      const result = await listenVietnameseSpeech({
        onTranscript: (update) => {
          updateAmountDraftFromTranscript(update.transcript)

          if (update.confidence !== null) {
            setAmountVoiceConfidence(update.confidence)
          }
        },
      })

      amountVoiceTranscriptRef.current = result.transcript
      setAmountVoiceConfidence(result.confidence)
      updateAmountDraftFromTranscript(result.transcript)
      await logAmountVoiceInput({
        confidence: result.confidence,
        status: 'recognized',
        transcript: result.transcript,
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Không thể nhận diện số tiền.'

      setErrorMessage(message)
      await logAmountVoiceInput({
        errorMessage: message,
        status: 'failed',
        transcript: amountVoiceTranscriptRef.current,
      })
    } finally {
      setIsListeningAmount(false)
    }
  }

  function handleConfirmAmount() {
    const parsedAmount = parseVndInput(amountVoiceTranscript)

    if (!parsedAmount) {
      setAmountParseError('Số tiền chưa hợp lệ. Vui lòng nói lại hoặc sửa tay.')
      setErrorMessage('Không thể xác nhận số tiền chưa hợp lệ.')
      return
    }

    setTransactionAmount(String(parsedAmount))
    setAmountParseError('')
    setIsAmountConfirmed(true)
    setErrorMessage('')
    void resolveLocationPreview()
  }

  async function resolveLocationPreview() {
    setIsResolvingLocation(true)
    setLocationPreviewMessage('Đang lấy vị trí hiện tại...')

    try {
      const nextLocationDraft = await getCurrentLocationDraft()
      setLocationDraft(nextLocationDraft)
      setLocationPreviewMessage(
        nextLocationDraft
          ? formatLocationAddress(nextLocationDraft)
          : 'Không lấy được vị trí hoặc bạn đã từ chối quyền định vị.',
      )
    } finally {
      setIsResolvingLocation(false)
    }
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

    if (
      !isAmountConfirmed ||
      !Number.isFinite(normalizedAmount) ||
      normalizedAmount <= 0
    ) {
      setErrorMessage('Vui lòng xác nhận số tiền VNĐ hợp lệ.')
      return
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      const [locationId, savedPhoto] = await Promise.all([
        saveLocationDraft(locationDraft),
        saveImage(capturedPhotoDraft.blob),
      ])
      const transactionId = await createTransaction({
        amount: normalizedAmount,
        amountVnd: normalizedAmount,
        category: transactionTitle,
        categoryName: transactionTitle,
        locationId,
        note: transactionNote,
        photoId: savedPhoto.id,
        title: transactionTitle,
        type: selectedTransactionType,
      })

      await logCategoryVoiceInput({
        confidence: voiceConfidence,
        status: 'confirmed',
        transcript: transactionTitle,
        transactionId,
      })

      await logAmountVoiceInput({
        confidence: amountVoiceConfidence,
        status: 'confirmed',
        transcript: amountVoiceTranscript || transactionAmount,
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
  const typeStepStatus: SmartStepStatus = selectedTransactionType
    ? 'confirmed'
    : 'active'
  const categoryStepStatus: SmartStepStatus = !selectedTransactionType
    ? 'locked'
    : isCategoryConfirmed
      ? 'confirmed'
      : 'active'
  const amountStepStatus: SmartStepStatus = !isCategoryConfirmed
    ? 'locked'
    : isAmountConfirmed
      ? 'confirmed'
      : 'active'
  const locationStepStatus: SmartStepStatus = !isAmountConfirmed
    ? 'locked'
    : locationDraft
      ? 'confirmed'
      : 'active'
  const noteStepStatus: SmartStepStatus = !isAmountConfirmed
    ? 'locked'
    : 'active'
  const selectedTransactionTypeLabel = selectedTransactionType
    ? transactionTypeLabels[selectedTransactionType]
    : 'Chưa chọn'
  const confirmedAmountLabel = transactionAmount
    ? formatVndCurrency(Number(transactionAmount))
    : 'Chưa có số tiền'

  return (
    <section
      className={cameraCaptureClassName}
      aria-labelledby="camera-capture-title"
    >
      <div className="camera-capture__header">
        <div>
          <h2 id="camera-capture-title">Chụp ảnh và lưu giao dịch hoàn chỉnh</h2>
          <p>
            Chụp một ảnh, chọn loại giao dịch, nói tên loại phí bằng tiếng Việt
            và số tiền VNĐ, lấy vị trí nếu được phép rồi lưu vào lịch sử.
          </p>
        </div>
      </div>

      {errorMessage ? (
        <p className="camera-capture__error">{errorMessage}</p>
      ) : null}

      {transactionDraftMessage ? (
        <p className="camera-capture__success">{transactionDraftMessage}</p>
      ) : null}

      <div className="camera-capture__actions" aria-label="Điều khiển camera">
        <button
          disabled={isStartingCamera}
          onClick={() => {
            void handleStartCamera()
          }}
          type="button"
        >
          {isStartingCamera ? 'Đang mở camera...' : 'Mở camera toàn màn hình'}
        </button>
      </div>

      <div className="camera-capture__content">
        <div className="camera-capture__preview">
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
                <span>
                  {locationPreviewMessage || 'Chưa lấy địa chỉ hiện tại'}
                </span>
              </div>
            </div>
          ) : null}
          {!capturedPhotoDraft ? (
            <div className="camera-capture__placeholder">
              Ảnh sau khi chụp sẽ hiển thị ở đây.
            </div>
          ) : null}
        </div>

        <div className="camera-capture__result">
          {capturedPhotoDraft ? (
            <div className="camera-capture__transaction-step">
              <div
                aria-current={typeStepStatus === 'active' ? 'step' : undefined}
                className={getSmartStepClassName(typeStepStatus)}
              >
                <div className="camera-capture__smart-card-header">
                  <span className="camera-capture__step-number">1</span>
                  <div className="camera-capture__smart-card-title">
                    <h3>Chọn loại giao dịch</h3>
                    <p>
                      {selectedTransactionType
                        ? selectedTransactionTypeLabel
                        : 'Thu nhập hoặc chi tiêu'}
                    </p>
                  </div>
                  <span className="camera-capture__step-status">
                    {getSmartStepStatusLabel(typeStepStatus)}
                  </span>
                </div>
                {typeStepStatus === 'active' ? (
                  <div className="camera-capture__smart-card-body">
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
                ) : null}
              </div>

              <div
                aria-current={categoryStepStatus === 'active' ? 'step' : undefined}
                aria-disabled={categoryStepStatus === 'locked'}
                className={getSmartStepClassName(categoryStepStatus)}
              >
                <div className="camera-capture__smart-card-header">
                  <span className="camera-capture__step-number">2</span>
                  <div className="camera-capture__smart-card-title">
                    <h3>Tên loại phí bằng giọng nói</h3>
                    <p>
                      {isCategoryConfirmed
                        ? transactionTitle
                        : categoryStepStatus === 'locked'
                          ? 'Chọn loại giao dịch để mở bước này'
                          : 'Nói tên loại phí bằng tiếng Việt'}
                    </p>
                  </div>
                  <span className="camera-capture__step-status">
                    {getSmartStepStatusLabel(categoryStepStatus)}
                  </span>
                </div>
                {categoryStepStatus === 'active' ? (
                  <div className="camera-capture__smart-card-body">
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
                  </div>
                ) : null}
              </div>

              <div
                aria-current={amountStepStatus === 'active' ? 'step' : undefined}
                aria-disabled={amountStepStatus === 'locked'}
                className={getSmartStepClassName(amountStepStatus)}
              >
                <div className="camera-capture__smart-card-header">
                  <span className="camera-capture__step-number">3</span>
                  <div className="camera-capture__smart-card-title">
                    <h3>Số tiền VNĐ bằng giọng nói</h3>
                    <p>
                      {isAmountConfirmed
                        ? confirmedAmountLabel
                        : amountStepStatus === 'locked'
                          ? 'Xác nhận tên loại phí để mở bước này'
                          : 'Nói số tiền, ví dụ: 20k hoặc 20 nghìn'}
                    </p>
                  </div>
                  <span className="camera-capture__step-status">
                    {getSmartStepStatusLabel(amountStepStatus)}
                  </span>
                </div>
                {amountStepStatus === 'active' ? (
                  <div className="camera-capture__smart-card-body">
                    <label className="camera-capture__field">
                      <span>Kết quả số tiền</span>
                      <input
                        autoComplete="off"
                        inputMode="text"
                        placeholder="Ví dụ: 20k, 20 nghìn, 20.000"
                        value={amountVoiceTranscript}
                        onChange={(event) => {
                          updateAmountDraftFromTranscript(event.target.value)
                        }}
                      />
                    </label>

                    {isListeningAmount ? (
                      <p className="camera-capture__listening">
                        Đang nghe số tiền, chữ sẽ hiện trong lúc bạn nói...
                      </p>
                    ) : null}

                    {transactionAmount ? (
                      <p className="camera-capture__parsed-money">
                        Sẽ lưu: {formatVndCurrency(Number(transactionAmount))}
                      </p>
                    ) : null}

                    {amountParseError ? (
                      <p className="camera-capture__hint">{amountParseError}</p>
                    ) : null}

                    {amountVoiceConfidence !== null ? (
                      <p>
                        Độ tin cậy khoảng{' '}
                        {Math.round(amountVoiceConfidence * 100)}%.
                      </p>
                    ) : null}

                    <div className="camera-capture__voice-actions">
                      <button
                        disabled={
                          isListeningAmount ||
                          !isVietnameseSpeechRecognitionSupported()
                        }
                        onClick={() => {
                          void handleListenAmount()
                        }}
                        type="button"
                      >
                        {amountVoiceTranscript ? 'Thử lại' : 'Bấm micro'}
                      </button>
                      <button
                        disabled={!transactionAmount || isListeningAmount}
                        onClick={handleConfirmAmount}
                        type="button"
                      >
                        Xác nhận
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div
                aria-current={locationStepStatus === 'active' ? 'step' : undefined}
                aria-disabled={locationStepStatus === 'locked'}
                className={getSmartStepClassName(locationStepStatus)}
              >
                <div className="camera-capture__smart-card-header">
                  <span className="camera-capture__step-number">4</span>
                  <div className="camera-capture__smart-card-title">
                    <h3>Địa chỉ hiện tại</h3>
                    <p>
                      {locationPreviewMessage ||
                        (locationStepStatus === 'locked'
                          ? 'Xác nhận số tiền để mở bước này'
                          : 'Có thể lưu giao dịch không kèm địa chỉ')}
                    </p>
                  </div>
                  <span className="camera-capture__step-status">
                    {getSmartStepStatusLabel(locationStepStatus)}
                  </span>
                </div>
                {locationStepStatus === 'active' ? (
                  <div className="camera-capture__smart-card-body">
                    {locationDraft ? (
                      <small className="camera-capture__attribution">
                        Dữ liệu địa chỉ © OpenStreetMap contributors.
                      </small>
                    ) : null}
                    <button
                      disabled={isResolvingLocation}
                      onClick={() => {
                        void resolveLocationPreview()
                      }}
                      type="button"
                    >
                      {locationDraft ? 'Lấy lại vị trí' : 'Lấy vị trí'}
                    </button>
                  </div>
                ) : null}
              </div>

              <div
                aria-current={noteStepStatus === 'active' ? 'step' : undefined}
                aria-disabled={noteStepStatus === 'locked'}
                className={getSmartStepClassName(noteStepStatus)}
              >
                <div className="camera-capture__smart-card-header">
                  <span className="camera-capture__step-number">5</span>
                  <div className="camera-capture__smart-card-title">
                    <h3>Ghi chú</h3>
                    <p>
                      {noteStepStatus === 'locked'
                        ? 'Xác nhận số tiền để mở bước này'
                        : transactionNote || 'Không bắt buộc'}
                    </p>
                  </div>
                  <span className="camera-capture__step-status">
                    {getSmartStepStatusLabel(noteStepStatus)}
                  </span>
                </div>
                {noteStepStatus === 'active' ? (
                  <div className="camera-capture__smart-card-body">
                    <label className="camera-capture__field">
                      <span>Ghi chú</span>
                      <textarea
                        placeholder="Ghi chú ngắn cho giao dịch này"
                        rows={3}
                        value={transactionNote}
                        onChange={(event) =>
                          setTransactionNote(event.target.value)
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </div>

              {isAmountConfirmed ? (
                <div className="camera-capture__draft-actions">
                  <button
                    disabled={
                      !selectedTransactionType ||
                      !isCategoryConfirmed ||
                      !isAmountConfirmed ||
                      isResolvingLocation ||
                      isSaving
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
              ) : null}
            </div>
          ) : (
            <div className="camera-capture__empty-result">
              <h3>Ảnh vừa chụp</h3>
              <p>
                Chưa có ảnh mới. Bấm Mở camera toàn màn hình để bắt đầu chụp
                giao dịch.
              </p>
            </div>
          )}
        </div>
      </div>

      {isCameraFullscreenOpen ? (
        <div className="camera-capture__fullscreen" role="dialog" aria-modal="true">
          <div className="camera-capture__fullscreen-stage">
            <video
              aria-label="Camera toàn màn hình"
              autoPlay
              className={
                isCameraMirrored ? 'camera-capture__video--mirrored' : ''
              }
              muted
              playsInline
              ref={videoRef}
            />
            {!isCameraActive ? (
              <p className="camera-capture__fullscreen-status">
                Đang khởi động camera...
              </p>
            ) : null}
          </div>
          <div className="camera-capture__fullscreen-controls">
            <button
              disabled={!isCameraActive || isSaving}
              onClick={() => {
                void handleCaptureImage()
              }}
              type="button"
            >
              {isSaving ? 'Đang xử lý...' : 'Chụp ảnh'}
            </button>
            <button onClick={handleStopCamera} type="button">
              Đóng
            </button>
          </div>
        </div>
      ) : null}
    </section>
  )
}
