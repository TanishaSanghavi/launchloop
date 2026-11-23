/** Parses the timestamp shapes a record envelope may carry (ISO string, or epoch seconds/ms). */
export function toDate(value: string | number | undefined | null): Date | null {
  if (value === undefined || value === null || value === '') return null
  const n = typeof value === 'number' ? value : /^\d+(\.\d+)?$/.test(value) ? Number(value) : NaN
  const d = Number.isNaN(n) ? new Date(value) : new Date(n < 1e12 ? n * 1000 : n)
  return Number.isNaN(d.getTime()) ? null : d
}

export function timeAgo(value: string | number | undefined | null, now: Date = new Date()): string {
  const d = toDate(value)
  if (!d) return ''
  const seconds = Math.round((now.getTime() - d.getTime()) / 1000)
  if (seconds < 45) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}

export function fullDate(value: string | number | undefined | null): string {
  const d = toDate(value)
  return d ? d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : ''
}
