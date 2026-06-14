export type CameraStartOptions = {
  preferBackCamera?: boolean
}

export async function startCamera({
  preferBackCamera = true,
}: CameraStartOptions = {}): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('Trình duyệt này chưa hỗ trợ camera.')
  }

  const videoConstraints: MediaTrackConstraints = {
    height: { ideal: 720 },
    width: { ideal: 1280 },
  }

  if (preferBackCamera) {
    videoConstraints.facingMode = { ideal: 'environment' }
  }

  return navigator.mediaDevices.getUserMedia({
    audio: false,
    video: videoConstraints,
  })
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

export function captureImageFromVideo(videoElement: HTMLVideoElement): string {
  const { videoHeight, videoWidth } = videoElement

  if (!videoWidth || !videoHeight) {
    throw new Error('Camera chưa sẵn sàng để chụp ảnh.')
  }

  const canvas = document.createElement('canvas')
  canvas.width = videoWidth
  canvas.height = videoHeight

  const context = canvas.getContext('2d')

  if (!context) {
    throw new Error('Không thể tạo canvas để chụp ảnh.')
  }

  context.drawImage(videoElement, 0, 0, videoWidth, videoHeight)

  return canvas.toDataURL('image/jpeg', 0.92)
}
