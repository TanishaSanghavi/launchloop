import { describe, expect, it, vi } from 'vitest'
import { MockLanguageModelV4 } from 'ai/test'
import {
  buildUserPrompt,
  extractJson,
  generateRoadmapWithModel,
  parseRoadmapInput,
  RoadmapError,
  validateRoadmapText,
} from './roadmap-generator'

const good = {
  summary: 'A carpool app for students at one campus.',
  startingPoint: 'Sketch the ride-request screen on paper today.',
  milestones: [
    { title: 'Paper prototype', details: 'Test with 3 friends.', priority: 'high', estimate: '2 days' },
    { title: 'Ride request form', details: 'Create and list rides.', priority: 'high', estimate: '1 week' },
    { title: 'Matching', details: 'Match riders to drivers.', priority: 'medium', estimate: '1 week' },
  ],
}

function mockModel(replies: Array<string | Error>) {
  let i = 0
  const seen: unknown[] = []
  const model = new MockLanguageModelV4({
    doGenerate: async (options) => {
      seen.push(options.prompt)
      const reply = replies[Math.min(i++, replies.length - 1)]
      if (reply instanceof Error) throw reply
      return {
        content: [{ type: 'text', text: reply }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: { inputTokens: { total: 1, noCache: 1, cacheRead: undefined, cacheWrite: undefined }, outputTokens: { total: 1, text: 1, reasoning: undefined } },
        warnings: [],
      }
    },
  })
  return { model, calls: () => i, seen }
}

const input = { description: 'A carpool app for students on my campus', timeline: '1 month', experience: 'Beginner' } as const

describe('parseRoadmapInput', () => {
  it('accepts a good request and applies defaults', () => {
    const r = parseRoadmapInput({ description: 'x'.repeat(30) })
    expect(r).toMatchObject({ ok: true, value: { timeline: '1 month', experience: 'Intermediate' } })
  })
  it('rejects short, long and mistyped input', () => {
    expect(parseRoadmapInput({ description: 'too short' }).ok).toBe(false)
    expect(parseRoadmapInput({ description: 'x'.repeat(2001) }).ok).toBe(false)
    expect(parseRoadmapInput({ description: 123 as unknown as string }).ok).toBe(false)
    expect(parseRoadmapInput({ description: 'x'.repeat(30), timeline: 'forever' }).ok).toBe(false)
    expect(parseRoadmapInput({ description: 'x'.repeat(30), experience: 'wizard' }).ok).toBe(false)
  })
  it('clips the optional title', () => {
    const r = parseRoadmapInput({ description: 'x'.repeat(30), title: 'T'.repeat(200) })
    expect(r.ok && r.value.title?.length).toBe(80)
  })
})

describe('extractJson / validateRoadmapText', () => {
  it('handles plain JSON, fenced JSON, and surrounding prose', () => {
    const json = JSON.stringify(good)
    expect(extractJson(json)).toEqual(good)
    expect(extractJson('```json\n' + json + '\n```')).toEqual(good)
    expect(extractJson('Sure! Here you go:\n' + json + '\nHope that helps.')).toEqual(good)
  })
  it('throws when there is no JSON', () => {
    expect(() => extractJson('no braces here')).toThrow()
  })
  it('accepts a valid roadmap', () => {
    const v = validateRoadmapText(JSON.stringify(good))
    expect(v.ok && v.roadmap.milestones).toHaveLength(3)
  })
  it('truncates over-long text instead of rejecting and trims extra milestones to 5', () => {
    const many = { ...good, summary: 'S'.repeat(2000), milestones: Array.from({ length: 8 }, (_, i) => ({ ...good.milestones[0], title: `Step ${i + 1}` })) }
    const v = validateRoadmapText(JSON.stringify(many))
    expect(v.ok).toBe(true)
    if (v.ok) {
      expect(v.roadmap.summary.length).toBeLessThanOrEqual(600)
      expect(v.roadmap.milestones).toHaveLength(5)
    }
  })
  it('rejects too few milestones, bad priority, missing fields', () => {
    expect(validateRoadmapText(JSON.stringify({ ...good, milestones: good.milestones.slice(0, 2) })).ok).toBe(false)
    expect(validateRoadmapText(JSON.stringify({ ...good, milestones: good.milestones.map((m) => ({ ...m, priority: 'urgent' })) })).ok).toBe(false)
    expect(validateRoadmapText(JSON.stringify({ summary: 'only a summary here' })).ok).toBe(false)
  })
  it('strips unknown keys (nothing unvalidated reaches the client)', () => {
    const v = validateRoadmapText(JSON.stringify({ ...good, evil: '<script>alert(1)</script>' }))
    expect(v.ok && 'evil' in v.roadmap).toBe(false)
  })
})

describe('buildUserPrompt', () => {
  it('fences the user text as data between delimiters', () => {
    const p = buildUserPrompt({ ...input, title: 'Carpool' })
    expect(p).toContain('Project title: Carpool')
    expect(p).toContain('<<<\nA carpool app for students on my campus\n>>>')
  })
})

describe('generateRoadmapWithModel', () => {
  it('returns a validated roadmap on the first try', async () => {
    const { model, calls } = mockModel([JSON.stringify(good)])
    const r = await generateRoadmapWithModel(model, input)
    expect(r.milestones).toHaveLength(3)
    expect(calls()).toBe(1)
  })

  it('repairs once: shows the model its invalid output and the problem', async () => {
    const { model, calls, seen } = mockModel(['not json at all', '```json\n' + JSON.stringify(good) + '\n```'])
    const r = await generateRoadmapWithModel(model, input)
    expect(r.summary).toContain('carpool')
    expect(calls()).toBe(2)
    expect(JSON.stringify(seen[1])).toContain('not valid')
  })

  it('gives up after one repair with a safe error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { model, calls } = mockModel(['nope', 'still nope'])
    await expect(generateRoadmapWithModel(model, input)).rejects.toMatchObject({ code: 'invalid_output' })
    expect(calls()).toBe(2)
    spy.mockRestore()
  })

  it('maps provider failures to safe messages without leaking provider text', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const billing = Object.assign(new Error('secret upstream detail: key sk-123'), { statusCode: 402 })
    await expect(generateRoadmapWithModel(mockModel([billing]).model, input)).rejects.toMatchObject({ code: 'billing' })
    const busy = Object.assign(new Error('rate limited upstream'), { statusCode: 429 })
    await expect(generateRoadmapWithModel(mockModel([busy]).model, input)).rejects.toMatchObject({ code: 'busy' })
    const other = new Error('secret upstream detail: key sk-123')
    const err = await generateRoadmapWithModel(mockModel([other]).model, input).catch((e) => e)
    expect(err).toBeInstanceOf(RoadmapError)
    expect(err.code).toBe('model_error')
    expect(err.message).not.toContain('sk-123')
    spy.mockRestore()
  })
})
