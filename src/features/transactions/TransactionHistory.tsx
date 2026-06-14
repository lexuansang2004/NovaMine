import { useEffect, useState } from 'react'
import type { PhotoMetadata, Transaction } from '../../database/models'
import { softDeleteTransaction } from '../../repositories/transactionsRepository'
import {
  getPhotoBlob,
  getPhotosByTransactionIds,
} from '../../services/imageStorageService'
import { formatVnd } from '../../utils/currency'
import './TransactionHistory.css'

type TransactionHistoryProps = {
  transactions: Transaction[]
  onTransactionDeleted: () => Promise<void>
}

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

  useEffect(() => {
    let isActive = true
    const objectUrls: string[] = []
    const transactionIds = transactions
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
  }, [transactions])

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
                      {transaction.title} | {formatVnd(transaction.amount)}
                    </span>
                  </div>
                </div>
              ) : null}

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
