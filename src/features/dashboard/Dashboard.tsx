import { useState, type FormEvent } from 'react'
import type { DashboardSummary } from '../../database/models'
import { setInitialBalanceOnce } from '../../repositories/dashboardRepository'
import { formatVnd } from '../../utils/currency'
import './Dashboard.css'

type DashboardProps = {
  summary: DashboardSummary
  onInitialBalanceUpdated: () => Promise<void>
}

const emptySummary: DashboardSummary = {
  hasInitialBalance: false,
  initialBalanceVnd: 0,
  totalIncomeVnd: 0,
  totalExpenseVnd: 0,
  currentBalanceVnd: 0,
  todayTransactionCount: 0,
  todayIncomeVnd: 0,
  todayExpenseVnd: 0,
}

export function Dashboard({
  summary = emptySummary,
  onInitialBalanceUpdated,
}: DashboardProps) {
  const [initialBalanceInput, setInitialBalanceInput] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedBalance = Number(initialBalanceInput)

    if (!Number.isFinite(normalizedBalance) || normalizedBalance < 0) {
      setErrorMessage('Vui lòng nhập số tiền ban đầu hợp lệ.')
      return
    }

    const confirmed = window.confirm(
      'Đây là số tiền gốc ban đầu để hệ thống tính toán số dư.\n\nSau khi lưu sẽ không cho nhập lại trong MVP.\n\nNgười dùng cần kiểm tra kỹ trước khi xác nhận.',
    )

    if (!confirmed) {
      return
    }

    setErrorMessage('')
    setIsSaving(true)

    try {
      await setInitialBalanceOnce(normalizedBalance)
      setInitialBalanceInput('')
      await onInitialBalanceUpdated()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể lưu số tiền ban đầu.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="dashboard" aria-labelledby="dashboard-title">
      <div className="dashboard__header">
        <div>
          <p className="dashboard__eyebrow">Dashboard</p>
          <h2 id="dashboard-title">Tổng quan tài chính</h2>
        </div>
      </div>

      {!summary.hasInitialBalance ? (
        <div className="dashboard__setup">
          <div>
            <strong>Chưa thiết lập số tiền ban đầu</strong>
            <p>
              Bạn vẫn có thể nhập giao dịch, nhưng cần thiết lập số tiền ban
              đầu để hệ thống tính số dư chính xác.
            </p>
          </div>

          <form className="dashboard__balance-form" onSubmit={handleSubmit}>
            <label>
              <span>Số tiền hiện có ban đầu</span>
              <input
                min="0"
                step="1"
                type="number"
                value={initialBalanceInput}
                onChange={(event) => setInitialBalanceInput(event.target.value)}
                placeholder="0"
              />
            </label>
            <button disabled={isSaving} type="submit">
              {isSaving ? 'Đang lưu...' : 'Lưu số tiền ban đầu'}
            </button>
          </form>
        </div>
      ) : null}

      {errorMessage ? <p className="dashboard__error">{errorMessage}</p> : null}

      <div className="dashboard__grid">
        <article className="dashboard__card dashboard__card--primary">
          <span>Số dư hiện tại</span>
          <strong>{formatVnd(summary.currentBalanceVnd)}</strong>
        </article>
        <article className="dashboard__card dashboard__card--income">
          <span>Tổng thu nhập</span>
          <strong>{formatVnd(summary.totalIncomeVnd)}</strong>
        </article>
        <article className="dashboard__card dashboard__card--expense">
          <span>Tổng chi tiêu</span>
          <strong>{formatVnd(summary.totalExpenseVnd)}</strong>
        </article>
        <article className="dashboard__card">
          <span>Số giao dịch hôm nay</span>
          <strong>{summary.todayTransactionCount}</strong>
        </article>
        <article className="dashboard__card dashboard__card--income">
          <span>Thu nhập hôm nay</span>
          <strong>{formatVnd(summary.todayIncomeVnd)}</strong>
        </article>
        <article className="dashboard__card dashboard__card--expense">
          <span>Chi tiêu hôm nay</span>
          <strong>{formatVnd(summary.todayExpenseVnd)}</strong>
        </article>
      </div>
    </section>
  )
}
