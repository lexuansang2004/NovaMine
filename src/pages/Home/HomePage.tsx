import { useEffect, useState, type FormEvent } from 'react'
import { BrandMark } from '../../components/BrandMark/BrandMark'
import type { Transaction, TransactionType } from '../../database/models'
import {
  createTransaction,
  getConfirmedTransactions,
  softDeleteTransaction,
} from '../../repositories/transactionsRepository'
import './HomePage.css'

const homeHighlights = [
  {
    label: 'Local-first',
    value: 'Data stays on device',
  },
  {
    label: 'Phase 1',
    value: 'Dexie database',
  },
  {
    label: 'Focus',
    value: 'Manual transaction test',
  },
]

export function HomePage() {
  const [title, setTitle] = useState('Coffee')
  const [amount, setAmount] = useState('45000')
  const [type, setType] = useState<TransactionType>('expense')
  const [category, setCategory] = useState('Food')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isSaving, setIsSaving] = useState(false)

  async function loadTransactions() {
    const confirmedTransactions = await getConfirmedTransactions()
    setTransactions(confirmedTransactions)
  }

  useEffect(() => {
    let isActive = true

    void getConfirmedTransactions().then((confirmedTransactions) => {
      if (isActive) {
        setTransactions(confirmedTransactions)
      }
    })

    return () => {
      isActive = false
    }
  }, [])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const numericAmount = Number(amount)

    if (!title.trim() || !category.trim() || Number.isNaN(numericAmount)) {
      return
    }

    setIsSaving(true)

    try {
      await createTransaction({
        title,
        amount: numericAmount,
        type,
        category,
      })
      setTitle('')
      setAmount('')
      await loadTransactions()
    } finally {
      setIsSaving(false)
    }
  }

  async function handleSoftDelete(transactionId: number) {
    await softDeleteTransaction(transactionId)
    await loadTransactions()
  }

  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-page__intro">
        <BrandMark />
        <p className="home-page__eyebrow">NovaMine foundation</p>
        <h1 id="home-title">Personal finance, kept close to you.</h1>
        <p className="home-page__summary">
          A local-first transaction store powered by Dexie. Add a manual record,
          reload the browser, and the confirmed data stays available.
        </p>
      </div>

      <div className="home-page__panel" aria-label="Phase 1 status">
        {homeHighlights.map((item) => (
          <article className="home-page__item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="home-page__workspace">
        <form className="transaction-form" onSubmit={handleSubmit}>
          <div className="transaction-form__header">
            <h2>Manual transaction</h2>
            <p>Temporary Phase 1 form for database testing.</p>
          </div>

          <label>
            <span>Title</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Lunch"
            />
          </label>

          <label>
            <span>Amount</span>
            <input
              min="0"
              step="1000"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="50000"
            />
          </label>

          <div className="transaction-form__row">
            <label>
              <span>Type</span>
              <select
                value={type}
                onChange={(event) =>
                  setType(event.target.value as TransactionType)
                }
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </label>

            <label>
              <span>Category</span>
              <input
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                placeholder="Food"
              />
            </label>
          </div>

          <button disabled={isSaving} type="submit">
            {isSaving ? 'Saving...' : 'Create transaction'}
          </button>
        </form>

        <section className="transaction-list" aria-labelledby="transactions-title">
          <div className="transaction-list__header">
            <h2 id="transactions-title">Confirmed transactions</h2>
            <span>{transactions.length}</span>
          </div>

          {transactions.length === 0 ? (
            <p className="transaction-list__empty">
              No confirmed transactions yet.
            </p>
          ) : (
            <ul>
              {transactions.map((transaction) => (
                <li key={transaction.id}>
                  <div>
                    <strong>{transaction.title}</strong>
                    <span>
                      {transaction.category} - {transaction.type}
                    </span>
                  </div>
                  <div className="transaction-list__amount">
                    <strong>
                      {transaction.amount.toLocaleString('vi-VN')} VND
                    </strong>
                    <button
                      type="button"
                      onClick={() => {
                        if (transaction.id) {
                          void handleSoftDelete(transaction.id)
                        }
                      }}
                    >
                      Soft delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </section>
  )
}
