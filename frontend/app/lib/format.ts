const NEPAL_TIMEZONE = "Asia/Kathmandu"

const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "NPR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

function toDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return isNaN(date.getTime()) ? null : date
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) return "Rs. 0.00"
  return currencyFormatter.format(value)
}

export function formatNepalDate(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }
): string {
  const date = toDate(value)
  if (!date) return "N/A"
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: NEPAL_TIMEZONE,
  }).format(date)
}

export function formatNepalTime(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }
): string {
  const date = toDate(value)
  if (!date) return "N/A"
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: NEPAL_TIMEZONE,
  }).format(date)
}

export function formatNepalDateTime(value: string | Date | null | undefined): string {
  const date = toDate(value)
  if (!date) return "N/A"
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: NEPAL_TIMEZONE,
  }).format(date)
}

export function formatDuration(start: string | Date, end: string | Date): string {
  const startDate = new Date(start)
  const endDate = new Date(end)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return "N/A"
  const diffMs = endDate.getTime() - startDate.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 60) return `${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}

export function formatTimeElapsed(since: string | Date): string {
  const sinceDate = new Date(since)
  if (isNaN(sinceDate.getTime())) return "0m"
  const diffMs = Date.now() - sinceDate.getTime()
  const diffMins = Math.max(0, Math.floor(diffMs / 60000))

  if (diffMins < 60) return `${diffMins}m`
  const hours = Math.floor(diffMins / 60)
  const mins = diffMins % 60
  return `${hours}h ${mins}m`
}
