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

export type PhotoStorageType = 'opfs' | 'indexeddb'

export type PhotoMetadata = {
  id: string
  transactionId?: number | null
  fileName: string
  mimeType: string
  sizeBytes: number
  width: number
  height: number
  storageKey: string
  storageType: PhotoStorageType
  createdAt: string
}

export type PhotoBlobRecord = {
  id: string
  blob: Blob
  createdAt: string
}

export type VoiceInputStatus = 'confirmed' | 'failed' | 'recognized'

export type VoiceInput = {
  id?: number
  transactionId?: number | null
  fieldName: 'categoryName'
  language: 'vi-VN'
  transcript: string
  confidence?: number | null
  status: VoiceInputStatus
  errorMessage?: string | null
  createdAt: string
}
