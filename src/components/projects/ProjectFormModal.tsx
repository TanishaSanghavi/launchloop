import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutations } from 'deepspace'
import { CATEGORIES, isCategory, type Category, type Visibility } from '../../lib/categories'
import { LIMITS } from '../../lib/limits'
import type { ProjectData, ProjectView } from '../../lib/projects'
import { Button, Input, Modal, Textarea, useToast } from '../ui'
import { Field } from '../ui/Field'
import { NativeSelect } from '../ui/NativeSelect'

interface ProjectFormModalProps {
  open: boolean
  onClose: () => void
  /** Omit to create a new project; pass a project to edit it. */
  project?: ProjectView
}

export function ProjectFormModal({ open, onClose, project }: ProjectFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <Modal.Header>
        <Modal.Title>{project ? 'Edit project' : 'New project'}</Modal.Title>
        <Modal.Description>
          {project ? 'Update the details people see on your project page.' : 'Tell people what you are building and what finished looks like.'}
        </Modal.Description>
      </Modal.Header>
      {/* Mounted only while open, so every open starts from fresh state. */}
      <ProjectForm project={project} onClose={onClose} />
    </Modal>
  )
}

function ProjectForm({ project, onClose }: { project?: ProjectView; onClose: () => void }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { createConfirmed, putConfirmed, ready } = useMutations<ProjectData>('projects')

  const [title, setTitle] = useState(project?.title ?? '')
  const [category, setCategory] = useState<Category>(project?.category ?? 'Web app')
  const [goal, setGoal] = useState(project?.goal ?? '')
  const [description, setDescription] = useState(project?.description ?? '')
  const [visibility, setVisibility] = useState<Visibility>('public')
  const [titleError, setTitleError] = useState('')
  const [saving, setSaving] = useState<'create' | 'plan' | 'edit' | null>(null)

  async function submit(intent: 'create' | 'plan' | 'edit') {
    if (!title.trim()) {
      setTitleError('Give your project a title.')
      document.getElementById('project-title')?.focus()
      return
    }
    setTitleError('')
    setSaving(intent)
    const values = {
      title: title.trim(),
      category,
      goal: goal.trim(),
      description: description.trim(),
    }
    try {
      if (project) {
        await putConfirmed(project.id, values)
        toast.success('Project updated')
        onClose()
      } else {
        const id = await createConfirmed({ ...values, visibility, summary: '', startingPoint: '', milestones: [] })
        toast.success('Project created')
        onClose()
        navigate(intent === 'plan' ? `/projects/${id}?tab=roadmap` : `/projects/${id}`)
      }
    } catch (err) {
      toast.error(project ? 'Could not save changes' : 'Could not create the project', err instanceof Error ? err.message : undefined)
      setSaving(null)
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    void submit(project ? 'edit' : 'create')
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <Modal.Body className="space-y-5">
        <Field label="Title" htmlFor="project-title" error={titleError} counter={`${title.length}/${LIMITS.title}`}>
          <Input
            id="project-title"
            value={title}
            maxLength={LIMITS.title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Campus carpool app"
            aria-invalid={!!titleError}
            aria-describedby={titleError ? 'project-title-error' : undefined}
            autoFocus
          />
        </Field>

        <Field label="Category" htmlFor="project-category">
          <NativeSelect
            id="project-category"
            value={category}
            onChange={(e) => {
              if (isCategory(e.target.value)) setCategory(e.target.value)
            }}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </NativeSelect>
        </Field>

        <Field
          label="Goal"
          htmlFor="project-goal"
          hint="What does finished look like?"
          counter={`${goal.length}/${LIMITS.goal}`}
          counterWarn={goal.length > LIMITS.goal * 0.9}
        >
          <Input
            id="project-goal"
            value={goal}
            maxLength={LIMITS.goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder="Ten students use it to share rides for a full week"
            aria-describedby="project-goal-hint"
          />
        </Field>

        <Field
          label="Description"
          htmlFor="project-description"
          counter={`${description.length}/${LIMITS.description}`}
          counterWarn={description.length > LIMITS.description * 0.9}
        >
          <Textarea
            id="project-description"
            value={description}
            maxLength={LIMITS.description}
            rows={5}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Who is it for, what problem does it solve, and what have you decided so far?"
          />
        </Field>

        {!project && (
          <fieldset>
            <legend className="mb-1.5 text-sm font-medium">Who can see it?</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(
                [
                  ['public', 'Public', 'Listed in the community. Other builders can follow it and join the discussion.'],
                  ['private', 'Private', 'Only you can see it. Discussions are off.'],
                ] as const
              ).map(([value, label, help]) => (
                <label
                  key={value}
                  className="flex cursor-pointer gap-3 rounded-xl border border-input p-3 transition-colors has-[:checked]:border-primary has-[:checked]:bg-accent/60 has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-ring/50"
                >
                  <input
                    type="radio"
                    name="visibility"
                    value={value}
                    checked={visibility === value}
                    onChange={() => setVisibility(value)}
                    className="mt-1 accent-[var(--color-primary)]"
                  />
                  <span>
                    <span className="block text-sm font-medium">{label}</span>
                    <span className="block text-xs text-muted-foreground">{help}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button type="button" variant="ghost" onClick={onClose} disabled={saving !== null}>
          Cancel
        </Button>
        {!project && (
          <Button type="button" variant="outline" onClick={() => void submit('plan')} loading={saving === 'plan'} disabled={!ready || saving !== null}>
            Create and plan with AI
          </Button>
        )}
        <Button type="submit" loading={saving === 'create' || saving === 'edit'} disabled={!ready || saving !== null}>
          {project ? 'Save changes' : 'Create project'}
        </Button>
      </Modal.Footer>
    </form>
  )
}
