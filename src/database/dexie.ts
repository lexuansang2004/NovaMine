import Dexie, { type Table } from 'dexie'
import type {
  AppSetting,
  PhotoBlobRecord,
  PhotoMetadata,
  Transaction,
} from './models'

class NovaMineDatabase extends Dexie {
  app_settings!: Table<AppSetting, string>
  photo_blobs!: Table<PhotoBlobRecord, string>
  photos!: Table<PhotoMetadata, string>
  transactions!: Table<Transaction, number>

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
  }
}

export const db = new NovaMineDatabase()
