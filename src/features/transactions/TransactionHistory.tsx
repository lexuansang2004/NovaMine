import type { Transaction } from '../../database/models'
import { softDeleteTransaction } from '../../repositories/transactionsRepository'
import './TransactionHistory.css'

type TransactionHistoryProps = {
  transactions: Transaction[]
  onTransactionDeleted: () => Promise<void>
}

function formatVnd(amount: number) {
  return `${amount.toLocaleString('vi-VN')} VNĐ`
}

function getTypeLabel(type: Transaction['type']) {
  return type === 'income' ? 'Thu nhập' : 'Chi tiêu'
}

export function TransactionHistory({
  transactions,
  onTransactionDeleted,
}: TransactionHistoryProps) {
  async function handleDelete(transactionId: number) {
    await softDeleteTransaction(transactionId)
    await onTransactionDeleted()
  }

  return (
    <section className="transaction-history" aria-labelledby="transactions-title">
      <div className="transaction-history__header">
        <div>
          <h2 id="transactions-title">Lịch sử giao dịch</h2>
          <p>Chỉ hiển thị giao dịch đã xác nhận và chưa xóa mềm.</p>
        </div>
        <span>{transactions.length}</span>
      </div>

      {transactions.length === 0 ? (
        <p className="transaction-history__empty">Chưa có giao dịch nào.</p>
      ) : (
        <ul>
          {transactions.map((transaction) => (
            <li key={transaction.id}>
              <div className="transaction-history__info">
                <strong>{transaction.title}</strong>
                <span>{getTypeLabel(transaction.type)}</span>
                {transaction.note ? <p>{transaction.note}</p> : null}
              </div>

              <div className="transaction-history__meta">
                <strong
                  className={`transaction-history__amount transaction-history__amount--${transaction.type}`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatVnd(transaction.amount)}
                </strong>
                <button
                  type="button"
                  onClick={() => {
                    if (transaction.id) {
                      void handleDelete(transaction.id)
                    }
                  }}
                >
                  Xóa mềm
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
