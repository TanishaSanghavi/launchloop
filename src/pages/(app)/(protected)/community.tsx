import { useMemo, useState } from 'react'
import { useQuery } from 'deepspace'
import { Compass, Plus, SearchX } from 'lucide-react'
import { ProjectCard, ProjectCardSkeleton, ProjectGrid } from '../../../components/projects/ProjectCard'
import { ProjectFormModal } from '../../../components/projects/ProjectFormModal'
import { Button, EmptyState, SearchInput } from '../../../components/ui'
import { NativeSelect } from '../../../components/ui/NativeSelect'
import { CATEGORIES, isCategory } from '../../../lib/categories'
import { DEFAULT_FILTER, filterProjects, toProjectView, type ProjectData, type ProjectFilter, type ProjectSort } from '../../../lib/projects'
import { usePeople } from '../../../lib/use-people'

const SORTS: Array<{ value: ProjectSort; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'updated', label: 'Recently updated' },
  { value: 'progress', label: 'Most progress' },
]

export default function CommunityPage() {
  const people = usePeople()
  const { records, status } = useQuery<ProjectData>('projects')
  const [filter, setFilter] = useState<ProjectFilter>(DEFAULT_FILTER)
  const [creating, setCreating] = useState(false)

  // The server only sends projects this person may read (public ones, plus their own).
  // Private ones of their own are hidden here: the community lists public projects.
  const publicProjects = useMemo(() => records.map(toProjectView).filter((p) => p.visibility === 'public'), [records])
  const results = useMemo(() => filterProjects(publicProjects, filter, (id) => people(id).name), [publicProjects, filter, people])

  const filtering = filter.query.trim() !== '' || filter.category !== 'all'
  const loading = status === 'loading'

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <title>Community · LaunchLoop</title>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Community</h1>
          <p className="mt-2 max-w-xl text-muted-foreground">See what other builders are making. Open a project to follow its progress or join the discussion.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          Share a project
        </Button>
      </header>

      <div className="mt-8 grid gap-3 sm:grid-cols-[1fr_12rem_12rem]" role="search" aria-label="Filter projects">
        <SearchInput
          value={filter.query}
          onChange={(e) => setFilter((f) => ({ ...f, query: e.target.value }))}
          onClear={() => setFilter((f) => ({ ...f, query: '' }))}
          placeholder="Search by title, description or builder"
          aria-label="Search projects"
        />
        <NativeSelect
          aria-label="Filter by category"
          value={filter.category}
          onChange={(e) => setFilter((f) => ({ ...f, category: isCategory(e.target.value) ? e.target.value : 'all' }))}
        >
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect
          aria-label="Sort projects"
          value={filter.sort}
          onChange={(e) => {
            const sort = SORTS.find((s) => s.value === e.target.value)
            if (sort) setFilter((f) => ({ ...f, sort: sort.value }))
          }}
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </NativeSelect>
      </div>

      <div className="mt-6">
        {loading ? (
          <ProjectGrid>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ProjectGrid>
        ) : status === 'error' ? (
          <EmptyState icon={<SearchX />} title="Couldn't load projects" description="Check your connection and reload the page." />
        ) : publicProjects.length === 0 ? (
          <EmptyState
            className="rounded-2xl border border-dashed border-border"
            icon={<Compass />}
            title="No projects shared yet"
            description="Be the first. Share what you're building and others can follow along."
            action={{ label: 'Share a project', onClick: () => setCreating(true) }}
          />
        ) : results.length === 0 ? (
          <EmptyState
            className="rounded-2xl border border-dashed border-border"
            icon={<SearchX />}
            title="No projects match"
            description={filtering ? 'Try a different search or category.' : 'Nothing to show.'}
            action={filtering ? { label: 'Clear filters', onClick: () => setFilter(DEFAULT_FILTER) } : undefined}
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
              {results.length} {results.length === 1 ? 'project' : 'projects'}
              {filtering ? ' found' : ''}
            </p>
            <h2 className="sr-only">Projects</h2>
            <ProjectGrid>
              {results.map((p) => (
                <ProjectCard key={p.id} project={p} owner={people(p.ownerId)} />
              ))}
            </ProjectGrid>
          </>
        )}
      </div>

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
