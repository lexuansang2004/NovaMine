import { db } from '../database/dexie'
import type { CreateTransactionInput, Transaction } from '../database/models'

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function toHourKey(date: Date) {
  return `${toDateKey(date)}-${String(date.getHours()).padStart(2, '0')}`
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<number> {
  const now = new Date().toISOString()
  const occurredAt = input.occurredAt ?? now
  const occurredDate = new Date(occurredAt)
  const normalizedAmount = input.amountVnd ?? input.amount
  const normalizedCategory =
    input.categoryName?.trim() || input.category?.trim() || input.title.trim()

  return db.transactions.add({
    title: input.title.trim(),
    amount: normalizedAmount,
    amountVnd: normalizedAmount,
    type: input.type,
    category: normalizedCategory,
    categoryName: normalizedCategory,
    dateKey: toDateKey(occurredDate),
    hourKey: toHourKey(occurredDate),
    locationId: input.locationId ?? null,
    note: input.note?.trim(),
    photoId: input.photoId ?? null,
    status: 'confirmed',
    occurredAt,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
  })
}

export async function getConfirmedTransactions(): Promise<Transaction[]> {
  const transactions = await db.transactions
    .where('status')
    .equals('confirmed')
    .and((transaction) => !transaction.deletedAt)
    .toArray()

  return transactions.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  )
}

export async function softDeleteTransaction(id: number): Promise<void> {
  const now = new Date().toISOString()

  await db.transactions.update(id, {
    deletedAt: now,
    updatedAt: now,
  })
}
