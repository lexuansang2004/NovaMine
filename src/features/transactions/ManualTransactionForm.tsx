import { useState, type FormEvent } from 'react'
import type { TransactionType } from '../../database/models'
import { createTransaction } from '../../repositories/transactionsRepository'
import './ManualTransactionForm.css'

const transactionTypeOptions: Array<{
  label: string
  value: TransactionType
}> = [
  { label: 'Chi tiêu', value: 'expense' },
  { label: 'Thu nhập', value: 'income' },
]

type ManualTransactionFormProps = {
  onTransactionCreated: () => Promise<void>
}

export function ManualTransactionForm({
  onTransactionCreated,
}: ManualTransactionFormProps) {
  const [type, setType] = useState<TransactionType>('expense')
  const [feeName, setFeeName] = useState('')
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  async function saveTransaction() {
    const normalizedAmount = Number(amount)

    if (!feeName.trim()) {
      setErrorMessage('Vui lòng nhập tên loại phí.')
      return
    }

    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      setErrorMessage('Vui lòng nhập số tiền VNĐ hợp lệ.')
      return
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      await createTransaction({
        title: feeName,
        category: feeName,
        amount: normalizedAmount,
        type,
        note,
      })
      setFeeName('')
      setAmount('')
      setNote('')
      await onTransactionCreated()
    } finally {
      setIsSaving(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void saveTransaction()
  }

  return (
    <form className="manual-transaction-form" onSubmit={handleSubmit}>
      <div className="manual-transaction-form__header">
        <h2>Nhập giao dịch thủ công</h2>
        <p>Lưu trực tiếp vào IndexedDB trên thiết bị.</p>
      </div>

      <fieldset className="manual-transaction-form__type">
        <legend>Loại giao dịch</legend>
        <div>
          {transactionTypeOptions.map((option) => (
            <button
              aria-pressed={type === option.value}
              key={option.value}
              onClick={() => setType(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <label className="manual-transaction-form__field">
        <span>Tên loại phí</span>
        <input
          autoComplete="off"
          placeholder="Ví dụ: Lương, Ăn uống, Di chuyển"
          value={feeName}
          onChange={(event) => setFeeName(event.target.value)}
        />
      </label>

      <label className="manual-transaction-form__field">
        <span>Số tiền VNĐ</span>
        <input
          inputMode="numeric"
          min="0"
          placeholder="Ví dụ: 150000"
          step="1"
          type="number"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
        />
      </label>

      <label className="manual-transaction-form__field">
        <span>Ghi chú</span>
        <textarea
          placeholder="Ghi chú ngắn cho giao dịch này"
          rows={3}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {errorMessage ? (
        <p className="manual-transaction-form__error">{errorMessage}</p>
      ) : null}

      <button
        disabled={isSaving}
        onClick={() => {
          void saveTransaction()
        }}
        type="button"
      >
        {isSaving ? 'Đang lưu...' : 'Lưu giao dịch'}
      </button>
    </form>
  )
}
