import { Link } from 'react-router-dom'
import { Lock } from 'lucide-react'
import type { ProjectView } from '../../lib/projects'
import type { Person } from '../../lib/use-people'
import { ProgressRing } from '../brand/ProgressRing'
import { Avatar, AvatarFallback, AvatarImage } from '../ui'

export function OwnerChip({ person }: { person: Person }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="h-6 w-6 text-[10px]">
        <AvatarImage src={person.imageUrl} referrerPolicy="no-referrer" />
        <AvatarFallback>{(person.name[0] ?? '?').toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate text-xs text-muted-foreground">{person.label}</span>
    </span>
  )
}

export function ProjectCard({ project, owner }: { project: ProjectView; owner: Person }) {
  const { progress } = project
  return (
    <Link
      to={`/projects/${project.id}`}
      className="group flex h-full flex-col rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/60 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{project.category}</span>
            {project.visibility === 'private' && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-px">
                <Lock className="size-3" aria-hidden="true" />
                Private
              </span>
            )}
          </div>
          <h3 className="mt-1.5 line-clamp-2 break-words text-lg font-semibold leading-snug">{project.title}</h3>
        </div>
        <ProgressRing percent={progress.percent} size={48} stroke={5} showValue={false} />
      </div>

      <p className="mt-2 line-clamp-2 break-words text-sm leading-relaxed text-muted-foreground">
        {project.description || project.goal || 'No description yet.'}
      </p>

      <div className="mt-auto flex items-center justify-between gap-3 pt-5">
        <OwnerChip person={owner} />
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
          {progress.total === 0 ? 'No milestones yet' : `${progress.done}/${progress.total} milestones · ${progress.percent}%`}
        </span>
      </div>
    </Link>
  )
}

export function ProjectCardSkeleton() {
  return (
    <div aria-hidden="true" className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="w-2/3 space-y-2">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-5 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="size-12 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-3 w-full animate-pulse rounded bg-muted" />
        <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
      </div>
      <div className="mt-6 h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  )
}

export function ProjectGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}
