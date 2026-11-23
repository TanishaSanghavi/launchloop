import { test, expect } from '@playwright/test'
import { captureConsoleErrors } from './helpers/errors'

/**
 * Smoke tests for LaunchLoop. They need no DeepSpace test accounts, only the
 * dev server that `npx deepspace test run smoke` starts (which itself needs you
 * to be logged in to the CLI and the app registered).
 *
 *   '/'               static landing: no providers, so no auth fetch, no websocket
 *   '/sign-in'        public dynamic page showing the SDK sign-in overlay
 *   '/dashboard' ...  protected pages: a signed-out visitor sees the sign-in screen
 */

async function waitForApp(page: import('@playwright/test').Page) {
  await page.waitForSelector('[data-testid="app-root"]', { timeout: 15000 })
}

test.describe('Smoke tests', () => {
  test('static landing loads without JS errors and shows the headline', async ({ page }) => {
    const errors = captureConsoleErrors(page)
    await page.goto('/')
    await waitForApp(page)
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Turn ideas into finished projects.')
    expect(errors).toEqual([])
  })

  test('landing carries one title, one description, one canonical', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await expect(page).toHaveTitle(/LaunchLoop/)
    expect(await page.locator('head meta[name="description"]').count()).toBe(1)
    expect(await page.locator('head link[rel="canonical"]').count()).toBe(1)
  })

  test('static contract: landing fires no auth request, opens no websocket', async ({ page }) => {
    const offenders: string[] = []
    page.on('request', (req) => {
      if (req.url().includes('/api/auth/')) offenders.push(req.url())
    })
    page.on('websocket', (ws) => {
      if (new URL(ws.url()).pathname.startsWith('/ws/')) offenders.push(`ws: ${ws.url()}`)
    })
    await page.goto('/')
    await expect(page.getByTestId('static-landing')).toBeVisible()
    await page.waitForTimeout(1500)
    expect(offenders).toEqual([])
  })

  test('/sign-in shows the branded sign-in overlay', async ({ page }) => {
    await page.goto('/sign-in')
    await expect(page.getByText('Sign in to LaunchLoop')).toBeVisible({ timeout: 15000 })
    await expect(page.getByRole('button', { name: /Continue with GitHub/ })).toBeVisible()
  })

  for (const path of ['/dashboard', '/community', '/projects/anything']) {
    test(`protected route ${path} asks a signed-out visitor to sign in`, async ({ page }) => {
      await page.goto(path)
      await expect(page.getByText('Sign in to LaunchLoop')).toBeVisible({ timeout: 15000 })
      // The page's own content must not render for a signed-out visitor.
      await expect(page.getByRole('heading', { name: 'Your projects' })).toHaveCount(0)
    })
  }

  test('unknown route shows the 404 page', async ({ page }) => {
    await page.goto('/nonexistent-page-xyz')
    await waitForApp(page)
    await expect(page.getByRole('heading', { name: /isn.t part of the loop/ })).toBeVisible()
  })
})
