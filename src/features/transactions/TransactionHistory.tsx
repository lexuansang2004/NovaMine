import { useEffect, useMemo, useState } from 'react'
import type {
  LocationRecord,
  PhotoMetadata,
  Transaction,
} from '../../database/models'
import { softDeleteTransaction } from '../../repositories/transactionsRepository'
import {
  getPhotoBlob,
  getPhotosByTransactionIds,
} from '../../services/imageStorageService'
import {
  formatLocationAddress,
  getLocationsByIds,
} from '../../services/locationService'
import { formatVnd } from '../../utils/currency'
import './TransactionHistory.css'

type TransactionHistoryProps = {
  transactions: Transaction[]
  onTransactionDeleted: () => Promise<void>
}

type TransactionTypeFilter = 'all' | Transaction['type']

function getTypeLabel(type: Transaction['type']) {
  return type === 'income' ? 'Thu nhập' : 'Chi tiêu'
}

function formatReceiptTimestamp(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
}

function getTransactionAmount(transaction: Transaction) {
  return transaction.amountVnd ?? transaction.amount
}

function getTransactionCategoryName(transaction: Transaction) {
  return transaction.categoryName ?? transaction.category ?? transaction.title
}

type TransactionPhotoPreview = {
  metadata: PhotoMetadata
  url: string
}

export function TransactionHistory({
  transactions,
  onTransactionDeleted,
}: TransactionHistoryProps) {
  const [photoPreviewsByTransactionId, setPhotoPreviewsByTransactionId] =
    useState<Record<number, TransactionPhotoPreview>>({})
  const [locationsById, setLocationsById] = useState<
    Record<number, LocationRecord>
  >({})
  const [dateFilter, setDateFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<TransactionTypeFilter>('all')

  const filteredTransactions = useMemo(() => {
    const normalizedSearchTerm = searchTerm.trim().toLocaleLowerCase('vi-VN')

    return transactions.filter((transaction) => {
      const categoryName = getTransactionCategoryName(transaction)
        .toLocaleLowerCase('vi-VN')
        .trim()
      const matchesSearch = normalizedSearchTerm
        ? categoryName.includes(normalizedSearchTerm)
        : true
      const matchesType =
        typeFilter === 'all' ? true : transaction.type === typeFilter
      const matchesDate = dateFilter ? transaction.dateKey === dateFilter : true

      return matchesSearch && matchesType && matchesDate
    })
  }, [dateFilter, searchTerm, transactions, typeFilter])

  const filteredSummary = useMemo(() => {
    return filteredTransactions.reduce(
      (summary, transaction) => {
        const amount = getTransactionAmount(transaction)

        if (transaction.type === 'income') {
          summary.totalIncomeVnd += amount
        } else {
          summary.totalExpenseVnd += amount
        }

        summary.balanceVnd = summary.totalIncomeVnd - summary.totalExpenseVnd

        return summary
      },
      {
        balanceVnd: 0,
        totalExpenseVnd: 0,
        totalIncomeVnd: 0,
      },
    )
  }, [filteredTransactions])

  const hasActiveFilters =
    Boolean(searchTerm.trim()) || typeFilter !== 'all' || Boolean(dateFilter)

  useEffect(() => {
    let isActive = true
    const objectUrls: string[] = []
    const transactionIds = filteredTransactions
      .map((transaction) => transaction.id)
      .filter((id): id is number => Boolean(id))

    void getPhotosByTransactionIds(transactionIds).then(async (photos) => {
      const previews = await Promise.all(
        photos.map(async (photo) => {
          const blob = await getPhotoBlob(photo)
          const url = URL.createObjectURL(blob)
          objectUrls.push(url)

          return {
            metadata: photo,
            url,
          }
        }),
      )

      if (!isActive) {
        objectUrls.forEach((url) => URL.revokeObjectURL(url))
        return
      }

      setPhotoPreviewsByTransactionId(
        previews.reduce<Record<number, TransactionPhotoPreview>>(
          (accumulator, preview) => {
            if (preview.metadata.transactionId) {
              accumulator[preview.metadata.transactionId] = preview
            }

            return accumulator
          },
          {},
        ),
      )
    })

    return () => {
      isActive = false
      objectUrls.forEach((url) => URL.revokeObjectURL(url))
    }
  }, [filteredTransactions])

  useEffect(() => {
    let isActive = true
    const locationIds = filteredTransactions
      .map((transaction) => transaction.locationId)
      .filter((locationId): locationId is number => Boolean(locationId))

    void getLocationsByIds(locationIds).then((locations) => {
      if (!isActive) {
        return
      }

      setLocationsById(
        locations.reduce<Record<number, LocationRecord>>(
          (accumulator, location) => {
            if (location.id) {
              accumulator[location.id] = location
            }

            return accumulator
          },
          {},
        ),
      )
    })

    return () => {
      isActive = false
    }
  }, [filteredTransactions])

  function handleResetFilters() {
    setDateFilter('')
    setSearchTerm('')
    setTypeFilter('all')
  }

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
          {transactions.some((transaction) => transaction.locationId) ? (
            <p className="transaction-history__attribution">
              Dữ liệu địa chỉ © OpenStreetMap contributors.
            </p>
          ) : null}
        </div>
        <span>
          {filteredTransactions.length}
          {filteredTransactions.length !== transactions.length
            ? `/${transactions.length}`
            : ''}
        </span>
      </div>

      <div className="transaction-history__filters" aria-label="Bộ lọc lịch sử">
        <label className="transaction-history__field">
          <span>Tìm loại phí</span>
          <input
            autoComplete="off"
            placeholder="Ví dụ: ăn uống, lương"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="transaction-history__field">
          <span>Loại giao dịch</span>
          <select
            value={typeFilter}
            onChange={(event) =>
              setTypeFilter(event.target.value as TransactionTypeFilter)
            }
          >
            <option value="all">Tất cả</option>
            <option value="income">Thu nhập</option>
            <option value="expense">Chi tiêu</option>
          </select>
        </label>

        <label className="transaction-history__field">
          <span>Ngày giao dịch</span>
          <input
            type="date"
            value={dateFilter}
            onChange={(event) => setDateFilter(event.target.value)}
          />
        </label>

        <button
          className="transaction-history__reset"
          disabled={!hasActiveFilters}
          onClick={handleResetFilters}
          type="button"
        >
          Đặt lại
        </button>
      </div>

      <div className="transaction-history__summary" aria-label="Tổng theo bộ lọc">
        <article>
          <span>Tổng thu</span>
          <strong className="transaction-history__amount--income">
            {formatVnd(filteredSummary.totalIncomeVnd)}
          </strong>
        </article>
        <article>
          <span>Tổng chi</span>
          <strong className="transaction-history__amount--expense">
            {formatVnd(filteredSummary.totalExpenseVnd)}
          </strong>
        </article>
        <article>
          <span>Số dư lọc</span>
          <strong>{formatVnd(filteredSummary.balanceVnd)}</strong>
        </article>
      </div>

      {transactions.length === 0 ? (
        <p className="transaction-history__empty">Chưa có giao dịch nào.</p>
      ) : filteredTransactions.length === 0 ? (
        <p className="transaction-history__empty">
          Không có giao dịch phù hợp với bộ lọc.
        </p>
      ) : (
        <ul>
          {filteredTransactions.map((transaction) => (
            <li key={transaction.id}>
              {transaction.id && photoPreviewsByTransactionId[transaction.id] ? (
                <div className="transaction-history__photo-frame">
                  <img
                    alt="Ảnh hóa đơn của giao dịch"
                    className="transaction-history__photo"
                    src={photoPreviewsByTransactionId[transaction.id].url}
                  />
                  <div className="transaction-history__photo-overlay">
                    <strong>{formatReceiptTimestamp(transaction.occurredAt)}</strong>
                    <span>
                      {getTransactionCategoryName(transaction)} |{' '}
                      {formatVnd(getTransactionAmount(transaction))}
                    </span>
                  </div>
                </div>
              ) : null}

              <div className="transaction-history__info">
                <strong>{getTransactionCategoryName(transaction)}</strong>
                <span>{getTypeLabel(transaction.type)}</span>
                {transaction.note ? <p>{transaction.note}</p> : null}
                <small>
                  {transaction.dateKey ? `Ngày ${transaction.dateKey}` : null}
                  {transaction.hourKey ? ` | Giờ ${transaction.hourKey}` : null}
                </small>
                <small className="transaction-history__location">
                  {transaction.locationId
                    ? formatLocationAddress(locationsById[transaction.locationId])
                    : 'Không có địa chỉ'}
                </small>
              </div>

              <div className="transaction-history__meta">
                <strong
                  className={`transaction-history__amount transaction-history__amount--${transaction.type}`}
                >
                  {transaction.type === 'income' ? '+' : '-'}
                  {formatVnd(getTransactionAmount(transaction))}
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
