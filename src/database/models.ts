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

export type AppSetting = {
  key: string
  value: string | number | boolean
  updatedAt: string
}

export type DashboardSummary = {
  initialBalanceVnd: number
  totalIncomeVnd: number
  totalExpenseVnd: number
  currentBalanceVnd: number
  todayTransactionCount: number
  todayIncomeVnd: number
  todayExpenseVnd: number
  hasInitialBalance: boolean
}
