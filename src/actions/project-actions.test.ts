import { describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import type { ActionContext } from 'deepspace/worker'
import type { Env } from '../../worker'
import { createFakeTools } from '../test/fake-tools'
import {
  createGenerateRoadmap,
  deleteProject,
  drainMessages,
  loadOwnedProject,
  setProjectVisibility,
} from './project-actions'
import { ROADMAP_RATE_LIMIT } from './config'

const ALICE = 'user_alice'
const BOB = 'user_bob'

function ctx(tools: ActionContext<Env>['tools'], userId: string, params: Record<string, unknown>): ActionContext<Env> {
  return { userId, params, tools, env: {} as Env, callerJwt: 'jwt' }
}

function seedProjects() {
  return createFakeTools({
    projects: {
      p_public: { createdBy: ALICE, data: { title: 'Alice public', visibility: 'public' } },
      p_private: { createdBy: ALICE, data: { title: 'Alice private', visibility: 'private' } },
    },
    messages: {
      m1: { createdBy: BOB, data: { channelId: 'p_public', content: 'hi' } },
      m2: { createdBy: ALICE, data: { channelId: 'p_public', content: 'hello' } },
      m3: { createdBy: BOB, data: { channelId: 'p_other', content: 'unrelated' } },
    },
  })
}

describe('loadOwnedProject (the ownership gate)', () => {
  it('lets the creator through', async () => {
    const f = seedProjects()
    expect(await loadOwnedProject(f.tools, ALICE, 'p_public')).toEqual({ ok: true, projectId: 'p_public' })
  })
  it('refuses another user, and a missing project, with the SAME message (no id probing)', async () => {
    const f = seedProjects()
    const notOwner = await loadOwnedProject(f.tools, BOB, 'p_public')
    const missing = await loadOwnedProject(f.tools, BOB, 'p_does_not_exist')
    expect(notOwner.ok).toBe(false)
    expect(missing.ok).toBe(false)
    if (!notOwner.ok && !missing.ok) expect(notOwner.error).toBe(missing.error)
  })
  it('rejects malformed ids before touching the database', async () => {
    const f = seedProjects()
    for (const bad of [undefined, null, 5, '', 'x'.repeat(101), {}]) {
      expect((await loadOwnedProject(f.tools, ALICE, bad)).ok).toBe(false)
    }
    expect(f.calls).toEqual([])
  })
  it('does not treat a storage failure as "not owner"', async () => {
    const f = seedProjects()
    f.failNext('get', 'storage exploded')
    const r = await loadOwnedProject(f.tools, ALICE, 'p_public')
    expect(r).toMatchObject({ ok: false, code: 'unavailable' })
  })
})

describe('deleteProject', () => {
  it("lets the owner delete, and also removes that project's messages (including other people's)", async () => {
    const f = seedProjects()
    const res = await deleteProject(ctx(f.tools, ALICE, { projectId: 'p_public' }))
    expect(res).toMatchObject({ success: true, data: { messagesDeleted: 2 } })
    expect(f.db.projects.p_public).toBeUndefined()
    expect(Object.keys(f.db.messages)).toEqual(['m3'])
  })
  it("refuses a non-owner and changes nothing", async () => {
    const f = seedProjects()
    const res = await deleteProject(ctx(f.tools, BOB, { projectId: 'p_public' }))
    expect(res.success).toBe(false)
    expect(f.db.projects.p_public).toBeDefined()
    expect(f.count('messages')).toBe(3)
  })
  it('keeps the project if clearing messages fails, so the owner can retry', async () => {
    const f = seedProjects()
    f.failNext('deleteWhere')
    const res = await deleteProject(ctx(f.tools, ALICE, { projectId: 'p_public' }))
    expect(res.success).toBe(false)
    expect(f.db.projects.p_public).toBeDefined()
  })
})

describe('setProjectVisibility', () => {
  it('clears the discussion when a project goes private', async () => {
    const f = seedProjects()
    const res = await setProjectVisibility(ctx(f.tools, ALICE, { projectId: 'p_public', visibility: 'private' }))
    expect(res.success).toBe(true)
    expect(f.db.projects.p_public.data.visibility).toBe('private')
    expect(Object.keys(f.db.messages)).toEqual(['m3'])
  })
  it('keeps messages when a project goes public', async () => {
    const f = seedProjects()
    const res = await setProjectVisibility(ctx(f.tools, ALICE, { projectId: 'p_private', visibility: 'public' }))
    expect(res.success).toBe(true)
    expect(f.db.projects.p_private.data.visibility).toBe('public')
    expect(f.count('messages')).toBe(3)
  })
  it('refuses non-owners and invalid visibility values', async () => {
    const f = seedProjects()
    expect((await setProjectVisibility(ctx(f.tools, BOB, { projectId: 'p_public', visibility: 'private' }))).success).toBe(false)
    expect((await setProjectVisibility(ctx(f.tools, ALICE, { projectId: 'p_public', visibility: 'secret' }))).success).toBe(false)
    expect(f.db.projects.p_public.data.visibility).toBe('public')
  })
})

describe('drainMessages', () => {
  it('pages through more than one batch', async () => {
    const messages: Record<string, { createdBy: string; data: Record<string, unknown> }> = {}
    for (let i = 0; i < 250; i++) messages[`m${i}`] = { createdBy: BOB, data: { channelId: 'p1' } }
    const f = createFakeTools({ messages })
    const r = await drainMessages(f.tools, 'p1')
    expect(r).toEqual({ ok: true, deleted: 250 })
    expect(f.count('messages')).toBe(0)
  })
})

// ---------------------------------------------------------------------------

const good = JSON.stringify({
  summary: 'A carpool app for students.',
  startingPoint: 'Sketch the ride request screen today.',
  milestones: [
    { title: 'Paper prototype', details: '', priority: 'high', estimate: '2 days' },
    { title: 'Ride form', details: '', priority: 'high', estimate: '1 week' },
    { title: 'Matching', details: '', priority: 'medium', estimate: '1 week' },
  ],
})

function modelFor(replies: string[]) {
  let calls = 0
  const model = new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: 'text', text: replies[Math.min(calls++, replies.length - 1)] }],
      finishReason: { unified: 'stop', raw: 'stop' },
      usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
      warnings: [],
    }),
  })
  return { model, calls: () => calls }
}

const valid = { description: 'A carpool app for students on my campus.', timeline: '1 month', experience: 'Beginner' }

describe('generateRoadmap action', () => {
  it('returns a roadmap and records one use of the quota', async () => {
    const f = createFakeTools()
    const m = modelFor([good])
    const action = createGenerateRoadmap({ makeModel: () => m.model, now: () => 1_000 })
    const res = await action(ctx(f.tools, ALICE, valid))
    expect(res.success).toBe(true)
    expect(f.db.ai_usage[ALICE].data).toEqual({ windowStart: 1_000, count: 1 })
  })

  it('rejects invalid input WITHOUT calling the model or spending quota', async () => {
    const f = createFakeTools()
    const m = modelFor([good])
    const action = createGenerateRoadmap({ makeModel: () => m.model, now: () => 1 })
    const res = await action(ctx(f.tools, ALICE, { description: 'short' }))
    expect(res).toMatchObject({ success: false, code: 'invalid_input' })
    expect(m.calls()).toBe(0)
    expect(f.count('ai_usage')).toBe(0)
  })

  it('enforces the per-user hourly limit on the server', async () => {
    const f = createFakeTools()
    const m = modelFor([good])
    let now = 1_000
    const action = createGenerateRoadmap({ makeModel: () => m.model, now: () => now })
    for (let i = 0; i < ROADMAP_RATE_LIMIT.max; i++) {
      expect((await action(ctx(f.tools, ALICE, valid))).success).toBe(true)
    }
    const blocked = await action(ctx(f.tools, ALICE, valid))
    expect(blocked).toMatchObject({ success: false, code: 'rate_limited' })
    expect(m.calls()).toBe(ROADMAP_RATE_LIMIT.max)
    // Another user is unaffected, and the limit lifts once the window passes.
    expect((await action(ctx(f.tools, BOB, valid))).success).toBe(true)
    now += ROADMAP_RATE_LIMIT.windowMs
    expect((await action(ctx(f.tools, ALICE, valid))).success).toBe(true)
  })

  it('fails closed (no model call) when the quota counter cannot be read or written', async () => {
    const m = modelFor([good])
    const action = createGenerateRoadmap({ makeModel: () => m.model, now: () => 1 })

    const readFail = createFakeTools()
    readFail.failNext('get', 'db down')
    expect(await action(ctx(readFail.tools, ALICE, valid))).toMatchObject({ success: false, code: 'unavailable' })

    const writeFail = createFakeTools()
    writeFail.failNext('create', 'db down')
    expect(await action(ctx(writeFail.tools, ALICE, valid))).toMatchObject({ success: false, code: 'unavailable' })

    expect(m.calls()).toBe(0)
  })

  it('surfaces invalid model output as a clean error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const f = createFakeTools()
    const m = modelFor(['garbage', 'garbage'])
    const action = createGenerateRoadmap({ makeModel: () => m.model, now: () => 1 })
    expect(await action(ctx(f.tools, ALICE, valid))).toMatchObject({ success: false, code: 'invalid_output' })
    spy.mockRestore()
  })

  it('contains a misconfigured-model failure (makeModel throwing) instead of crashing', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const f = createFakeTools()
    const action = createGenerateRoadmap({
      makeModel: () => {
        throw new Error('API_WORKER not configured')
      },
      now: () => 1,
    })
    const res = await action(ctx(f.tools, ALICE, valid))
    expect(res).toMatchObject({ success: false, code: 'model_error' })
    expect(JSON.stringify(res)).not.toContain('API_WORKER')
    spy.mockRestore()
  })
})
