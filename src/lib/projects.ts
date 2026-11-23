import type { RecordData } from 'deepspace'
import { isCategory, isVisibility, type Category, type Visibility } from './categories'
import { parseMilestones, progressOf, type Milestone, type Progress } from './milestones'

/** The stored shape of a `projects` record's data (see src/schemas/projects-schema.ts). */
export interface ProjectData {
  title: string
  description: string
  category: string
  goal: string
  visibility: string
  summary?: string
  startingPoint?: string
  milestones?: unknown
}

/** A project normalised for the UI: defensive parsing happens once, here. */
export interface ProjectView {
  id: string
  ownerId: string
  title: string
  description: string
  category: Category
  goal: string
  visibility: Visibility
  summary: string
  startingPoint: string
  milestones: Milestone[]
  progress: Progress
  createdAt: string
  updatedAt: string
}

export function toProjectView(record: RecordData<ProjectData>): ProjectView {
  const d = record.data
  const milestones = parseMilestones(d.milestones)
  return {
    id: record.recordId,
    ownerId: record.createdBy,
    title: (d.title ?? '').trim() || 'Untitled project',
    description: d.description ?? '',
    category: isCategory(d.category) ? d.category : 'Other',
    goal: d.goal ?? '',
    visibility: isVisibility(d.visibility) ? d.visibility : 'public',
    summary: d.summary ?? '',
    startingPoint: d.startingPoint ?? '',
    milestones,
    progress: progressOf(milestones),
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  }
}

export type ProjectSort = 'newest' | 'progress' | 'updated'

export interface ProjectFilter {
  query: string
  category: Category | 'all'
  sort: ProjectSort
}

export const DEFAULT_FILTER: ProjectFilter = { query: '', category: 'all', sort: 'newest' }

function time(value: string): number {
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

/** Search matches title, description, goal, category and the owner's display name. */
export function matchesQuery(project: ProjectView, query: string, ownerName: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [project.title, project.description, project.goal, project.category, ownerName]
    .join('\n')
    .toLowerCase()
    .includes(q)
}

export function filterProjects(
  projects: readonly ProjectView[],
  filter: ProjectFilter,
  ownerNameOf: (ownerId: string) => string,
): ProjectView[] {
  const filtered = projects.filter(
    (p) =>
      (filter.category === 'all' || p.category === filter.category) &&
      matchesQuery(p, filter.query, ownerNameOf(p.ownerId)),
  )
  const sorted = [...filtered]
  if (filter.sort === 'progress') {
    sorted.sort((a, b) => b.progress.percent - a.progress.percent || time(b.updatedAt) - time(a.updatedAt))
  } else if (filter.sort === 'updated') {
    sorted.sort((a, b) => time(b.updatedAt) - time(a.updatedAt))
  } else {
    sorted.sort((a, b) => time(b.createdAt) - time(a.createdAt))
  }
  return sorted
}
