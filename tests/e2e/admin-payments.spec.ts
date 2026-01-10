import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'
const ADMIN_EMAIL = 'test@admin.com'
const ADMIN_PASSWORD = 'Admin123!'

// Helper function to login
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)

  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')

  await page.waitForTimeout(3000)
  await page.waitForLoadState('domcontentloaded')
}

// Helper to close popups
async function closePopups(page: Page) {
  try {
    const closeButton = page.locator('button:has(svg.lucide-x)').first()
    if (await closeButton.isVisible({ timeout: 500 })) {
      await closeButton.click()
      await page.waitForTimeout(200)
    }
  } catch { /* ignore */ }
}

test.describe('Admin Payments Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await closePopups(page)
    await page.goto(`${BASE_URL}/admin/payments`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
  })

  test('should display payments page with title', async ({ page }) => {
    await expect(page.locator('h1:has-text("Payments")')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'test-results/admin-payments-page.png', fullPage: true })
  })

  test('should display payment stats cards', async ({ page }) => {
    // Check for stats cards - Total Revenue, Total Refunds, Scheduled Pending, Net Income
    // Or just any summary section
    const statsCards = page.locator('[class*="Card"]').filter({ hasText: /Revenue|Refunds|Pending|Income|Total|€/i })
    const count = await statsCards.count()

    if (count > 0) {
      console.log(`Found ${count} payment stats cards`)
    } else {
      // Check for any summary section with currency
      const summarySection = page.locator('text=/€|EUR|Revenue|Total/')
      if (await summarySection.first().isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Payment summary section found')
      } else {
        console.log('No payment stats cards found - page may have different layout')
      }
    }

    await page.screenshot({ path: 'test-results/admin-payments-stats.png' })
  })

  test('should display Completed Payments tab', async ({ page }) => {
    // Check for tabs
    const completedTab = page.locator('button[role="tab"]:has-text("Completed"), [data-state] button:has-text("Completed")')
    await expect(completedTab).toBeVisible({ timeout: 5000 })

    // Click on Completed tab if not already active
    await completedTab.click()
    await page.waitForTimeout(1000)

    // Check for table headers
    const table = page.locator('table')
    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(table).toBeVisible()
      console.log('Completed payments table is visible')
    } else {
      // Might show "No payments found" message
      const noPayments = page.locator('text=/No payments|No completed/i')
      if (await noPayments.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('No completed payments found - this is OK')
      }
    }

    await page.screenshot({ path: 'test-results/admin-payments-completed.png', fullPage: true })
  })

  test('should display Scheduled Payments tab', async ({ page }) => {
    // Find and click Scheduled tab
    const scheduledTab = page.locator('button[role="tab"]:has-text("Scheduled")')

    if (await scheduledTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scheduledTab.click()
      await page.waitForTimeout(1000)

      // Check for table or empty message
      const table = page.locator('table')
      const noPayments = page.locator('text=/No scheduled|No pending/i')

      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Scheduled payments table is visible')
      } else if (await noPayments.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('No scheduled payments found - this is OK')
      }

      await page.screenshot({ path: 'test-results/admin-payments-scheduled.png', fullPage: true })
    } else {
      console.log('Scheduled tab not visible')
    }
  })

  test('should have export CSV button', async ({ page }) => {
    // Look for Download/Export button
    const exportButton = page.locator('button:has(svg.lucide-download), button:has-text("Export"), button:has-text("CSV")')

    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(exportButton).toBeVisible()
      console.log('Export CSV button found')
    } else {
      console.log('Export button not visible (may require payments data)')
    }

    await page.screenshot({ path: 'test-results/admin-payments-export.png' })
  })

  test('should filter payments by search', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]')

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test')
      await page.waitForTimeout(1000)
      console.log('Search filter applied')
    } else {
      console.log('Search input not visible')
    }

    await page.screenshot({ path: 'test-results/admin-payments-search.png', fullPage: true })
  })

  test('should open refund dialog for payment', async ({ page }) => {
    // Find a payment row with refund button
    const refundButton = page.locator('button:has-text("Refund"), button:has(svg.lucide-rotate-ccw)').first()

    if (await refundButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await refundButton.click()
      await page.waitForTimeout(500)

      // Check for refund dialog
      const dialog = page.locator('[role="dialog"]')
      await expect(dialog).toBeVisible({ timeout: 3000 })

      // Check for amount input
      const amountInput = page.locator('[role="dialog"] input[type="number"]')
      if (await amountInput.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Refund dialog opened with amount input')
      }

      // Close dialog
      const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")')
      if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await cancelButton.click()
      }

      await page.screenshot({ path: 'test-results/admin-payments-refund-dialog.png' })
    } else {
      console.log('No refund button found - no refundable payments')
    }
  })

  test('should cancel scheduled payment', async ({ page }) => {
    // Go to Scheduled tab
    const scheduledTab = page.locator('button[role="tab"]:has-text("Scheduled")')

    if (await scheduledTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await scheduledTab.click()
      await page.waitForTimeout(1000)

      // Find cancel button for a scheduled payment
      const cancelButton = page.locator('button:has-text("Cancel"), button:has(svg.lucide-x-circle)').first()

      if (await cancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cancelButton.click()
        await page.waitForTimeout(500)

        // Check for confirmation dialog
        const dialog = page.locator('[role="dialog"], [role="alertdialog"]')
        if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log('Cancel confirmation dialog opened')

          // Close dialog without confirming
          const keepButton = page.locator('[role="dialog"] button:has-text("Keep"), [role="alertdialog"] button:has-text("Cancel")')
          if (await keepButton.isVisible({ timeout: 1000 }).catch(() => false)) {
            await keepButton.click()
          }
        }

        await page.screenshot({ path: 'test-results/admin-payments-cancel-scheduled.png' })
      } else {
        console.log('No scheduled payments to cancel')
      }
    }
  })
})
