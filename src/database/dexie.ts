import Dexie, { type Table } from 'dexie'
import type { Transaction } from './models'

class NovaMineDatabase extends Dexie {
  transactions!: Table<Transaction, number>

  constructor() {
    super('novamine_local_first_db')

    this.version(1).stores({
      transactions: '++id, status, type, category, occurredAt, createdAt, deletedAt',
    })
  }
}

export const db = new NovaMineDatabase()
