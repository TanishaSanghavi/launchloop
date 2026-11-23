import type { ActionHandler } from 'deepspace/worker'
import type { Env } from '../../worker'
import { createGenerateRoadmap, deleteProject, setProjectVisibility } from './project-actions'

/**
 * Exposed by the scaffold's route at POST /api/actions/:name, which verifies the
 * caller's JWT first. Actions run with RBAC off — see project-actions.ts.
 */
export const actions: Record<string, ActionHandler<Env>> = {
  generateRoadmap: createGenerateRoadmap(),
  setProjectVisibility,
  deleteProject,
}
