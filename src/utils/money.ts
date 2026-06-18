const THOUSAND_SUFFIX_PATTERN = /(k|nghin|nghìn|ngan|ngàn)\b/u
const MILLION_SUFFIX_PATTERN = /(trieu|triệu)\b/u

function normalizeMoneyText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replaceAll(',', '.')
    .replace(/\s+/g, ' ')
    .replace(/\b(vnd|vnđ|đồng|dong|đ)\b/gu, '')
    .trim()
}

function parseCompactNumber(value: string) {
  const normalizedValue = value.replace(/\s+/g, '')

  if (!/^\d+([.]\d+)*$/u.test(normalizedValue)) {
    return null
  }

  return Number(normalizedValue.replaceAll('.', ''))
}

export function parseVndInput(value: string): number | null {
  const normalizedValue = normalizeMoneyText(value)

  if (!normalizedValue) {
    return null
  }

  const amountMatch = normalizedValue.match(/\d+([.]\d+)*/u)
  const rawAmount = amountMatch?.[0]

  if (!rawAmount) {
    return null
  }

  const baseAmount = parseCompactNumber(rawAmount)

  if (!baseAmount || !Number.isFinite(baseAmount)) {
    return null
  }

  if (THOUSAND_SUFFIX_PATTERN.test(normalizedValue)) {
    return baseAmount * 1000
  }

  if (MILLION_SUFFIX_PATTERN.test(normalizedValue)) {
    return baseAmount * 1_000_000
  }

  return baseAmount
}

export function formatVndCurrency(amount: number) {
  return `${amount.toLocaleString('vi-VN')} ₫`
}
