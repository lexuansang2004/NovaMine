import { db } from '../database/dexie'

function getCurrentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Trình duyệt này chưa hỗ trợ định vị.'))
      return
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 8000,
    })
  })
}

export async function captureCurrentLocation(): Promise<number | null> {
  try {
    const position = await getCurrentPosition()

    return db.locations.add({
      accuracy: position.coords.accuracy ?? null,
      capturedAt: new Date().toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    })
  } catch {
    return null
  }
}
