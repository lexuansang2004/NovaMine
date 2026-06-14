export type TransactionStatus = 'confirmed'

export type TransactionType = 'expense' | 'income'

export type Transaction = {
  id?: number
  title: string
  amount: number
  type: TransactionType
  category: string
  note?: string
  status: TransactionStatus
  occurredAt: string
  createdAt: string
  updatedAt: string
  deletedAt?: string | null
}

export type CreateTransactionInput = {
  title: string
  amount: number
  type: TransactionType
  category?: string
  note?: string
  occurredAt?: string
}
