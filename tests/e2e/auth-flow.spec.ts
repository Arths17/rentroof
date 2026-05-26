import { expect, test } from '@playwright/test'

test('signup, dashboard access, reload persistence, and logout', async ({ page }) => {
  await page.goto('/signup')

  await page.getByLabel('Full name').fill('E2E Owner')
  await page.getByLabel('Email').fill('e2e.owner@example.com')
  await page.getByLabel('Password').fill('strong-password')
  await page.getByRole('button', { name: 'Create account' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByText('Welcome back, E2E.')).toBeVisible()

  await page.reload()
  await expect(page.getByText('Welcome back, E2E.')).toBeVisible()

  await page.getByRole('button', { name: 'Sign out' }).click()
  await expect(page).toHaveURL(/\/login/)
})

test('invalid sessions are redirected to login', async ({ page, context }) => {
  await context.addCookies([
    {
      name: 'auth_token',
      value: 'invalid.session.token',
      domain: '127.0.0.1',
      path: '/',
    },
  ])

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login/)
})
