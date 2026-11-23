import { test, expect } from '@playwright/test'

test.describe('API tests', () => {
  test('auth proxy forwards to auth worker', async ({ request }) => {
    const res = await request.get('/api/auth/ok')
    expect(res.ok()).toBeTruthy()
  })

  // Every server action requires a verified JWT before its handler runs.
  for (const action of ['generateRoadmap', 'setProjectVisibility', 'deleteProject']) {
    test(`POST /api/actions/${action} rejects unauthenticated callers`, async ({ request }) => {
      const res = await request.post(`/api/actions/${action}`, { data: { projectId: 'x', description: 'x'.repeat(40) } })
      expect(res.status()).toBe(401)
    })
  }

  test('prototype-pollution style action names are not resolvable', async ({ request }) => {
    const res = await request.post('/api/actions/constructor', { data: {} })
    expect([401, 404]).toContain(res.status())
  })
})
