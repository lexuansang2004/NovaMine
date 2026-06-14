import Dexie, { type Table } from 'dexie'
import type { AppSetting, Transaction } from './models'

class NovaMineDatabase extends Dexie {
  app_settings!: Table<AppSetting, string>
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
  }
}

export const db = new NovaMineDatabase()
