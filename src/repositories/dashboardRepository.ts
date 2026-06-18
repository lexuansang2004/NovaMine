import { db } from '../database/dexie'
import type { DashboardSummary } from '../database/models'

const INITIAL_BALANCE_KEY = 'initialBalanceVnd'

function toFiniteNumber(value: unknown): number {
  const numberValue = Number(value)

  return Number.isFinite(numberValue) ? numberValue : 0
}

function isToday(isoDate: string) {
  const date = new Date(isoDate)
  const now = new Date()

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export async function getInitialBalance(): Promise<number> {
  const setting = await db.app_settings.get(INITIAL_BALANCE_KEY)

  return toFiniteNumber(setting?.value)
}

export async function hasInitialBalance(): Promise<boolean> {
  const setting = await db.app_settings.get(INITIAL_BALANCE_KEY)

  return Boolean(setting)
}

export async function setInitialBalanceOnce(amountVnd: number): Promise<void> {
  const alreadyConfigured = await hasInitialBalance()

  if (alreadyConfigured) {
    throw new Error(
      'Số tiền ban đầu đã được thiết lập và không thể nhập lại trong MVP.',
    )
  }

  await db.app_settings.put({
    key: INITIAL_BALANCE_KEY,
    value: amountVnd,
    updatedAt: new Date().toISOString(),
  })
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [initialBalanceVnd, balanceConfigured, confirmedTransactions] =
    await Promise.all([
      getInitialBalance(),
      hasInitialBalance(),
      db.transactions
        .where('status')
        .equals('confirmed')
        .and((transaction) => !transaction.deletedAt)
        .toArray(),
    ])

  const summary = confirmedTransactions.reduce(
    (totals, transaction) => {
      const transactionIsToday = isToday(transaction.occurredAt)
      const amountVnd = transaction.amountVnd ?? transaction.amount

      if (transaction.type === 'income') {
        totals.totalIncomeVnd += amountVnd

        if (transactionIsToday) {
          totals.todayIncomeVnd += amountVnd
        }
      } else {
        totals.totalExpenseVnd += amountVnd

        if (transactionIsToday) {
          totals.todayExpenseVnd += amountVnd
        }
      }

      if (transactionIsToday) {
        totals.todayTransactionCount += 1
      }

      return totals
    },
    {
      totalIncomeVnd: 0,
      totalExpenseVnd: 0,
      todayExpenseVnd: 0,
      todayIncomeVnd: 0,
      todayTransactionCount: 0,
    },
  )

  return {
    ...summary,
    hasInitialBalance: balanceConfigured,
    initialBalanceVnd,
    currentBalanceVnd:
      initialBalanceVnd + summary.totalIncomeVnd - summary.totalExpenseVnd,
  }
}
