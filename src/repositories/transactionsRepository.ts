import { db } from '../database/dexie'
import type { CreateTransactionInput, Transaction } from '../database/models'

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<number> {
  const now = new Date().toISOString()

  return db.transactions.add({
    title: input.title.trim(),
    amount: input.amount,
    type: input.type,
    category: input.category.trim(),
    status: 'confirmed',
    occurredAt: input.occurredAt ?? now,
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
