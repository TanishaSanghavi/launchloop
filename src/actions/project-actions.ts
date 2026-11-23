/**
 * Server actions. These run with RBAC OFF (see src/server/action-routes.ts), so
 * every action that touches a record by id must verify ownership itself — the
 * `loadOwnedProject` helper below is that check, and it is unit-tested.
 *
 * Why these three are actions and not plain client mutations:
 *   - generateRoadmap: spends AI credits and must be rate-limited server-side.
 *   - setProjectVisibility / deleteProject: must also delete the project's
 *     discussion messages, which belong to OTHER users and so cannot be removed
 *     by the owner's own permissions.
 */

import { createDeepSpaceAI, DEEPSPACE_AI_DEFAULTS, getDeepSpaceAIModel, RECORD_NOT_FOUND } from 'deepspace/worker'
import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { LanguageModel } from 'ai'
import type { Env } from '../../worker'
import { isVisibility } from '../lib/categories'
import { ROADMAP_BILLING, ROADMAP_MODEL_ID, ROADMAP_RATE_LIMIT } from './config'
import { consumeQuota, type UsageRow } from './rate-limit'
import { generateRoadmapWithModel, parseRoadmapInput, RoadmapError } from './roadmap-generator'

const NOT_OWNER = 'Project not found, or you are not its owner.'
const MAX_ID_LENGTH = 100
const DRAIN_PAGE = 100
const DRAIN_MAX_PAGES = 100

type Failure = { ok: false; error: string; code: string }

// ---------------------------------------------------------------------------
// Ownership
// ---------------------------------------------------------------------------

/** Loads a project and confirms `userId` created it. Not-found and not-owner are indistinguishable on purpose. */
export async function loadOwnedProject(
  tools: ActionTools,
  userId: string,
  projectId: unknown,
): Promise<{ ok: true; projectId: string } | Failure> {
  if (typeof projectId !== 'string' || !projectId || projectId.length > MAX_ID_LENGTH) {
    return { ok: false, error: 'A project id is required.', code: 'invalid_input' }
  }
  const got = await tools.get('projects', projectId)
  if (!got.success) {
    if (got.error === RECORD_NOT_FOUND) return { ok: false, error: NOT_OWNER, code: 'forbidden' }
    return { ok: false, error: 'Could not load the project. Try again.', code: 'unavailable' }
  }
  if (got.data.record.createdBy !== userId) return { ok: false, error: NOT_OWNER, code: 'forbidden' }
  return { ok: true, projectId }
}

/** Deletes every discussion message for a project, one bounded page at a time. */
export async function drainMessages(
  tools: ActionTools,
  projectId: string,
): Promise<{ ok: true; deleted: number } | Failure> {
  let total = 0
  for (let page = 0; page < DRAIN_MAX_PAGES; page++) {
    const res = await tools.deleteWhere('messages', { channelId: projectId }, DRAIN_PAGE)
    if (!res.success) return { ok: false, error: 'Could not clear the discussion. Try again.', code: 'unavailable' }
    total += res.data.deleted
    if (res.data.deleted < DRAIN_PAGE) return { ok: true, deleted: total }
  }
  return { ok: false, error: 'The discussion is too large to clear in one go. Try again.', code: 'unavailable' }
}

// ---------------------------------------------------------------------------
// setProjectVisibility
// ---------------------------------------------------------------------------

export const setProjectVisibility: ActionHandler<Env> = async ({ userId, params, tools }) => {
  if (!isVisibility(params.visibility)) {
    return { success: false, error: 'Visibility must be "public" or "private".', code: 'invalid_input' }
  }
  const owned = await loadOwnedProject(tools, userId, params.projectId)
  if (!owned.ok) return { success: false, error: owned.error, code: owned.code }

  // Messages are readable by every signed-in member, so a project that goes
  // private must not leave its discussion behind.
  if (params.visibility === 'private') {
    const drained = await drainMessages(tools, owned.projectId)
    if (!drained.ok) return { success: false, error: drained.error, code: drained.code }
  }

  const updated = await tools.update('projects', owned.projectId, { visibility: params.visibility })
  if (!updated.success) return { success: false, error: 'Could not update the project. Try again.', code: 'unavailable' }
  return { success: true, data: { projectId: owned.projectId, visibility: params.visibility } }
}

// ---------------------------------------------------------------------------
// deleteProject
// ---------------------------------------------------------------------------

export const deleteProject: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const owned = await loadOwnedProject(tools, userId, params.projectId)
  if (!owned.ok) return { success: false, error: owned.error, code: owned.code }

  // Messages first, project last: if clearing fails midway the project still
  // exists and the owner can simply retry.
  const drained = await drainMessages(tools, owned.projectId)
  if (!drained.ok) return { success: false, error: drained.error, code: drained.code }

  const removed = await tools.remove('projects', owned.projectId)
  if (!removed.success) return { success: false, error: 'Could not delete the project. Try again.', code: 'unavailable' }
  return { success: true, data: { projectId: owned.projectId, messagesDeleted: drained.deleted } }
}

// ---------------------------------------------------------------------------
// generateRoadmap
// ---------------------------------------------------------------------------

export interface RoadmapDeps {
  makeModel: (env: Env, callerJwt: string) => LanguageModel
  now: () => number
}

export function defaultMakeModel(env: Env, callerJwt: string): LanguageModel {
  const meta = getDeepSpaceAIModel(ROADMAP_MODEL_ID) ?? getDeepSpaceAIModel(DEEPSPACE_AI_DEFAULTS.directGeneration)
  if (!meta) throw new Error('No AI model is available')
  const provider = createDeepSpaceAI(env, meta.provider, ROADMAP_BILLING === 'user' ? { authToken: callerJwt } : undefined)
  return provider(meta.id)
}

/** Reserves one slot in the caller's hourly quota. Fails closed if the counter can't be read or written. */
export async function takeQuota(
  tools: ActionTools,
  userId: string,
  now: number,
): Promise<{ ok: true } | Failure | { ok: false; error: string; code: 'rate_limited' }> {
  const got = await tools.get<Record<string, unknown>>('ai_usage', userId)
  let row: Partial<UsageRow> | null = null
  if (got.success) {
    row = got.data.record.data as Partial<UsageRow>
  } else if (got.error !== RECORD_NOT_FOUND) {
    return { ok: false, error: 'Roadmap generation is temporarily unavailable.', code: 'unavailable' }
  }

  const decision = consumeQuota(row, now, ROADMAP_RATE_LIMIT.max, ROADMAP_RATE_LIMIT.windowMs)
  if (!decision.allowed) {
    const minutes = Math.ceil(decision.retryAfterSec / 60)
    return {
      ok: false,
      error: `You've reached the limit of ${ROADMAP_RATE_LIMIT.max} roadmaps per hour. Try again in about ${minutes} minute${minutes === 1 ? '' : 's'}.`,
      code: 'rate_limited',
    }
  }
  const saved = await tools.create('ai_usage', decision.next as unknown as Record<string, unknown>, userId)
  if (!saved.success) return { ok: false, error: 'Roadmap generation is temporarily unavailable.', code: 'unavailable' }
  return { ok: true }
}

export function createGenerateRoadmap(
  deps: RoadmapDeps = { makeModel: defaultMakeModel, now: () => Date.now() },
): ActionHandler<Env> {
  return async ({ userId, params, tools, env, callerJwt }) => {
    const input = parseRoadmapInput(params)
    if (!input.ok) return { success: false, error: input.error, code: 'invalid_input' }

    const quota = await takeQuota(tools, userId, deps.now())
    if (!quota.ok) return { success: false, error: quota.error, code: quota.code }

    try {
      const roadmap = await generateRoadmapWithModel(deps.makeModel(env, callerJwt), input.value)
      return { success: true, data: { roadmap } }
    } catch (err) {
      if (err instanceof RoadmapError) return { success: false, error: err.message, code: err.code }
      console.error('[roadmap] unexpected failure:', err instanceof Error ? err.message : String(err))
      return { success: false, error: "Couldn't generate a roadmap. Try again in a moment.", code: 'model_error' }
    }
  }
}
