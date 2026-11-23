import { describe, expect, it } from 'vitest'
import { timeAgo, toDate } from './time'

const now = new Date('2026-06-15T12:00:00.000Z')

describe('timeAgo', () => {
  it('formats relative times', () => {
    expect(timeAgo('2026-06-15T11:59:50.000Z', now)).toBe('just now')
    expect(timeAgo('2026-06-15T11:30:00.000Z', now)).toBe('30m ago')
    expect(timeAgo('2026-06-15T07:00:00.000Z', now)).toBe('5h ago')
    expect(timeAgo('2026-06-12T12:00:00.000Z', now)).toBe('3d ago')
  })
  it('accepts epoch seconds and epoch milliseconds', () => {
    const ms = new Date('2026-06-15T11:00:00.000Z').getTime()
    expect(timeAgo(ms, now)).toBe('1h ago')
    expect(timeAgo(String(Math.floor(ms / 1000)), now)).toBe('1h ago')
  })
  it('returns an empty string for missing or invalid input', () => {
    expect(timeAgo(undefined, now)).toBe('')
    expect(timeAgo('garbage', now)).toBe('')
    expect(toDate('')).toBeNull()
  })
})
