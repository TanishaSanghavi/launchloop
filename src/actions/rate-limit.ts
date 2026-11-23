/**
 * Fixed-window rate limiter state machine. Pure: the action loads the user's
 * `ai_usage` row, calls this, and writes `next` back. One row per user (its
 * recordId is the user id), so storage never grows.
 */

export interface UsageRow {
  windowStart: number
  count: number
}

export type QuotaDecision =
  | { allowed: true; next: UsageRow }
  | { allowed: false; retryAfterSec: number }

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

export function consumeQuota(
  row: Partial<UsageRow> | null | undefined,
  now: number,
  max: number,
  windowMs: number,
): QuotaDecision {
  const windowStart = row?.windowStart
  const count = row?.count
  // No usable row, an expired window, or a window "from the future" (clock skew
  // or tampering): start a fresh window.
  if (!finite(windowStart) || !finite(count) || now - windowStart >= windowMs || windowStart > now) {
    return { allowed: true, next: { windowStart: now, count: 1 } }
  }
  if (count >= max) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)) }
  }
  return { allowed: true, next: { windowStart, count: count + 1 } }
}
