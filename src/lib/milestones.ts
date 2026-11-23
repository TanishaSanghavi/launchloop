/**
 * Milestones live inside the project row as a JSON array. That is a deliberate
 * choice (see ARCHITECTURE.md): the project row's permission rule (`update:
 * 'own'`) then protects the milestones too, with no cross-record authorization
 * gap. Everything below is pure so it can be unit-tested without a backend.
 *
 * The array is client-written JSON, so `parseMilestones` treats it as
 * untrusted: it drops malformed entries and clamps every field.
 */

import { LIMITS } from './limits'

export const PRIORITIES = ['high', 'medium', 'low'] as const
export type Priority = (typeof PRIORITIES)[number]

export interface Milestone {
  id: string
  title: string
  details: string
  priority: Priority
  estimate: string
  done: boolean
  /** ISO timestamp, present only while `done` is true. */
  completedAt?: string
}

export interface MilestoneDraft {
  title: string
  details?: string
  priority?: Priority
  estimate?: string
}

export interface Progress {
  total: number
  done: number
  /** Whole number, 0–100. */
  percent: number
}

function clip(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : ''
}

export function newMilestoneId(): string {
  const c = globalThis.crypto
  const raw = c?.randomUUID ? c.randomUUID().replace(/-/g, '') : Math.random().toString(16).slice(2).padEnd(12, '0')
  return `m_${raw.slice(0, 12)}`
}

export function isPriority(value: unknown): value is Priority {
  return typeof value === 'string' && (PRIORITIES as readonly string[]).includes(value)
}

/** Accepts the stored value (array, JSON string, or garbage) and returns clean milestones. */
export function parseMilestones(raw: unknown): Milestone[] {
  let value: unknown = raw
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw)
    } catch {
      return []
    }
  }
  if (!Array.isArray(value)) return []

  const seen = new Set<string>()
  const out: Milestone[] = []
  for (const item of value.slice(0, LIMITS.maxMilestones)) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const title = clip(r.title, LIMITS.milestoneTitle)
    if (!title) continue

    let id = typeof r.id === 'string' && r.id.trim() ? r.id.trim().slice(0, 64) : newMilestoneId()
    if (seen.has(id)) id = newMilestoneId()
    seen.add(id)

    const done = r.done === true
    const completedAt = done && typeof r.completedAt === 'string' ? r.completedAt : undefined
    out.push({
      id,
      title,
      details: clip(r.details, LIMITS.milestoneDetails),
      priority: isPriority(r.priority) ? r.priority : 'medium',
      estimate: clip(r.estimate, LIMITS.estimate),
      done,
      ...(completedAt ? { completedAt } : {}),
    })
  }
  return out
}

export function progressOf(milestones: readonly Milestone[]): Progress {
  const total = milestones.length
  const done = milestones.filter((m) => m.done).length
  return { total, done, percent: total === 0 ? 0 : Math.round((done / total) * 100) }
}

/** The first unfinished milestone, in list order. */
export function nextMilestone(milestones: readonly Milestone[]): Milestone | undefined {
  return milestones.find((m) => !m.done)
}

export function canAddMilestones(current: readonly Milestone[], count = 1): boolean {
  return current.length + count <= LIMITS.maxMilestones
}

export function draftToMilestone(draft: MilestoneDraft): Milestone {
  return {
    id: newMilestoneId(),
    title: clip(draft.title, LIMITS.milestoneTitle),
    details: clip(draft.details, LIMITS.milestoneDetails),
    priority: isPriority(draft.priority) ? draft.priority : 'medium',
    estimate: clip(draft.estimate, LIMITS.estimate),
    done: false,
  }
}

export function addMilestone(list: readonly Milestone[], draft: MilestoneDraft): Milestone[] {
  const m = draftToMilestone(draft)
  if (!m.title || !canAddMilestones(list)) return [...list]
  return [...list, m]
}

/** Appends as many drafts as fit under the cap; blanks are skipped. */
export function appendMilestones(list: readonly Milestone[], drafts: readonly MilestoneDraft[]): Milestone[] {
  const out = [...list]
  for (const draft of drafts) {
    if (out.length >= LIMITS.maxMilestones) break
    const m = draftToMilestone(draft)
    if (m.title) out.push(m)
  }
  return out
}

export function setMilestoneDone(
  list: readonly Milestone[],
  id: string,
  done: boolean,
  now: string = new Date().toISOString(),
): Milestone[] {
  return list.map((m) => {
    if (m.id !== id) return m
    if (done) return { ...m, done: true, completedAt: now }
    const { completedAt: _omit, ...rest } = m
    void _omit
    return { ...rest, done: false }
  })
}

export function editMilestone(
  list: readonly Milestone[],
  id: string,
  patch: Partial<Pick<Milestone, 'title' | 'details' | 'priority' | 'estimate'>>,
): Milestone[] {
  return list.map((m) => {
    if (m.id !== id) return m
    const title = patch.title !== undefined ? clip(patch.title, LIMITS.milestoneTitle) : m.title
    return {
      ...m,
      title: title || m.title,
      details: patch.details !== undefined ? clip(patch.details, LIMITS.milestoneDetails) : m.details,
      priority: patch.priority !== undefined && isPriority(patch.priority) ? patch.priority : m.priority,
      estimate: patch.estimate !== undefined ? clip(patch.estimate, LIMITS.estimate) : m.estimate,
    }
  })
}

export function removeMilestone(list: readonly Milestone[], id: string): Milestone[] {
  return list.filter((m) => m.id !== id)
}

export function moveMilestone(list: readonly Milestone[], id: string, direction: -1 | 1): Milestone[] {
  const index = list.findIndex((m) => m.id === id)
  const target = index + direction
  if (index < 0 || target < 0 || target >= list.length) return [...list]
  const next = [...list]
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}
