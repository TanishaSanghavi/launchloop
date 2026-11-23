import { describe, expect, it } from 'vitest'
import type { RecordData } from 'deepspace'
import { DEFAULT_FILTER, filterProjects, toProjectView, type ProjectData } from './projects'

function rec(id: string, createdBy: string, data: Partial<ProjectData>, createdAt = '2026-01-01T00:00:00.000Z', updatedAt = createdAt): RecordData<ProjectData> {
  return {
    recordId: id,
    createdBy,
    createdAt,
    updatedAt,
    data: { title: 'T', description: '', category: 'Web app', goal: '', visibility: 'public', ...data },
  }
}

const names: Record<string, string> = { u1: 'Ada Lovelace', u2: 'Grace Hopper' }
const nameOf = (id: string) => names[id] ?? ''

describe('toProjectView', () => {
  it('normalises unknown category/visibility and computes progress', () => {
    const v = toProjectView(
      rec('p1', 'u1', {
        title: '  ',
        category: 'Spaceships',
        visibility: 'whatever',
        milestones: [{ id: 'a', title: 'x', done: true }, { id: 'b', title: 'y' }],
      }),
    )
    expect(v.title).toBe('Untitled project')
    expect(v.category).toBe('Other')
    expect(v.visibility).toBe('public')
    expect(v.progress).toEqual({ total: 2, done: 1, percent: 50 })
    expect(v.ownerId).toBe('u1')
  })

  it('survives corrupted milestones', () => {
    expect(toProjectView(rec('p1', 'u1', { milestones: '{{{' })).progress.total).toBe(0)
  })
})

describe('filterProjects', () => {
  const projects = [
    toProjectView(rec('p1', 'u1', { title: 'Campus carpool', category: 'Mobile app', description: 'Share rides', milestones: [{ id: 'a', title: 'a', done: true }] }, '2026-01-01T00:00:00.000Z')),
    toProjectView(rec('p2', 'u2', { title: 'Synth pedal', category: 'Hardware', goal: 'Ship a kit' }, '2026-02-01T00:00:00.000Z')),
    toProjectView(rec('p3', 'u2', { title: 'Study buddy', category: 'AI & data' }, '2026-03-01T00:00:00.000Z', '2026-03-02T00:00:00.000Z')),
  ]

  it('returns everything newest-first by default', () => {
    expect(filterProjects(projects, DEFAULT_FILTER, nameOf).map((p) => p.id)).toEqual(['p3', 'p2', 'p1'])
  })

  it('searches title, description, goal and owner name, case-insensitively', () => {
    const ids = (query: string) => filterProjects(projects, { ...DEFAULT_FILTER, query }, nameOf).map((p) => p.id)
    expect(ids('CARPOOL')).toEqual(['p1'])
    expect(ids('rides')).toEqual(['p1'])
    expect(ids('ship a kit')).toEqual(['p2'])
    expect(ids('grace')).toEqual(['p3', 'p2'])
    expect(ids('nothing matches this')).toEqual([])
  })

  it('filters by category and combines with search', () => {
    expect(filterProjects(projects, { ...DEFAULT_FILTER, category: 'Hardware' }, nameOf).map((p) => p.id)).toEqual(['p2'])
    expect(filterProjects(projects, { ...DEFAULT_FILTER, category: 'Hardware', query: 'campus' }, nameOf)).toEqual([])
  })

  it('sorts by progress and by recent activity', () => {
    expect(filterProjects(projects, { ...DEFAULT_FILTER, sort: 'progress' }, nameOf)[0].id).toBe('p1')
    expect(filterProjects(projects, { ...DEFAULT_FILTER, sort: 'updated' }, nameOf)[0].id).toBe('p3')
  })
})
