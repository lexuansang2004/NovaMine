import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  PhotoBlobRecord,
  PhotoMetadata,
  Transaction,
  VoiceInput,
} from './models'

class NovaMineDatabase extends Dexie {
  app_settings!: Table<AppSetting, string>
  photo_blobs!: Table<PhotoBlobRecord, string>
  photos!: Table<PhotoMetadata, string>
  transactions!: Table<Transaction, number>
  voice_inputs!: Table<VoiceInput, number>

  constructor() {
    super('novamine_local_first_db')

    this.version(1).stores({
      transactions: '++id, status, type, category, occurredAt, createdAt, deletedAt',
    })

    this.version(2).stores({
      app_settings: 'key',
      transactions: '++id, status, type, category, occurredAt, createdAt, deletedAt',
    })

    this.version(3).stores({
      app_settings: 'key',
      photo_blobs: 'id, createdAt',
      photos: 'id, transactionId, createdAt, storageType',
      transactions: '++id, status, type, category, occurredAt, createdAt, deletedAt',
    })

    this.version(4).stores({
      app_settings: 'key',
      photo_blobs: 'id, createdAt',
      photos: 'id, transactionId, createdAt, storageType',
      transactions: '++id, status, type, category, occurredAt, createdAt, deletedAt',
      voice_inputs: '++id, transactionId, fieldName, language, status, createdAt',
    })
  }
}

export const db = new NovaMineDatabase()
