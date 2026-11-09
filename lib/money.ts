export function formatVND(value?: number): string {
  if (value === undefined || value === null || Number.isNaN(value)) return '—'
  return new Intl.NumberFormat('vi-VN').format(value) + ' ₫'
}

export function parseMoneyInput(raw: string): number | undefined {
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return undefined
  return Number(digits)
}
