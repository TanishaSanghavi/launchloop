import { useEffect, useState, type FormEvent } from 'react'
import { ArrowDown, ArrowUp, Clock, Pencil, Plus, Sparkles, Trash2 } from 'lucide-react'
import { LIMITS } from '../../lib/limits'
import {
  addMilestone,
  canAddMilestones,
  editMilestone,
  isPriority,
  moveMilestone,
  nextMilestone,
  PRIORITIES,
  progressOf,
  removeMilestone,
  setMilestoneDone,
  type Milestone,
  type Priority,
} from '../../lib/milestones'
import type { ProjectView } from '../../lib/projects'
import { fullDate } from '../../lib/time'
import { cn } from '../../lib/utils'
import { Button, ConfirmModal, EmptyState, Input, Modal, Textarea } from '../ui'
import { Field } from '../ui/Field'
import { NativeSelect } from '../ui/NativeSelect'

const PRIORITY_STYLE: Record<Priority, { label: string; dot: string }> = {
  high: { label: 'High', dot: 'bg-[#f87171]' },
  medium: { label: 'Medium', dot: 'bg-[#fbbf24]' },
  low: { label: 'Low', dot: 'bg-[#94a3b8]' },
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const s = PRIORITY_STYLE[priority]
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
      <span className={cn('size-1.5 rounded-full', s.dot)} aria-hidden="true" />
      {s.label} priority
    </span>
  )
}

export function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="h-2 w-full overflow-hidden rounded-full bg-accent"
    >
      <div
        className={cn('h-full rounded-full transition-[width] duration-500', percent === 100 ? 'bg-success' : 'bg-loop')}
        style={{ width: `${percent}%` }}
      />
    </div>
  )
}

interface MilestonesPanelProps {
  project: ProjectView
  isOwner: boolean
  /** Persists the new list. Resolves true on success (the page shows the error toast otherwise). */
  onSave: (next: Milestone[]) => Promise<boolean>
  onGenerate: () => void
}

function sameMilestones(a: readonly Milestone[], b: readonly Milestone[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

export function MilestonesPanel({ project, isOwner, onSave, onGenerate }: MilestonesPanelProps) {
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState<Milestone | null>(null)
  const [deleting, setDeleting] = useState<Milestone | null>(null)
  // Optimistic copy: shown immediately while the write is in flight, dropped as
  // soon as the server's data catches up (or the write fails, which rolls back).
  const [pending, setPending] = useState<Milestone[] | null>(null)

  const serverMilestones = project.milestones
  useEffect(() => {
    if (pending && sameMilestones(pending, serverMilestones)) setPending(null)
  }, [pending, serverMilestones])

  const milestones = pending ?? serverMilestones
  const progress = pending ? progressOf(pending) : project.progress

  async function commit(next: Milestone[]) {
    setPending(next)
    setBusy(true)
    const ok = await onSave(next)
    setBusy(false)
    if (!ok) setPending(null)
    return ok
  }

  const next = nextMilestone(milestones)

  return (
    <div className="space-y-6">
      {(project.summary || project.startingPoint) && (
        <section aria-label="Project plan" className="rounded-2xl border border-border bg-card p-5">
          {project.summary && <p className="text-sm leading-relaxed text-foreground">{project.summary}</p>}
          {project.startingPoint && (
            <p className={cn('text-sm leading-relaxed', project.summary && 'mt-3 border-t border-border pt-3')}>
              <span className="font-medium text-loop">Start here: </span>
              <span className="text-muted-foreground">{project.startingPoint}</span>
            </p>
          )}
        </section>
      )}

      {progress.total > 0 && (
        <div>
          <div className="mb-2 flex items-baseline justify-between text-sm">
            <span className="font-medium">
              {progress.done} of {progress.total} complete
            </span>
            <span className="tabular-nums text-muted-foreground">{progress.percent}%</span>
          </div>
          <ProgressBar percent={progress.percent} label="Milestone progress" />
          {progress.percent === 100 ? (
            <p className="mt-3 text-sm font-medium text-success">Loop closed. Every milestone is done.</p>
          ) : (
            isOwner &&
            next && (
              <p className="mt-3 text-sm text-muted-foreground">
                Next up: <span className="text-foreground">{next.title}</span>
              </p>
            )
          )}
        </div>
      )}

      {milestones.length === 0 ? (
        isOwner ? (
          <EmptyState
            className="rounded-2xl border border-dashed border-border"
            icon={<Sparkles />}
            title="No milestones yet"
            description="Break the project into steps you can finish. Add them yourself below, or let AI draft a roadmap you can edit."
            action={{ label: 'Generate a roadmap', onClick: onGenerate }}
          />
        ) : (
          <EmptyState
            className="rounded-2xl border border-dashed border-border"
            icon={<Clock />}
            title="No milestones yet"
            description="The owner hasn't added milestones to this project."
          />
        )
      ) : (
        <ol className="space-y-2" aria-label="Milestones">
          {milestones.map((m, i) => (
            <li key={m.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-start gap-3">
                {isOwner ? (
                  <input
                    type="checkbox"
                    checked={m.done}
                    disabled={busy}
                    onChange={(e) => void commit(setMilestoneDone(milestones, m.id, e.target.checked))}
                    aria-label={`Mark "${m.title}" ${m.done ? 'not done' : 'done'}`}
                    className="mt-0.5 size-5 shrink-0 cursor-pointer accent-[var(--color-primary)] disabled:cursor-not-allowed"
                  />
                ) : (
                  <span
                    aria-label={m.done ? 'Done' : 'Not done'}
                    className={cn('mt-0.5 size-5 shrink-0 rounded-full border', m.done ? 'border-primary bg-primary' : 'border-input')}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className={cn('break-words font-medium', m.done && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{m.title}</p>
                  {m.details && <p className="mt-1 break-words text-sm text-muted-foreground">{m.details}</p>}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={m.priority} />
                    {m.estimate && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="size-3" aria-hidden="true" />
                        {m.estimate}
                      </span>
                    )}
                    {m.done && m.completedAt && <span className="text-xs text-muted-foreground">Done {fullDate(m.completedAt)}</span>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 items-center">
                    <IconButton label={`Move "${m.title}" up`} disabled={busy || i === 0} onClick={() => void commit(moveMilestone(milestones, m.id, -1))}>
                      <ArrowUp className="size-4" />
                    </IconButton>
                    <IconButton
                      label={`Move "${m.title}" down`}
                      disabled={busy || i === milestones.length - 1}
                      onClick={() => void commit(moveMilestone(milestones, m.id, 1))}
                    >
                      <ArrowDown className="size-4" />
                    </IconButton>
                    <IconButton label={`Edit "${m.title}"`} disabled={busy} onClick={() => setEditing(m)}>
                      <Pencil className="size-4" />
                    </IconButton>
                    <IconButton label={`Delete "${m.title}"`} disabled={busy} onClick={() => setDeleting(m)}>
                      <Trash2 className="size-4" />
                    </IconButton>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {isOwner && <AddMilestoneForm milestones={milestones} busy={busy} onAdd={(list) => commit(list)} />}

      {editing && (
        <EditMilestoneModal
          milestone={editing}
          onClose={() => setEditing(null)}
          onSave={async (patch) => {
            const ok = await commit(editMilestone(milestones, editing.id, patch))
            if (ok) setEditing(null)
          }}
        />
      )}

      <ConfirmModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete this milestone?"
        description={deleting ? `"${deleting.title}" will be removed from the project.` : undefined}
        confirmText="Delete milestone"
        loading={busy}
        onConfirm={async () => {
          if (!deleting) return
          const ok = await commit(removeMilestone(milestones, deleting.id))
          if (ok) setDeleting(null)
        }}
      />
    </div>
  )
}

function IconButton({ label, children, ...props }: { label: string; children: React.ReactNode } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  )
}

function AddMilestoneForm({ milestones, busy, onAdd }: { milestones: Milestone[]; busy: boolean; onAdd: (next: Milestone[]) => Promise<boolean> }) {
  const [title, setTitle] = useState('')
  const [more, setMore] = useState(false)
  const [priority, setPriority] = useState<Priority>('medium')
  const [estimate, setEstimate] = useState('')
  const [details, setDetails] = useState('')
  const full = !canAddMilestones(milestones)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim() || full) return
    const ok = await onAdd(addMilestone(milestones, { title, priority, estimate, details }))
    if (ok) {
      setTitle('')
      setEstimate('')
      setDetails('')
      setPriority('medium')
    }
  }

  if (full) {
    return <p className="text-sm text-muted-foreground">You&apos;ve reached the limit of {LIMITS.maxMilestones} milestones. Finish or delete some to add more.</p>
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-dashed border-border p-4">
      <label htmlFor="new-milestone" className="sr-only">
        New milestone title
      </label>
      <div className="flex gap-2">
        <Input
          id="new-milestone"
          value={title}
          maxLength={LIMITS.milestoneTitle}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Add a milestone, for example “Build the sign-up page”"
          disabled={busy}
        />
        <Button type="submit" disabled={!title.trim() || busy} loading={busy}>
          <Plus aria-hidden="true" />
          Add
        </Button>
      </div>
      <button
        type="button"
        onClick={() => setMore((v) => !v)}
        aria-expanded={more}
        className="mt-3 text-xs font-medium text-loop hover:underline focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {more ? 'Fewer options' : 'Priority, estimate and details'}
      </button>
      {more && (
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Field label="Priority" htmlFor="new-milestone-priority">
            <NativeSelect
              id="new-milestone-priority"
              value={priority}
              onChange={(e) => {
                if (isPriority(e.target.value)) setPriority(e.target.value)
              }}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_STYLE[p].label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Estimate" htmlFor="new-milestone-estimate">
            <Input id="new-milestone-estimate" value={estimate} maxLength={LIMITS.estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="3 days" />
          </Field>
          <Field label="Details" htmlFor="new-milestone-details" className="sm:col-span-2" counter={`${details.length}/${LIMITS.milestoneDetails}`}>
            <Textarea
              id="new-milestone-details"
              value={details}
              maxLength={LIMITS.milestoneDetails}
              rows={2}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="What does done look like?"
            />
          </Field>
        </div>
      )}
    </form>
  )
}

function EditMilestoneModal({
  milestone,
  onClose,
  onSave,
}: {
  milestone: Milestone
  onClose: () => void
  onSave: (patch: { title: string; details: string; priority: Priority; estimate: string }) => Promise<void>
}) {
  const [title, setTitle] = useState(milestone.title)
  const [details, setDetails] = useState(milestone.details)
  const [priority, setPriority] = useState<Priority>(milestone.priority)
  const [estimate, setEstimate] = useState(milestone.estimate)
  const [saving, setSaving] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    await onSave({ title, details, priority, estimate })
    setSaving(false)
  }

  return (
    <Modal open onClose={onClose}>
      <Modal.Header>
        <Modal.Title>Edit milestone</Modal.Title>
      </Modal.Header>
      <form onSubmit={submit}>
        <Modal.Body className="space-y-4">
          <Field label="Title" htmlFor="edit-milestone-title" counter={`${title.length}/${LIMITS.milestoneTitle}`}>
            <Input id="edit-milestone-title" value={title} maxLength={LIMITS.milestoneTitle} onChange={(e) => setTitle(e.target.value)} autoFocus />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Priority" htmlFor="edit-milestone-priority">
              <NativeSelect
                id="edit-milestone-priority"
                value={priority}
                onChange={(e) => {
                  if (isPriority(e.target.value)) setPriority(e.target.value)
                }}
              >
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_STYLE[p].label}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Estimate" htmlFor="edit-milestone-estimate">
              <Input id="edit-milestone-estimate" value={estimate} maxLength={LIMITS.estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="3 days" />
            </Field>
          </div>
          <Field label="Details" htmlFor="edit-milestone-details" counter={`${details.length}/${LIMITS.milestoneDetails}`}>
            <Textarea id="edit-milestone-details" value={details} maxLength={LIMITS.milestoneDetails} rows={3} onChange={(e) => setDetails(e.target.value)} />
          </Field>
        </Modal.Body>
        <Modal.Footer>
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" loading={saving} disabled={!title.trim()}>
            Save milestone
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
