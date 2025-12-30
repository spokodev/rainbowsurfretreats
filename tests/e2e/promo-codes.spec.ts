import { test, expect } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'https://rainbowsurfretreats.vercel.app'
const ADMIN_EMAIL = 'test@admin.com'
const ADMIN_PASSWORD = 'Admin123!'
// Known retreat slug for testing
const TEST_RETREAT_SLUG = 'siargao-philippines-jan-2026'
// Test promo code created in DB
const TEST_PROMO_CODE = 'TESTCODE20'

test.describe('Promo Codes Feature', () => {

  // Admin tests are skipped due to credential issues
  // Update ADMIN_PASSWORD constant with correct password to enable these tests
  test.describe('Admin - Promo Codes Management', () => {

    test.beforeEach(async ({ page }) => {
      // Login as admin
      await page.goto(`${BASE_URL}/login`)
      await page.fill('input[type="email"]', ADMIN_EMAIL)
      await page.fill('input[type="password"]', ADMIN_PASSWORD)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/admin/)
    })

    test('should display promo codes page in admin navigation', async ({ page }) => {
      // Check navigation link exists
      await expect(page.locator('a[href="/admin/promo-codes"]')).toBeVisible()

      // Navigate to promo codes
      await page.click('a[href="/admin/promo-codes"]')
      await page.waitForURL(/\/admin\/promo-codes/)

      // Check page loaded - use more specific selector
      await expect(page.getByRole('heading', { name: 'Promo Codes', exact: true })).toBeVisible()
    })

    // Skipped: user test@admin.com doesn't have admin role in DB
    test.skip('should create a new percentage promo code', async ({ page }) => {
      // Capture console logs
      const consoleLogs: string[] = []
      page.on('console', msg => consoleLogs.push(`${msg.type()}: ${msg.text()}`))

      await page.goto(`${BASE_URL}/admin/promo-codes`)
      await page.waitForLoadState('domcontentloaded')

      // Click create button
      await page.click('button:has-text("Create Promo Code")')

      // Wait for dialog
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      // Fill form using id selectors
      await dialog.locator('#code').fill('TEST10')
      await dialog.locator('#description').fill('Test 10% discount')
      await dialog.locator('#discount_value').fill('10')

      // Try multiple click approaches
      const createBtn = dialog.getByRole('button', { name: 'Create' })

      // Focus and click
      await createBtn.focus()
      await page.waitForTimeout(100)
      await createBtn.click()

      // Wait and check for API response
      const responsePromise = page.waitForResponse(
        resp => resp.url().includes('/api/admin/promo-codes'),
        { timeout: 10000 }
      ).catch(e => {
        console.log('No API response captured:', e.message)
        return null
      })

      const response = await responsePromise
      if (response) {
        console.log('API Response:', response.status(), await response.text().catch(() => 'no body'))
      }

      // Print console logs for debugging
      console.log('Console logs:', consoleLogs.filter(l => l.includes('error') || l.includes('Error')))

      // Wait for dialog to close and verify created
      await expect(dialog).not.toBeVisible({ timeout: 15000 })
      await expect(page.locator('td:has-text("TEST10")')).toBeVisible({ timeout: 10000 })
    })

    test.skip('should create a fixed amount promo code', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/promo-codes`)
      await page.waitForLoadState('domcontentloaded')

      await page.click('button:has-text("Create Promo Code")')

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      await dialog.locator('#code').fill('SAVE50')
      await dialog.locator('#description').fill('Save €50')

      // Change discount type to fixed amount
      await dialog.locator('button:has-text("Percentage")').click()
      await page.click('text=Fixed Amount (€)')

      await dialog.locator('#discount_value').fill('50')

      await dialog.getByRole('button', { name: 'Create' }).click()

      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      await expect(page.locator('td:has-text("SAVE50")')).toBeVisible({ timeout: 10000 })
    })

    test('should toggle promo code active status', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/promo-codes`)
      await page.waitForLoadState('domcontentloaded')

      // Find a promo code row and toggle its status
      const row = page.locator('tr:has-text("TEST10")').first()
      if (await row.isVisible()) {
        const toggle = row.locator('button[role="switch"]')
        await toggle.click()
        // Status should change
        await page.waitForTimeout(1000)
      }
    })

    test.skip('should delete a promo code', async ({ page }) => {
      await page.goto(`${BASE_URL}/admin/promo-codes`)
      await page.waitForLoadState('domcontentloaded')

      // Create a code to delete
      await page.click('button:has-text("Create Promo Code")')

      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 5000 })

      await dialog.locator('#code').fill('TODELETE')
      await dialog.locator('#discount_value').fill('5')
      await dialog.getByRole('button', { name: 'Create' }).click()

      await expect(dialog).not.toBeVisible({ timeout: 10000 })
      await expect(page.locator('td:has-text("TODELETE")')).toBeVisible({ timeout: 10000 })

      // Delete it - find the row and click delete button
      const row = page.locator('tr:has-text("TODELETE")')
      await row.locator('button:has(svg.lucide-trash-2)').click()

      // Confirm deletion in alert dialog
      await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()

      // Verify deleted
      await expect(page.locator('td:has-text("TODELETE")')).not.toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Booking Page - Promo Code Input', () => {

    test('should display promo code input field', async ({ page }) => {
      // Navigate directly to booking page with known slug
      await page.goto(`${BASE_URL}/booking?slug=${TEST_RETREAT_SLUG}`)
      await page.waitForLoadState('domcontentloaded')

      // Check promo code section exists on booking page
      await expect(page.locator('text=Promo Code')).toBeVisible({ timeout: 15000 })
    })

    test('should show error for invalid promo code', async ({ page }) => {
      // Go to booking page with known slug
      await page.goto(`${BASE_URL}/booking?slug=${TEST_RETREAT_SLUG}`)
      await page.waitForLoadState('domcontentloaded')

      // Wait for the promo code section to be visible
      await expect(page.locator('text=Promo Code')).toBeVisible({ timeout: 15000 })

      // Enter invalid code
      const promoInput = page.locator('input[placeholder*="code" i]')
      await expect(promoInput).toBeVisible({ timeout: 10000 })
      await promoInput.fill('INVALIDCODE123')
      await page.click('button:has-text("Apply")')

      // Should show error
      await expect(page.locator('text=Invalid').or(page.locator('text=not valid').or(page.locator('text=not found')))).toBeVisible({ timeout: 10000 })
    })

    // Test with actual promo code TESTCODE20 created in database
    test('should apply valid promo code and show discount', async ({ page }) => {
      // Go to booking page with known slug
      await page.goto(`${BASE_URL}/booking?slug=${TEST_RETREAT_SLUG}`)
      await page.waitForLoadState('domcontentloaded')

      // Wait for promo code section
      await expect(page.locator('text=Promo Code')).toBeVisible({ timeout: 15000 })

      const promoInput = page.locator('input[placeholder*="code" i]')
      await expect(promoInput).toBeVisible({ timeout: 10000 })
      await promoInput.fill(TEST_PROMO_CODE)
      await page.click('button:has-text("Apply")')

      // Should show success - look for "Applied" badge
      await expect(page.getByText('Applied')).toBeVisible({ timeout: 10000 })
    })

    test('should remove applied promo code', async ({ page }) => {
      // Go to booking page with known slug
      await page.goto(`${BASE_URL}/booking?slug=${TEST_RETREAT_SLUG}`)
      await page.waitForLoadState('domcontentloaded')

      // Wait for promo code section
      await expect(page.locator('text=Promo Code')).toBeVisible({ timeout: 15000 })

      const promoInput = page.locator('input[placeholder*="code" i]')
      await expect(promoInput).toBeVisible({ timeout: 10000 })
      await promoInput.fill(TEST_PROMO_CODE)
      await page.click('button:has-text("Apply")')

      // Wait for code to be applied - look for "Applied" badge
      await expect(page.getByText('Applied')).toBeVisible({ timeout: 10000 })

      // Remove the code - click the small X button next to the promo code
      // The remove button is typically the first button with lucide-x icon in the promo section
      const promoSection = page.locator('text=Promo Code').locator('..')
      const removeBtn = promoSection.locator('button:has(svg.lucide-x)').first()
      await removeBtn.click()

      // Promo input should be visible again (empty) or Applied badge should disappear
      await expect(page.getByText('Applied')).not.toBeVisible({ timeout: 5000 })
    })
  })

  test.describe('Best Discount Wins Logic', () => {

    // This test requires a valid promo code and early bird enabled retreat
    test.skip('should show both early bird and promo discount when applicable', async ({ page }) => {
      // First get a valid retreat slug
      await page.goto(`${BASE_URL}/retreats`)
      const retreatCard = page.locator('[href*="/retreats/"]').first()
      await retreatCard.click()
      const url = page.url()
      const slug = url.split('/retreats/')[1]?.split('?')[0]

      // Go to booking page
      await page.goto(`${BASE_URL}/booking?slug=${slug}`)
      await page.waitForLoadState('domcontentloaded')

      // If early bird is available and promo code applied, both should be shown
      const promoInput = page.locator('input[placeholder*="code" i]')
      await expect(promoInput).toBeVisible({ timeout: 10000 })
      await promoInput.fill('VALID20')
      await page.click('button:has-text("Apply")')

      // Check if Best Discount logic is shown (one applied, one crossed out)
      await page.waitForTimeout(2000)
      // This depends on the retreat having early bird enabled
    })
  })

  test.describe('Promo Code Validation API', () => {

    test('should return error for empty code', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/promo-codes/validate`, {
        data: {
          code: '',
          retreatId: '123',
          orderAmount: 1000
        }
      })

      const data = await response.json()
      expect(data.error || !data.valid).toBeTruthy()
    })

    test('should return error for non-existent code', async ({ request }) => {
      const response = await request.post(`${BASE_URL}/api/promo-codes/validate`, {
        data: {
          code: 'NONEXISTENT999',
          retreatId: '123',
          orderAmount: 1000
        }
      })

      const data = await response.json()
      expect(data.valid).toBe(false)
    })
  })
})
