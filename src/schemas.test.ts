/**
 * Permission tests. These call the SDK's OWN enforcement functions — the same
 * `canRead` / `canUpdate` / ... that the RecordRoom Durable Object runs on every
 * read and write — against OUR schemas. So a pass here means the rules in
 * src/schemas/*.ts really behave the way ARCHITECTURE.md says they do.
 * (What this cannot prove: that the deployed DO wires them up — that is the
 * SDK's job, and is covered by the manual checklist in TESTING.md.)
 */
import { describe, expect, it } from 'vitest'
import { canCreate, canDelete, canRead, canUpdate, lintSchemas, lintSchemaSet } from 'deepspace/worker'
import { schemas } from './schemas'
import { projectsSchema } from './schemas/projects-schema'
import { messagesSchema } from './schemas/messages-schema'
import { aiUsageSchema } from './schemas/usage-schema'
import { CATEGORIES } from './lib/categories'

const ALICE = 'user_alice'
const BOB = 'user_bob'
const row = (createdBy: string, data: Record<string, unknown>) => ({ createdBy, data, recordId: 'r1' })

describe('projects', () => {
  const publicProject = row(ALICE, { title: 'x', visibility: 'public' })
  const privateProject = row(ALICE, { title: 'x', visibility: 'private' })

  it('any signed-in member can read a PUBLIC project', () => {
    expect(canRead(projectsSchema, 'member', publicProject, BOB)).toBe(true)
  })
  it('only the owner can read a PRIVATE project', () => {
    expect(canRead(projectsSchema, 'member', privateProject, ALICE)).toBe(true)
    expect(canRead(projectsSchema, 'member', privateProject, BOB)).toBe(false)
  })
  it('only the owner can update or delete (public or private)', () => {
    for (const p of [publicProject, privateProject]) {
      expect(canUpdate(projectsSchema, 'member', p, ALICE)).toBe(true)
      expect(canDelete(projectsSchema, 'member', p, ALICE)).toBe(true)
      expect(canUpdate(projectsSchema, 'member', p, BOB)).toBe(false)
      expect(canDelete(projectsSchema, 'member', p, BOB)).toBe(false)
    }
  })
  it('members can create; signed-out viewers cannot do anything', () => {
    expect(canCreate(projectsSchema, 'member')).toBe(true)
    expect(canCreate(projectsSchema, 'viewer')).toBe(false)
    expect(canRead(projectsSchema, 'viewer', publicProject, BOB)).toBe(false)
    expect(canUpdate(projectsSchema, 'viewer', publicProject, ALICE)).toBe(false)
  })
  it('the app owner (admin) can moderate', () => {
    expect(canRead(projectsSchema, 'admin', privateProject, BOB)).toBe(true)
    expect(canUpdate(projectsSchema, 'admin', publicProject, BOB)).toBe(true)
    expect(canDelete(projectsSchema, 'admin', publicProject, BOB)).toBe(true)
  })
  it('milestones live in the project row, so they inherit the owner-only update rule', () => {
    expect(projectsSchema.columns.find((c) => c.name === 'milestones')?.interpretation).toEqual({ kind: 'json' })
  })
  it('server-enforced length limits exist on every free-text column', () => {
    for (const name of ['title', 'description', 'goal', 'summary', 'startingPoint']) {
      expect(projectsSchema.columns.find((c) => c.name === name)?.maxLength, name).toBeGreaterThan(0)
    }
  })
  it('category options match the UI list', () => {
    const interp = projectsSchema.columns.find((c) => c.name === 'category')?.interpretation as { options: string[] }
    expect(interp.options).toEqual([...CATEGORIES])
  })
})

describe('messages (project discussions)', () => {
  const bobsMessage = row(BOB, { channelId: 'p1', content: 'hi', authorId: BOB })

  it('members can read and post; viewers cannot', () => {
    expect(canRead(messagesSchema, 'member', bobsMessage, ALICE)).toBe(true)
    expect(canCreate(messagesSchema, 'member')).toBe(true)
    expect(canRead(messagesSchema, 'viewer', bobsMessage, ALICE)).toBe(false)
    expect(canCreate(messagesSchema, 'viewer')).toBe(false)
  })
  it("members cannot edit or delete other people's messages, only their own", () => {
    expect(canUpdate(messagesSchema, 'member', bobsMessage, ALICE)).toBe(false)
    expect(canDelete(messagesSchema, 'member', bobsMessage, ALICE)).toBe(false)
    expect(canDelete(messagesSchema, 'member', bobsMessage, BOB)).toBe(true)
  })
  it('author is server-stamped (userBound + immutable) and content is required and capped', () => {
    const author = messagesSchema.columns.find((c) => c.name === 'authorId')
    expect(author?.userBound).toBe(true)
    expect(author?.immutable).toBe(true)
    const content = messagesSchema.columns.find((c) => c.name === 'content')
    expect(content?.required).toBe(true)
    expect(content?.maxLength).toBe(2000)
  })
})

describe('ai_usage (rate-limit counters)', () => {
  const usage = row(ALICE, { windowStart: 0, count: 0 })
  it('is invisible and immutable to members: nobody can reset their own limit', () => {
    expect(canRead(aiUsageSchema, 'member', usage, ALICE)).toBe(false)
    expect(canCreate(aiUsageSchema, 'member')).toBe(false)
    expect(canUpdate(aiUsageSchema, 'member', usage, ALICE)).toBe(false)
    expect(canDelete(aiUsageSchema, 'member', usage, ALICE)).toBe(false)
  })
})

describe('schema hygiene', () => {
  it('has unique collection names', () => {
    const names = schemas.map((s) => s.name)
    expect(new Set(names).size).toBe(names.length)
  })
  it('passes the SDK schema linter with no warnings', () => {
    expect(lintSchemas(schemas)).toEqual([])
    expect(lintSchemaSet(schemas)).toEqual([])
  })
})
