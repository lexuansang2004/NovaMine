import { db } from '../database/dexie'
import type { LocationRecord } from '../database/models'

export type LocationDraft = Omit<LocationRecord, 'id'>

type NominatimReverseResponse = {
  address?: Record<string, string | undefined>
  display_name?: string
  error?: string
}

const NOMINATIM_REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse'
const NOMINATIM_MIN_INTERVAL_MS = 1100
const reverseGeocodeCache = new Map<string, string>()
let lastReverseGeocodeRequestAt = 0

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

function createCoordinateText(
  location: Pick<LocationRecord, 'accuracy' | 'latitude' | 'longitude'>,
) {
  const coordinates = `${formatCoordinate(location.latitude)}, ${formatCoordinate(
    location.longitude,
  )}`
  const accuracy =
    typeof location.accuracy === 'number'
      ? `, sai số khoảng ${Math.round(location.accuracy)}m`
      : ''

  return `Tọa độ: ${coordinates}${accuracy}`
}

function getReverseGeocodeCacheKey(
  location: Pick<LocationRecord, 'latitude' | 'longitude'>,
) {
  return `${location.latitude.toFixed(5)},${location.longitude.toFixed(5)}`
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

function buildReadableAddress(result: NominatimReverseResponse) {
  if (result.display_name?.trim()) {
    return result.display_name.trim()
  }

  const address = result.address

  if (!address) {
    return ''
  }

  const addressParts = [
    address.house_number,
    address.road,
    address.neighbourhood,
    address.suburb,
    address.village,
    address.town,
    address.city,
    address.county,
    address.state,
    address.postcode,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))

  return Array.from(new Set(addressParts)).join(', ')
}

async function reverseGeocodeAddress(
  location: Pick<LocationRecord, 'latitude' | 'longitude'>,
) {
  const cacheKey = getReverseGeocodeCacheKey(location)
  const cachedAddress = reverseGeocodeCache.get(cacheKey)

  if (cachedAddress) {
    return cachedAddress
  }

  const elapsedMs = Date.now() - lastReverseGeocodeRequestAt

  if (elapsedMs < NOMINATIM_MIN_INTERVAL_MS) {
    await wait(NOMINATIM_MIN_INTERVAL_MS - elapsedMs)
  }

  const url = new URL(NOMINATIM_REVERSE_ENDPOINT)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('lat', String(location.latitude))
  url.searchParams.set('lon', String(location.longitude))
  url.searchParams.set('zoom', '18')
  url.searchParams.set('addressdetails', '1')
  url.searchParams.set('accept-language', 'vi,en')

  const abortController = new AbortController()
  const timeoutId = window.setTimeout(() => abortController.abort(), 8000)

  try {
    lastReverseGeocodeRequestAt = Date.now()
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
      signal: abortController.signal,
    })

    if (!response.ok) {
      return ''
    }

    const result = (await response.json()) as NominatimReverseResponse

    if (result.error) {
      return ''
    }

    const addressText = buildReadableAddress(result)

    if (addressText) {
      reverseGeocodeCache.set(cacheKey, addressText)
    }

    return addressText
  } catch {
    return ''
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export function formatLocationAddress(location?: LocationRecord | null) {
  if (!location) {
    return 'Không có địa chỉ'
  }

  return location.addressText || createCoordinateText(location)
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
    const addressText = await reverseGeocodeAddress(locationDraft)

    return {
      ...locationDraft,
      addressText: addressText || createCoordinateText(locationDraft),
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
