import { db } from '../database/dexie'
import type { LocationRecord } from '../database/models'

export type LocationDraft = Omit<LocationRecord, 'id'>

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

function formatCoordinate(value: number) {
  return value.toFixed(5)
}

function createAddressText(
  location: Pick<LocationRecord, 'accuracy' | 'latitude' | 'longitude'>,
) {
  const coordinates = `${formatCoordinate(location.latitude)}, ${formatCoordinate(
    location.longitude,
  )}`
  const accuracy =
    typeof location.accuracy === 'number'
      ? `, sai số khoảng ${Math.round(location.accuracy)}m`
      : ''

  return `Vị trí hiện tại: ${coordinates}${accuracy}`
}

export function formatLocationAddress(location?: LocationRecord | null) {
  if (!location) {
    return 'Không có địa chỉ'
  }

  return location.addressText || createAddressText(location)
}

export async function getCurrentLocationDraft(): Promise<LocationDraft | null> {
  try {
    const position = await getCurrentPosition()
    const locationDraft = {
      accuracy: position.coords.accuracy ?? null,
      capturedAt: new Date().toISOString(),
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    }

    return {
      ...locationDraft,
      addressText: createAddressText(locationDraft),
    }
  } catch {
    return null
  }
}

export async function saveLocationDraft(
  locationDraft: LocationDraft | null,
): Promise<number | null> {
  if (!locationDraft) {
    return null
  }

  return db.locations.add(locationDraft)
}

export async function captureCurrentLocation(): Promise<number | null> {
  const locationDraft = await getCurrentLocationDraft()

  return saveLocationDraft(locationDraft)
}

export async function getLocationsByIds(
  locationIds: number[],
): Promise<LocationRecord[]> {
  const uniqueLocationIds = Array.from(new Set(locationIds))

  if (uniqueLocationIds.length === 0) {
    return []
  }

  return db.locations.where('id').anyOf(uniqueLocationIds).toArray()
}
