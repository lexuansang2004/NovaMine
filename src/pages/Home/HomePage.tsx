import { useEffect, useState } from 'react'
import { BrandMark } from '../../components/BrandMark/BrandMark'
import type { DashboardSummary, Transaction } from '../../database/models'
import { Dashboard } from '../../features/dashboard/Dashboard'
import { ManualTransactionForm } from '../../features/transactions/ManualTransactionForm'
import { TransactionHistory } from '../../features/transactions/TransactionHistory'
import { getDashboardSummary } from '../../repositories/dashboardRepository'
import { getConfirmedTransactions } from '../../repositories/transactionsRepository'
import './HomePage.css'

const homeHighlights = [
  {
    label: 'Local-first',
    value: 'Data stays on device',
  },
  {
    label: 'Phase 2.1',
    value: 'Balance dashboard',
  },
  {
    label: 'Focus',
    value: 'Dynamic summary',
  },
]

export function HomePage() {
  const [dashboardSummary, setDashboardSummary] =
    useState<DashboardSummary | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])

  async function loadFinancialOverview() {
    const [confirmedTransactions, summary] = await Promise.all([
      getConfirmedTransactions(),
      getDashboardSummary(),
    ])

    setTransactions(confirmedTransactions)
    setDashboardSummary(summary)
  }

  useEffect(() => {
    let isActive = true

    void Promise.all([getConfirmedTransactions(), getDashboardSummary()]).then(
      ([confirmedTransactions, summary]) => {
      if (isActive) {
        setTransactions(confirmedTransactions)
        setDashboardSummary(summary)
      }
      },
    )

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
          Track your starting cash, income, expenses, and live balance from
          local-first data stored in IndexedDB.
        </p>
      </div>

      <div className="home-page__panel" aria-label="Phase 2.1 status">
        {homeHighlights.map((item) => (
          <article className="home-page__item" key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </article>
        ))}
      </div>

      <div className="home-page__workspace">
        {dashboardSummary ? (
          <Dashboard
            summary={dashboardSummary}
            onInitialBalanceUpdated={loadFinancialOverview}
          />
        ) : null}
        <ManualTransactionForm onTransactionCreated={loadFinancialOverview} />
        <TransactionHistory
          transactions={transactions}
          onTransactionDeleted={loadFinancialOverview}
        />
      </div>
    </section>
  )
}
