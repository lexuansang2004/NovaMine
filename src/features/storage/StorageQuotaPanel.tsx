import { useEffect, useState } from 'react'
import {
  cleanupOrphanPhotos,
  formatStorageBytes,
  getStorageQuotaSummary,
  type OrphanPhotoCleanupResult,
  type StorageQuotaSummary,
} from '../../services/storageQuotaService'
import './StorageQuotaPanel.css'

export function StorageQuotaPanel() {
  const [cleanupResult, setCleanupResult] =
    useState<OrphanPhotoCleanupResult | null>(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [isCleaning, setIsCleaning] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [quotaSummary, setQuotaSummary] = useState<StorageQuotaSummary | null>(
    null,
  )

  async function loadQuotaSummary() {
    setIsLoading(true)
    setErrorMessage('')

    try {
      const summary = await getStorageQuotaSummary()
      setQuotaSummary(summary)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể đọc dung lượng lưu trữ của trình duyệt.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isActive = true

    void getStorageQuotaSummary()
      .then((summary) => {
        if (isActive) {
          setQuotaSummary(summary)
        }
      })
      .catch((error: unknown) => {
        if (isActive) {
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Không thể đọc dung lượng lưu trữ của trình duyệt.',
          )
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false)
        }
      })

    return () => {
      isActive = false
    }
  }, [])

  async function handleCleanupOrphanPhotos() {
    setIsCleaning(true)
    setCleanupResult(null)
    setErrorMessage('')

    try {
      const result = await cleanupOrphanPhotos()
      setCleanupResult(result)
      await loadQuotaSummary()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Không thể dọn ảnh orphan ở thời điểm này.',
      )
    } finally {
      setIsCleaning(false)
    }
  }

  const usagePercent = quotaSummary?.usagePercent ?? 0

  return (
    <section className="storage-quota" aria-labelledby="storage-quota-title">
      <div className="storage-quota__header">
        <div>
          <p className="storage-quota__eyebrow">Phase 10</p>
          <h2 id="storage-quota-title">Dung lượng lưu trữ</h2>
          <p>Theo dõi storage local và dọn ảnh chưa gắn giao dịch.</p>
        </div>
        <button
          disabled={isCleaning}
          onClick={() => {
            void handleCleanupOrphanPhotos()
          }}
          type="button"
        >
          {isCleaning ? 'Đang dọn...' : 'Dọn ảnh orphan'}
        </button>
      </div>

      {isLoading ? (
        <p className="storage-quota__status">Đang đọc dung lượng...</p>
      ) : null}

      {quotaSummary ? (
        <div className="storage-quota__meter" aria-label="Storage usage">
          <div className="storage-quota__meter-label">
            <span>Đã dùng</span>
            <strong>
              {quotaSummary.isSupported
                ? `${formatStorageBytes(quotaSummary.usageBytes)} / ${formatStorageBytes(
                    quotaSummary.quotaBytes,
                  )}`
                : 'Trình duyệt chưa hỗ trợ Storage Estimate API'}
            </strong>
          </div>
          <div className="storage-quota__bar" aria-hidden="true">
            <span style={{ width: `${Math.min(usagePercent, 100)}%` }} />
          </div>
          {quotaSummary.isSupported ? (
            <p>{usagePercent}% dung lượng local đã được sử dụng.</p>
          ) : (
            <p>NovaMine vẫn hoạt động, nhưng không thể đọc quota hiện tại.</p>
          )}
        </div>
      ) : null}

      {quotaSummary?.shouldWarn ? (
        <p className="storage-quota__warning">
          Dung lượng đã đạt từ 80%. Bạn nên dọn ảnh orphan hoặc sao lưu dữ liệu.
        </p>
      ) : null}

      {cleanupResult ? (
        <p className="storage-quota__success">
          Đã dọn {cleanupResult.deletedCount} ảnh orphan, giải phóng khoảng{' '}
          {formatStorageBytes(cleanupResult.freedBytes)}.
          {cleanupResult.failedCount
            ? ` ${cleanupResult.failedCount} ảnh chưa dọn được.`
            : ''}
        </p>
      ) : null}

      {errorMessage ? (
        <p className="storage-quota__error">{errorMessage}</p>
      ) : null}
    </section>
  )
}
