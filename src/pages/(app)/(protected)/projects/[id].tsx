import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAuth, useMutations, useQuery } from 'deepspace'
import { ArrowLeft, Eye, EyeOff, FolderX, Lock, Pencil, Trash2 } from 'lucide-react'
import { ProgressRing } from '../../../../components/brand/ProgressRing'
import { DiscussionPanel } from '../../../../components/projects/DiscussionPanel'
import { MilestonesPanel } from '../../../../components/projects/MilestonesPanel'
import { OwnerChip } from '../../../../components/projects/ProjectCard'
import { ProjectFormModal } from '../../../../components/projects/ProjectFormModal'
import { RoadmapPanel } from '../../../../components/projects/RoadmapPanel'
import { Button, ConfirmModal, EmptyState, Tabs, TabsContent, TabsList, TabsTrigger, useToast } from '../../../../components/ui'
import { callAction } from '../../../../lib/api'
import type { Milestone } from '../../../../lib/milestones'
import { toProjectView, type ProjectData } from '../../../../lib/projects'
import { fullDate } from '../../../../lib/time'
import { usePeople } from '../../../../lib/use-people'

type TabId = 'milestones' | 'roadmap' | 'discussion'

export default function ProjectPage() {
  const { id = '' } = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { userId } = useAuth()
  const people = usePeople()
  const { records, status } = useQuery<ProjectData>('projects')
  const { putConfirmed } = useMutations<ProjectData>('projects')

  const [editing, setEditing] = useState(false)
  const [confirm, setConfirm] = useState<'delete' | 'private' | null>(null)
  const [working, setWorking] = useState(false)

  const record = records.find((r) => r.recordId === id)

  if (status === 'loading') return <ProjectSkeleton />

  if (!record) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <title>Project not found · LaunchLoop</title>
        <EmptyState
          icon={<FolderX />}
          title={status === 'error' ? "Couldn't load this project" : 'Project not found'}
          description={
            status === 'error'
              ? 'Check your connection and reload the page.'
              : 'It may have been deleted, or it may be private to its owner.'
          }
          action={{ label: 'Browse the community', onClick: () => navigate('/community') }}
        />
      </div>
    )
  }

  const project = toProjectView(record)
  const isOwner = project.ownerId === userId
  const owner = people(project.ownerId)
  const isPublic = project.visibility === 'public'

  const tabs: TabId[] = isOwner ? ['milestones', 'roadmap', 'discussion'] : ['milestones', 'discussion']
  const requested = search.get('tab')
  const tab: TabId = tabs.find((t) => t === requested) ?? 'milestones'
  const setTab = (next: TabId) => setSearch(next === 'milestones' ? {} : { tab: next }, { replace: true })

  /** Saves to the project row. Only the owner's write is accepted by the server (update: 'own'). */
  async function save(patch: Partial<ProjectData>, failure: string): Promise<boolean> {
    try {
      await putConfirmed(id, patch)
      return true
    } catch (err) {
      toast.error(failure, err instanceof Error ? err.message : undefined)
      return false
    }
  }

  const saveMilestones = (next: Milestone[]) => save({ milestones: next }, 'Could not save milestones')

  async function changeVisibility(next: 'public' | 'private') {
    setWorking(true)
    const res = await callAction('setProjectVisibility', { projectId: id, visibility: next })
    setWorking(false)
    setConfirm(null)
    if (res.ok) toast.success(next === 'public' ? 'Project is now public' : 'Project is now private')
    else toast.error('Could not change visibility', res.error)
  }

  async function deleteProject() {
    setWorking(true)
    const res = await callAction('deleteProject', { projectId: id })
    setWorking(false)
    if (res.ok) {
      toast.success('Project deleted')
      navigate('/dashboard', { replace: true })
    } else {
      setConfirm(null)
      toast.error('Could not delete the project', res.error)
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-10">
      <title>{`${project.title} · LaunchLoop`}</title>

      <Link
        to={isOwner ? '/dashboard' : '/community'}
        className="inline-flex items-center gap-1.5 rounded-md text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {isOwner ? 'Dashboard' : 'Community'}
      </Link>

      <header className="mt-5 flex flex-col-reverse gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{project.category}</span>
            {!isPublic && (
              <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs">
                <Lock className="size-3" aria-hidden="true" />
                Private
              </span>
            )}
          </div>
          <h1 className="mt-1.5 break-words text-3xl font-semibold leading-tight sm:text-4xl">{project.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
            <OwnerChip person={owner} />
            <span className="text-xs text-muted-foreground" title={fullDate(project.createdAt)}>
              Started {fullDate(project.createdAt).replace(/,.*$/, '')}
            </span>
          </div>
          {project.goal && (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed">
              <span className="font-medium text-loop">Goal: </span>
              <span className="break-words text-foreground">{project.goal}</span>
            </p>
          )}
          {project.description && <p className="mt-3 max-w-2xl whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">{project.description}</p>}

          {isOwner && (
            <div className="mt-5 flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Pencil aria-hidden="true" />
                Edit
              </Button>
              {isPublic ? (
                <Button variant="outline" size="sm" onClick={() => setConfirm('private')} disabled={working}>
                  <EyeOff aria-hidden="true" />
                  Make private
                </Button>
              ) : (
                <Button variant="outline" size="sm" onClick={() => void changeVisibility('public')} loading={working}>
                  <Eye aria-hidden="true" />
                  Make public
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setConfirm('delete')} className="text-[#f87171] hover:text-[#f87171]">
                <Trash2 aria-hidden="true" />
                Delete
              </Button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4 sm:flex-col sm:items-center sm:gap-2">
          <ProgressRing percent={project.progress.percent} size={96} />
          <p className="text-sm text-muted-foreground sm:text-center">
            {project.progress.total === 0 ? 'No milestones yet' : `${project.progress.done} of ${project.progress.total} done`}
          </p>
        </div>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabId)} className="mt-10 gap-6">
        <TabsList className="h-10 w-full justify-start sm:w-fit">
          <TabsTrigger value="milestones" className="px-4">
            Milestones
          </TabsTrigger>
          {isOwner && (
            <TabsTrigger value="roadmap" className="px-4">
              AI roadmap
            </TabsTrigger>
          )}
          <TabsTrigger value="discussion" className="px-4">
            Discussion
          </TabsTrigger>
        </TabsList>

        <TabsContent value="milestones">
          <MilestonesPanel project={project} isOwner={isOwner} onSave={saveMilestones} onGenerate={() => setTab('roadmap')} />
        </TabsContent>

        {isOwner && (
          <TabsContent value="roadmap">
            <RoadmapPanel
              project={project}
              onSave={async ({ milestones, summary, startingPoint }) => {
                const ok = await save({ milestones, summary, startingPoint }, 'Could not save the roadmap')
                if (ok) toast.success('Roadmap saved to your project')
                return ok
              }}
              onDone={() => setTab('milestones')}
            />
          </TabsContent>
        )}

        <TabsContent value="discussion">
          {isPublic ? (
            <DiscussionPanel projectId={project.id} />
          ) : (
            <EmptyState
              className="rounded-2xl border border-dashed border-border"
              icon={<Lock />}
              title="Discussions are for public projects"
              description="Make this project public to open a discussion. Making it private again deletes the discussion."
              action={{ label: 'Make public', onClick: () => void changeVisibility('public') }}
            />
          )}
        </TabsContent>
      </Tabs>

      {isOwner && <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={project} />}

      <ConfirmModal
        open={confirm === 'private'}
        onClose={() => setConfirm(null)}
        title="Make this project private?"
        description="It will disappear from the community, and its discussion will be permanently deleted."
        confirmText="Make private"
        loading={working}
        onConfirm={() => void changeVisibility('private')}
      />
      <ConfirmModal
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        title="Delete this project?"
        description="The project, its milestones and its discussion will be permanently deleted. This can't be undone."
        confirmText="Delete project"
        loading={working}
        onConfirm={() => void deleteProject()}
      />
    </div>
  )
}

function ProjectSkeleton() {
  return (
    <div aria-busy="true" className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      <div className="mt-6 flex justify-between gap-6">
        <div className="w-full max-w-lg space-y-3">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-9 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-full animate-pulse rounded bg-muted" />
        </div>
        <div className="size-24 animate-pulse rounded-full bg-muted" />
      </div>
      <div className="mt-10 space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  )
}
