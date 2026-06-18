import { db } from '../database/dexie'
import type { PhotoMetadata } from '../database/models'

type StorageEstimateLike = {
  quota?: number
  usage?: number
}

export type StorageQuotaSummary = {
  isSupported: boolean
  quotaBytes: number
  usageBytes: number
  usageRatio: number
  usagePercent: number
  shouldWarn: boolean
}

export type OrphanPhotoCleanupResult = {
  deletedCount: number
  failedCount: number
  freedBytes: number
}

const IMAGE_DIRECTORY_NAME = 'novamine-images'
const STORAGE_WARNING_THRESHOLD = 0.8

function supportsStorageEstimate() {
  return typeof navigator !== 'undefined' && Boolean(navigator.storage?.estimate)
}

function supportsOpfs() {
  return typeof navigator !== 'undefined' && Boolean(navigator.storage?.getDirectory)
}

async function deleteOpfsPhoto(photo: PhotoMetadata) {
  if (!supportsOpfs()) {
    return
  }

  try {
    const root = await navigator.storage.getDirectory()
    const directory = await root.getDirectoryHandle(IMAGE_DIRECTORY_NAME)
    await directory.removeEntry(photo.storageKey)
  } catch {
    // Missing OPFS files are already clean from the user's point of view.
  }
}

async function deleteIndexedDbPhoto(photo: PhotoMetadata) {
  await db.photo_blobs.delete(photo.storageKey)
}

async function deletePhotoStorage(photo: PhotoMetadata) {
  if (photo.storageType === 'opfs') {
    await deleteOpfsPhoto(photo)
    return
  }

  await deleteIndexedDbPhoto(photo)
}

function buildSummary(estimate: StorageEstimateLike, isSupported: boolean) {
  const quotaBytes = estimate.quota ?? 0
  const usageBytes = estimate.usage ?? 0
  const usageRatio = quotaBytes > 0 ? usageBytes / quotaBytes : 0

  return {
    isSupported,
    quotaBytes,
    shouldWarn: usageRatio >= STORAGE_WARNING_THRESHOLD,
    usageBytes,
    usagePercent: Math.round(usageRatio * 100),
    usageRatio,
  } satisfies StorageQuotaSummary
}

export function formatStorageBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B'
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = bytes
  let unitIndex = 0

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024
    unitIndex += 1
  }

  return `${value.toFixed(value >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

export async function getStorageQuotaSummary(): Promise<StorageQuotaSummary> {
  if (!supportsStorageEstimate()) {
    return buildSummary({}, false)
  }

  const estimate = await navigator.storage.estimate()

  return buildSummary(estimate, true)
}

export async function cleanupOrphanPhotos(): Promise<OrphanPhotoCleanupResult> {
  const [photos, transactions] = await Promise.all([
    db.photos.toArray(),
    db.transactions.toArray(),
  ])
  const usedTransactionIds = new Set(
    transactions
      .map((transaction) => transaction.id)
      .filter((id): id is number => Boolean(id)),
  )
  const usedPhotoIds = new Set(
    transactions
      .map((transaction) => transaction.photoId)
      .filter((photoId): photoId is string => Boolean(photoId)),
  )
  const orphanPhotos = photos.filter((photo) => {
    const isReferencedByTransactionPhotoId = usedPhotoIds.has(photo.id)
    const isAttachedToExistingTransaction = photo.transactionId
      ? usedTransactionIds.has(photo.transactionId)
      : false

    return !isReferencedByTransactionPhotoId && !isAttachedToExistingTransaction
  })

  let deletedCount = 0
  let failedCount = 0
  let freedBytes = 0

  for (const photo of orphanPhotos) {
    try {
      await deletePhotoStorage(photo)
      await db.photos.delete(photo.id)
      deletedCount += 1
      freedBytes += photo.sizeBytes
    } catch {
      failedCount += 1
    }
  }

  return {
    deletedCount,
    failedCount,
    freedBytes,
  }
}
