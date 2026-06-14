import { useEffect, useRef, useState } from 'react'
import {
  captureImageFromVideo,
  startCamera,
  stopCamera,
} from '../../services/cameraService'
import './CameraCapture.css'

export function CameraCapture() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isCameraActive, setIsCameraActive] = useState(false)
  const [isStartingCamera, setIsStartingCamera] = useState(false)

  useEffect(() => {
    return () => {
      stopCamera(streamRef.current)
    }
  }, [])

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

  function handleCaptureImage() {
    if (!videoRef.current) {
      setErrorMessage('Camera chưa sẵn sàng để chụp ảnh.')
      return
    }

    try {
      const imageDataUrl = captureImageFromVideo(videoRef.current)
      setCapturedImage(imageDataUrl)
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Không thể chụp ảnh.',
      )
    }
  }

  return (
    <section className="camera-capture" aria-labelledby="camera-capture-title">
      <div className="camera-capture__header">
        <div>
          <p className="camera-capture__eyebrow">Phase 3</p>
          <h2 id="camera-capture-title">Chụp ảnh hóa đơn</h2>
          <p>
            Bật camera, xem preview và chụp thử ảnh. Ảnh chụp chỉ hiển thị tạm
            trên màn hình, chưa lưu vào cơ sở dữ liệu.
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
            disabled={!isCameraActive}
            onClick={handleCaptureImage}
            type="button"
          >
            Chụp ảnh
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
          <h3>Ảnh vừa chụp</h3>
          {capturedImage ? (
            <img alt="Ảnh hóa đơn vừa chụp" src={capturedImage} />
          ) : (
            <p>Chưa có ảnh nào được chụp.</p>
          )}
        </div>
      </div>
    </section>
  )
}
