import { describe, expect, it } from 'vitest'
import { LIMITS } from './limits'
import {
  addMilestone,
  appendMilestones,
  editMilestone,
  moveMilestone,
  nextMilestone,
  parseMilestones,
  progressOf,
  removeMilestone,
  setMilestoneDone,
  type Milestone,
} from './milestones'

const m = (id: string, done = false): Milestone => ({
  id,
  title: `Milestone ${id}`,
  details: '',
  priority: 'medium',
  estimate: '',
  done,
})

describe('parseMilestones (untrusted stored JSON)', () => {
  it('returns [] for garbage', () => {
    expect(parseMilestones(undefined)).toEqual([])
    expect(parseMilestones(null)).toEqual([])
    expect(parseMilestones(42)).toEqual([])
    expect(parseMilestones({ a: 1 })).toEqual([])
    expect(parseMilestones('not json')).toEqual([])
  })

  it('accepts an array or a JSON string', () => {
    const arr = [{ id: 'a', title: 'Ship it', done: true, completedAt: '2026-01-01T00:00:00.000Z' }]
    expect(parseMilestones(arr)[0]).toMatchObject({ id: 'a', title: 'Ship it', done: true })
    expect(parseMilestones(JSON.stringify(arr))).toHaveLength(1)
  })

  it('drops entries without a title and non-objects', () => {
    expect(parseMilestones([{ title: '   ' }, 'x', null, { title: 'ok' }])).toHaveLength(1)
  })

  it('clamps lengths, defaults priority, and only keeps completedAt when done', () => {
    const [x] = parseMilestones([
      {
        id: 'a',
        title: 'T'.repeat(500),
        details: 'D'.repeat(900),
        estimate: 'E'.repeat(200),
        priority: 'urgent',
        done: false,
        completedAt: '2026-01-01',
      },
    ])
    expect(x.title).toHaveLength(LIMITS.milestoneTitle)
    expect(x.details).toHaveLength(LIMITS.milestoneDetails)
    expect(x.estimate).toHaveLength(LIMITS.estimate)
    expect(x.priority).toBe('medium')
    expect(x.completedAt).toBeUndefined()
  })

  it('de-duplicates ids and caps the count', () => {
    const dup = parseMilestones([{ id: 'a', title: 'one' }, { id: 'a', title: 'two' }])
    expect(new Set(dup.map((d) => d.id)).size).toBe(2)
    const many = Array.from({ length: 100 }, (_, i) => ({ id: `i${i}`, title: `t${i}` }))
    expect(parseMilestones(many)).toHaveLength(LIMITS.maxMilestones)
  })

  it('does not execute or keep unknown fields', () => {
    const [x] = parseMilestones([{ id: 'a', title: 'ok', __proto__: { evil: 1 }, evil: '<script>' }])
    expect(Object.keys(x).sort()).toEqual(['details', 'done', 'estimate', 'id', 'priority', 'title'])
  })
})

describe('progressOf / nextMilestone', () => {
  it('handles empty, partial and complete lists', () => {
    expect(progressOf([])).toEqual({ total: 0, done: 0, percent: 0 })
    expect(progressOf([m('a', true), m('b'), m('c')])).toEqual({ total: 3, done: 1, percent: 33 })
    expect(progressOf([m('a', true), m('b', true)]).percent).toBe(100)
  })

  it('finds the first unfinished milestone in list order', () => {
    expect(nextMilestone([m('a', true), m('b'), m('c')])?.id).toBe('b')
    expect(nextMilestone([m('a', true)])).toBeUndefined()
  })
})

describe('list operations are immutable and bounded', () => {
  it('adds with a trimmed title and refuses blanks', () => {
    const list = [m('a')]
    const next = addMilestone(list, { title: '  Write tests  ', priority: 'high' })
    expect(next).toHaveLength(2)
    expect(next[1].title).toBe('Write tests')
    expect(list).toHaveLength(1)
    expect(addMilestone(list, { title: '   ' })).toHaveLength(1)
  })

  it('refuses to exceed the milestone cap', () => {
    const full = Array.from({ length: LIMITS.maxMilestones }, (_, i) => m(`m${i}`))
    expect(addMilestone(full, { title: 'one more' })).toHaveLength(LIMITS.maxMilestones)
    expect(appendMilestones(full, [{ title: 'x' }])).toHaveLength(LIMITS.maxMilestones)
    expect(appendMilestones([m('a')], Array.from({ length: 100 }, (_, i) => ({ title: `t${i}` })))).toHaveLength(
      LIMITS.maxMilestones,
    )
  })

  it('toggles done with a timestamp and clears it again', () => {
    const done = setMilestoneDone([m('a')], 'a', true, '2026-05-05T00:00:00.000Z')
    expect(done[0]).toMatchObject({ done: true, completedAt: '2026-05-05T00:00:00.000Z' })
    const undone = setMilestoneDone(done, 'a', false)
    expect(undone[0].done).toBe(false)
    expect('completedAt' in undone[0]).toBe(false)
  })

  it('edits only the targeted milestone and keeps the old title if the new one is blank', () => {
    const list = [m('a'), m('b')]
    const edited = editMilestone(list, 'a', { title: '   ', priority: 'low', estimate: '2 days' })
    expect(edited[0]).toMatchObject({ title: 'Milestone a', priority: 'low', estimate: '2 days' })
    expect(edited[1]).toEqual(list[1])
  })

  it('removes and reorders', () => {
    const list = [m('a'), m('b'), m('c')]
    expect(removeMilestone(list, 'b').map((x) => x.id)).toEqual(['a', 'c'])
    expect(moveMilestone(list, 'c', -1).map((x) => x.id)).toEqual(['a', 'c', 'b'])
    expect(moveMilestone(list, 'a', -1).map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(moveMilestone(list, 'c', 1).map((x) => x.id)).toEqual(['a', 'b', 'c'])
    expect(moveMilestone(list, 'zzz', 1)).toHaveLength(3)
  })
})
