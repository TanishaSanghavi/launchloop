import { useState, type FormEvent } from 'react'
import { AlertCircle, Clock, Sparkles } from 'lucide-react'
import { callAction } from '../../lib/api'
import { LIMITS } from '../../lib/limits'
import { appendMilestones, canAddMilestones, type Milestone } from '../../lib/milestones'
import type { ProjectView } from '../../lib/projects'
import {
  EXPERIENCE_LEVELS,
  roadmapMilestonesToDrafts,
  TIMELINES,
  type ExperienceLevel,
  type Roadmap,
  type Timeline,
} from '../../lib/roadmap'
import { cn } from '../../lib/utils'
import { Button, Input, Textarea } from '../ui'
import { Field } from '../ui/Field'
import { NativeSelect } from '../ui/NativeSelect'
import { PriorityBadge } from './MilestonesPanel'

interface RoadmapPanelProps {
  project: ProjectView
  /** Saves the approved roadmap onto the project. Resolves true on success. */
  onSave: (data: { milestones: Milestone[]; summary: string; startingPoint: string }) => Promise<boolean>
  /** Called after a successful save (the page switches to the Milestones tab). */
  onDone: () => void
}

type Phase = 'form' | 'loading' | 'review'

/**
 * AI roadmap generator. The flow is deliberately three steps — describe, review,
 * save — and nothing is written to the project until the person approves.
 * Generation happens in a server action (actions/project-actions.ts): the browser
 * never talks to the model or holds any key.
 */
export function RoadmapPanel({ project, onSave, onDone }: RoadmapPanelProps) {
  const [phase, setPhase] = useState<Phase>('form')
  const [description, setDescription] = useState(project.description || project.goal)
  const [timeline, setTimeline] = useState<Timeline>('1 month')
  const [experience, setExperience] = useState<ExperienceLevel>('Intermediate')
  const [error, setError] = useState<string | null>(null)

  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [selected, setSelected] = useState<boolean[]>([])
  const [titles, setTitles] = useState<string[]>([])
  const [mode, setMode] = useState<'append' | 'replace'>('append')
  const [saving, setSaving] = useState(false)

  const trimmedLength = description.trim().length
  const tooShort = trimmedLength < LIMITS.roadmapDescriptionMin

  async function generate(e?: FormEvent) {
    e?.preventDefault()
    if (tooShort) return
    setPhase('loading')
    setError(null)
    const res = await callAction<{ roadmap: Roadmap }>('generateRoadmap', {
      description: description.trim(),
      title: project.title,
      timeline,
      experience,
    })
    if (!res.ok) {
      setError(res.error)
      setPhase('form')
      return
    }
    setRoadmap(res.data.roadmap)
    setSelected(res.data.roadmap.milestones.map(() => true))
    setTitles(res.data.roadmap.milestones.map((m) => m.title))
    setPhase('review')
  }

  function discard() {
    setRoadmap(null)
    setPhase('form')
    setError(null)
  }

  if (phase === 'loading') {
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-border bg-card p-6">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Sparkles className="size-4 animate-pulse text-loop" aria-hidden="true" />
          Generating your roadmap…
        </p>
        <div className="mt-5 space-y-3" aria-hidden="true">
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (phase === 'review' && roadmap) {
    const chosen = roadmap.milestones
      .map((m, i) => ({ ...m, title: titles[i] ?? m.title }))
      .filter((_, i) => selected[i])
      .filter((m) => m.title.trim())
    const base = mode === 'replace' ? [] : project.milestones
    const fits = canAddMilestones(base, chosen.length)
    const room = Math.max(0, LIMITS.maxMilestones - base.length)

    async function save() {
      if (!roadmap) return
      setSaving(true)
      const ok = await onSave({
        milestones: appendMilestones(base, roadmapMilestonesToDrafts(chosen)),
        summary: roadmap.summary,
        startingPoint: roadmap.startingPoint,
      })
      setSaving(false)
      if (ok) onDone()
    }

    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold">Review your roadmap</h2>
          <p className="mt-1 text-sm text-muted-foreground">Nothing is saved yet. Edit titles, untick what you don&apos;t want, then save.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-5" aria-label="Generated summary">
          <p className="text-sm leading-relaxed">{roadmap.summary}</p>
          <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed">
            <span className="font-medium text-loop">Start here: </span>
            <span className="text-muted-foreground">{roadmap.startingPoint}</span>
          </p>
        </section>

        <ol className="space-y-2" aria-label="Generated milestones">
          {roadmap.milestones.map((m, i) => (
            <li key={i} className={cn('rounded-xl border bg-card p-4 transition-opacity', selected[i] ? 'border-border' : 'border-border opacity-50')}>
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={!!selected[i]}
                  onChange={(e) => setSelected((prev) => prev.map((v, j) => (j === i ? e.target.checked : v)))}
                  aria-label={`Include milestone ${i + 1}`}
                  className="mt-2.5 size-5 shrink-0 cursor-pointer accent-[var(--color-primary)]"
                />
                <div className="min-w-0 flex-1">
                  <Input
                    value={titles[i] ?? ''}
                    maxLength={LIMITS.milestoneTitle}
                    onChange={(e) => setTitles((prev) => prev.map((v, j) => (j === i ? e.target.value : v)))}
                    aria-label={`Milestone ${i + 1} title`}
                    className="font-medium"
                  />
                  {m.details && <p className="mt-2 text-sm text-muted-foreground">{m.details}</p>}
                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    <PriorityBadge priority={m.priority} />
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="size-3" aria-hidden="true" />
                      {m.estimate}
                    </span>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>

        {project.milestones.length > 0 && (
          <fieldset className="rounded-xl border border-border p-4">
            <legend className="px-1 text-sm font-medium">This project already has {project.milestones.length} milestones</legend>
            <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="roadmap-mode" checked={mode === 'append'} onChange={() => setMode('append')} className="accent-[var(--color-primary)]" />
                Add to the existing milestones
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <input type="radio" name="roadmap-mode" checked={mode === 'replace'} onChange={() => setMode('replace')} className="accent-[var(--color-primary)]" />
                Replace them
              </label>
            </div>
            {mode === 'replace' && <p className="mt-2 text-xs text-warning">Replacing removes your current milestones and their progress.</p>}
          </fieldset>
        )}

        {!fits && (
          <p className="text-sm text-warning" role="alert">
            A project can hold {LIMITS.maxMilestones} milestones, so only the first {room} selected will be added.
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void save()} loading={saving} disabled={chosen.length === 0 || room === 0}>
            Save {chosen.length} {chosen.length === 1 ? 'milestone' : 'milestones'} to project
          </Button>
          <Button variant="outline" onClick={() => void generate()} disabled={saving}>
            Regenerate
          </Button>
          <Button variant="ghost" onClick={discard} disabled={saving}>
            Discard
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={generate} className="space-y-5" noValidate>
      <div>
        <h2 className="text-lg font-semibold">Generate a roadmap with AI</h2>
        <p className="mt-1 max-w-xl text-sm text-muted-foreground">
          Describe what you want to build. You&apos;ll get a short summary, three to five milestones with priorities and estimates, and a place to start. You review everything
          before it&apos;s saved.
        </p>
      </div>

      {error && (
        <div role="alert" className="flex gap-3 rounded-xl border border-[#dc2626]/40 bg-[#dc2626]/10 p-3 text-sm">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-[#f87171]" aria-hidden="true" />
          <p>{error}</p>
        </div>
      )}

      <Field
        label="Project description"
        htmlFor="roadmap-description"
        hint={tooShort ? `Add a little more detail (at least ${LIMITS.roadmapDescriptionMin} characters).` : undefined}
        counter={`${description.length}/${LIMITS.description}`}
        counterWarn={description.length > LIMITS.description * 0.9}
      >
        <Textarea
          id="roadmap-description"
          value={description}
          maxLength={LIMITS.description}
          rows={6}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="A web app where students on one campus can offer and request rides. Riders see who is driving and when. I've used React before but never built auth."
          aria-describedby={tooShort ? 'roadmap-description-hint' : undefined}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target timeline" htmlFor="roadmap-timeline">
          <NativeSelect
            id="roadmap-timeline"
            value={timeline}
            onChange={(e) => {
              const v = TIMELINES.find((t) => t === e.target.value)
              if (v) setTimeline(v)
            }}
          >
            {TIMELINES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Your experience" htmlFor="roadmap-experience">
          <NativeSelect
            id="roadmap-experience"
            value={experience}
            onChange={(e) => {
              const v = EXPERIENCE_LEVELS.find((x) => x === e.target.value)
              if (v) setExperience(v)
            }}
          >
            {EXPERIENCE_LEVELS.map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </NativeSelect>
        </Field>
      </div>

      <Button type="submit" disabled={tooShort}>
        <Sparkles aria-hidden="true" />
        Generate roadmap
      </Button>
    </form>
  )
}
