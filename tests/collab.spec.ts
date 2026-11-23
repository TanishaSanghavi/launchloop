/**
 * Two-user end-to-end spec. NEEDS two DeepSpace test accounts (the file skips
 * itself otherwise):
 *   npx deepspace test accounts create --email a@deepspace.test --name "A" --password-stdin
 *   npx deepspace test accounts create --email b@deepspace.test --name "B" --password-stdin
 *
 * It covers what the unit tests cannot: that the DEPLOYED permission rules and
 * realtime messaging behave for two real, separate sessions. It creates and then
 * deletes its own project, so it leaves no data behind when it passes.
 */
import { test, expect, loadAllTestAccounts } from 'deepspace/testing'

const usable = loadAllTestAccounts().length
test.skip(
  usable < 2,
  `Needs 2 usable test accounts, found ${usable}. See the comment at the top of tests/collab.spec.ts.`,
)

type Pg = import('@playwright/test').Page

async function createProject(page: Pg, title: string, visibility: 'public' | 'private') {
  await page.goto('/dashboard')
  await page.getByRole('button', { name: 'New project' }).first().click()
  await page.getByLabel('Title', { exact: true }).fill(title)
  if (visibility === 'private') await page.getByRole('radio', { name: /Private/ }).check()
  await page.getByRole('dialog').getByRole('button', { name: 'Create project' }).click()
  await page.waitForURL('**/projects/**', { timeout: 15_000 })
  return page.url().split('?')[0]
}

async function deleteProject(page: Pg, projectUrl: string) {
  await page.goto(projectUrl)
  await page.getByRole('button', { name: 'Delete', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: 'Delete project' }).click()
  await page.waitForURL('**/dashboard', { timeout: 15_000 })
}

test('a public project is discoverable, read-only for others, and its discussion is realtime', async ({ users }) => {
  const [owner, guest] = await users(2)
  const title = `E2E public ${Date.now()}`
  const projectUrl = await createProject(owner.page, title, 'public')

  await guest.page.goto('/community')
  await guest.page.getByLabel('Search projects').fill(title)
  await expect(guest.page.getByRole('heading', { name: title })).toBeVisible({ timeout: 15_000 })

  await guest.page.goto(`${projectUrl}?tab=discussion`)
  await expect(guest.page.getByRole('heading', { name: title })).toBeVisible()
  await expect(guest.page.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0)
  await expect(guest.page.getByRole('tab', { name: 'AI roadmap' })).toHaveCount(0)

  await owner.page.goto(`${projectUrl}?tab=discussion`)
  await guest.page.getByLabel('Write a message').fill('Hello from the guest')
  await guest.page.getByLabel('Write a message').press('Enter')
  await expect(owner.page.getByText('Hello from the guest')).toBeVisible({ timeout: 15_000 })

  await deleteProject(owner.page, projectUrl)
})

test("a private project is invisible to other members", async ({ users }) => {
  const [owner, guest] = await users(2)
  const title = `E2E private ${Date.now()}`
  const projectUrl = await createProject(owner.page, title, 'private')

  await guest.page.goto(projectUrl)
  await expect(guest.page.getByText('Project not found')).toBeVisible({ timeout: 15_000 })
  await guest.page.goto('/community')
  await guest.page.getByLabel('Search projects').fill(title)
  await expect(guest.page.getByRole('heading', { name: title })).toHaveCount(0)

  await deleteProject(owner.page, projectUrl)
})
