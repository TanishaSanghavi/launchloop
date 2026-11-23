import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth, useQuery, useUser } from 'deepspace'
import { ArrowRight, FolderPlus, Plus } from 'lucide-react'
import { ProjectCard, ProjectCardSkeleton, ProjectGrid } from '../../../components/projects/ProjectCard'
import { ProjectFormModal } from '../../../components/projects/ProjectFormModal'
import { Button, EmptyState } from '../../../components/ui'
import { nextMilestone } from '../../../lib/milestones'
import { toProjectView, type ProjectData } from '../../../lib/projects'
import { usePeople } from '../../../lib/use-people'

function time(value: string) {
  const t = Date.parse(value)
  return Number.isNaN(t) ? 0 : t
}

export default function DashboardPage() {
  const { userId } = useAuth()
  const { user } = useUser()
  const people = usePeople()
  const { records, status } = useQuery<ProjectData>('projects')
  const [creating, setCreating] = useState(false)

  const { mine, others } = useMemo(() => {
    const views = records.map(toProjectView)
    return {
      mine: views.filter((p) => p.ownerId === userId).sort((a, b) => time(b.updatedAt) - time(a.updatedAt)),
      others: views
        .filter((p) => p.ownerId !== userId && p.visibility === 'public')
        .sort((a, b) => time(b.createdAt) - time(a.createdAt))
        .slice(0, 3),
    }
  }, [records, userId])

  const firstName = user?.name?.trim().split(/\s+/)[0]
  const loading = status === 'loading'

  // "Next up": the most recently touched project that still has an unfinished milestone.
  const focus = mine.map((p) => ({ project: p, milestone: nextMilestone(p.milestones) })).find((x) => x.milestone)

  const milestonesDone = mine.reduce((sum, p) => sum + p.progress.done, 0)
  const loopsClosed = mine.filter((p) => p.progress.total > 0 && p.progress.percent === 100).length

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <title>Dashboard · LaunchLoop</title>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold sm:text-4xl">{firstName ? `Welcome back, ${firstName}` : 'Welcome back'}</h1>
          {focus ? (
            <p className="mt-2 text-muted-foreground">
              Next up on{' '}
              <Link to={`/projects/${focus.project.id}`} className="text-foreground underline decoration-border underline-offset-4 hover:decoration-loop">
                {focus.project.title}
              </Link>
              : {focus.milestone?.title}
            </p>
          ) : (
            <p className="mt-2 text-muted-foreground">Your projects live here.</p>
          )}
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus aria-hidden="true" />
          New project
        </Button>
      </header>

      {mine.length > 0 && (
        <dl className="mt-8 grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card">
          {[
            ['Projects', mine.length],
            ['Milestones done', milestonesDone],
            ['Loops closed', loopsClosed],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-4 sm:px-6">
              <dt className="text-xs text-muted-foreground sm:text-sm">{label}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</dd>
            </div>
          ))}
        </dl>
      )}

      <section aria-labelledby="mine-heading" className="mt-10">
        <h2 id="mine-heading" className="mb-4 text-xl font-semibold">
          Your projects
        </h2>
        {loading ? (
          <ProjectGrid>
            {[0, 1, 2].map((i) => (
              <ProjectCardSkeleton key={i} />
            ))}
          </ProjectGrid>
        ) : mine.length === 0 ? (
          <EmptyState
            className="rounded-2xl border border-dashed border-border"
            icon={<FolderPlus />}
            title="Start your first project"
            description="Add what you're building and what finished looks like. Then let AI break it into milestones, or write them yourself."
            action={{ label: 'New project', onClick: () => setCreating(true) }}
          />
        ) : (
          <ProjectGrid>
            {mine.map((p) => (
              <ProjectCard key={p.id} project={p} owner={people(p.ownerId)} />
            ))}
          </ProjectGrid>
        )}
      </section>

      {others.length > 0 && (
        <section aria-labelledby="community-heading" className="mt-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 id="community-heading" className="text-xl font-semibold">
              New in the community
            </h2>
            <Link to="/community" className="inline-flex items-center gap-1 text-sm text-loop hover:underline">
              Browse all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ProjectGrid>
            {others.map((p) => (
              <ProjectCard key={p.id} project={p} owner={people(p.ownerId)} />
            ))}
          </ProjectGrid>
        </section>
      )}

      <ProjectFormModal open={creating} onClose={() => setCreating(false)} />
    </div>
  )
}
