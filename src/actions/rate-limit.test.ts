import { describe, expect, it } from 'vitest'
import { consumeQuota } from './rate-limit'

const HOUR = 3_600_000

describe('consumeQuota', () => {
  it('starts a window for a new user', () => {
    expect(consumeQuota(null, 1000, 3, HOUR)).toEqual({ allowed: true, next: { windowStart: 1000, count: 1 } })
  })
  it('counts up inside the window', () => {
    expect(consumeQuota({ windowStart: 1000, count: 1 }, 2000, 3, HOUR)).toEqual({
      allowed: true,
      next: { windowStart: 1000, count: 2 },
    })
  })
  it('refuses at the limit and reports a retry time', () => {
    const d = consumeQuota({ windowStart: 0, count: 3 }, 60_000, 3, HOUR)
    expect(d.allowed).toBe(false)
    if (!d.allowed) expect(d.retryAfterSec).toBe(3540)
  })
  it('resets after the window expires', () => {
    expect(consumeQuota({ windowStart: 0, count: 3 }, HOUR, 3, HOUR)).toEqual({
      allowed: true,
      next: { windowStart: HOUR, count: 1 },
    })
  })
  it('treats corrupt or future-dated rows as a fresh window (cannot be abused to lock or unlock)', () => {
    expect(consumeQuota({ windowStart: NaN, count: 99 }, 5, 3, HOUR).allowed).toBe(true)
    expect(consumeQuota({ windowStart: 10 ** 15, count: 99 }, 5, 3, HOUR).allowed).toBe(true)
    expect(consumeQuota({ count: 2 } as never, 5, 3, HOUR).allowed).toBe(true)
  })
})
