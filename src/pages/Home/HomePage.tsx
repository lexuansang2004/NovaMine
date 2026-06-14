import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/BrandMark/BrandMark'
import type { Transaction } from '../../database/models'
import { ManualTransactionForm } from '../../features/transactions/ManualTransactionForm'
import { TransactionHistory } from '../../features/transactions/TransactionHistory'
import { getConfirmedTransactions } from '../../repositories/transactionsRepository'
import './HomePage.css'

const homeHighlights = [
  {
    label: 'Local-first',
    value: 'Data stays on device',
  },
  {
    label: 'Phase 2',
    value: 'Manual form',
  },
  {
    label: 'Focus',
    value: 'Transaction history',
  },
]

export function HomePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])

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

  return (
    <section className="home-page" aria-labelledby="home-title">
      <div className="home-page__intro">
        <BrandMark />
        <p className="home-page__eyebrow">NovaMine foundation</p>
        <h1 id="home-title">Personal finance, kept close to you.</h1>
        <p className="home-page__summary">
          Record income and expenses manually, keep every confirmed transaction
          in IndexedDB, and review your history after reload.
        </p>
      </div>

      <div className="home-page__panel" aria-label="Phase 2 status">
        {homeHighlights.map((item) => (
          <article className="home-page__item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="home-page__workspace">
        <ManualTransactionForm onTransactionCreated={loadTransactions} />
        <TransactionHistory
          transactions={transactions}
          onTransactionDeleted={loadTransactions}
        />
      </div>
    </section>
  )
}
