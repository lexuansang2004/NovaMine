import { db } from '../database/dexie'
import type { PhotoMetadata } from '../database/models'

const IMAGE_DIRECTORY_NAME = 'novamine-images'
const MAX_IMAGE_WIDTH = 1280
const WEBP_QUALITY = 0.82
const JPEG_QUALITY = 0.86

type OptimizedImage = {
  blob: Blob
  height: number
  mimeType: string
  width: number
}

type DecodedImage = {
  close?: () => void
  height: number
  source: CanvasImageSource
  width: number
}

function createPhotoId() {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`
}

function getFileExtension(mimeType: string) {
  return mimeType === 'image/webp' ? 'webp' : 'jpg'
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality)
  })
}

function supportsOpfs() {
  return Boolean(navigator.storage?.getDirectory)
}

async function decodeImage(blob: Blob): Promise<DecodedImage> {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(blob)

    return {
      close: () => bitmap.close(),
      height: bitmap.height,
      source: bitmap,
      width: bitmap.width,
    }
  }

  const objectUrl = URL.createObjectURL(blob)

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const element = new Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Không thể đọc ảnh đã chụp.'))
      element.src = objectUrl
    })

    return {
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function resizeAndCompressImage(sourceBlob: Blob): Promise<OptimizedImage> {
  const image = await decodeImage(sourceBlob)

  try {
    const width = Math.min(image.width, MAX_IMAGE_WIDTH)
    const height = Math.round(image.height * (width / image.width))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error('Không thể tạo canvas để nén ảnh.')
    }

    context.drawImage(image.source, 0, 0, width, height)

    const webpBlob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY)

    if (webpBlob?.type === 'image/webp') {
      return {
        blob: webpBlob,
        height,
        mimeType: 'image/webp',
        width,
      }
    }

    const jpegBlob = await canvasToBlob(canvas, 'image/jpeg', JPEG_QUALITY)

    if (!jpegBlob) {
      throw new Error('Không thể nén ảnh.')
    }

    return {
      blob: jpegBlob,
      height,
      mimeType: 'image/jpeg',
      width,
    }
  } finally {
    image.close?.()
  }
}

async function saveBlobToOpfs(fileName: string, blob: Blob) {
  const root = await navigator.storage.getDirectory()
  const directory = await root.getDirectoryHandle(IMAGE_DIRECTORY_NAME, {
    create: true,
  })
  const fileHandle = await directory.getFileHandle(fileName, { create: true })

  if (typeof fileHandle.createWritable !== 'function') {
    throw new Error('OPFS writable streams are not supported.')
  }

  const writable = await fileHandle.createWritable()

  await writable.write(blob)
  await writable.close()
}

async function removeBlobFromOpfs(fileName: string) {
  try {
    const root = await navigator.storage.getDirectory()
    const directory = await root.getDirectoryHandle(IMAGE_DIRECTORY_NAME)
    await directory.removeEntry(fileName)
  } catch {
    // A failed OPFS write may not have created a file to remove.
  }
}

async function trySaveBlobToOpfs(fileName: string, blob: Blob) {
  if (!supportsOpfs()) {
    return false
  }

  try {
    await saveBlobToOpfs(fileName, blob)
    return true
  } catch {
    await removeBlobFromOpfs(fileName)
    return false
  }
}

async function saveBlobToIndexedDb(id: string, blob: Blob, createdAt: string) {
  await db.photo_blobs.put({
    id,
    blob,
    createdAt,
  })
}

async function readBlobFromOpfs(fileName: string) {
  const root = await navigator.storage.getDirectory()
  const directory = await root.getDirectoryHandle(IMAGE_DIRECTORY_NAME)
  const fileHandle = await directory.getFileHandle(fileName)
  const file = await fileHandle.getFile()

  return file
}

export async function saveImage(sourceBlob: Blob): Promise<PhotoMetadata> {
  const optimizedImage = await resizeAndCompressImage(sourceBlob)
  const id = createPhotoId()
  const createdAt = new Date().toISOString()
  const fileName = `${id}.${getFileExtension(optimizedImage.mimeType)}`

  let metadata: PhotoMetadata

  const storedInOpfs = await trySaveBlobToOpfs(fileName, optimizedImage.blob)

  if (storedInOpfs) {

    metadata = {
      id,
      createdAt,
      fileName,
      height: optimizedImage.height,
      mimeType: optimizedImage.mimeType,
      sizeBytes: optimizedImage.blob.size,
      storageKey: fileName,
      storageType: 'opfs',
      transactionId: null,
      width: optimizedImage.width,
    }
  } else {
    await saveBlobToIndexedDb(id, optimizedImage.blob, createdAt)

    metadata = {
      id,
      createdAt,
      fileName,
      height: optimizedImage.height,
      mimeType: optimizedImage.mimeType,
      sizeBytes: optimizedImage.blob.size,
      storageKey: id,
      storageType: 'indexeddb',
      transactionId: null,
      width: optimizedImage.width,
    }
  }

  await db.photos.put(metadata)

  return metadata
}

export async function attachPhotoToTransaction(
  photoId: string,
  transactionId: number,
): Promise<void> {
  await db.photos.update(photoId, {
    transactionId,
  })
}

export async function getPhotosByTransactionIds(
  transactionIds: number[],
): Promise<PhotoMetadata[]> {
  if (transactionIds.length === 0) {
    return []
  }

  return db.photos.where('transactionId').anyOf(transactionIds).toArray()
}

export async function getPhotoBlob(photo: PhotoMetadata): Promise<Blob> {
  if (photo.storageType === 'opfs') {
    return readBlobFromOpfs(photo.storageKey)
  }

  const storedBlob = await db.photo_blobs.get(photo.storageKey)

  if (!storedBlob) {
    throw new Error('Không tìm thấy dữ liệu ảnh trong IndexedDB fallback.')
  }

  return storedBlob.blob
}
