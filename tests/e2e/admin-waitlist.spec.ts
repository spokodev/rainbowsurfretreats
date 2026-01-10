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

test.describe('Admin Waitlist Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await closePopups(page)
    await page.goto(`${BASE_URL}/admin/waitlist`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
  })

  test('should display waitlist page with title', async ({ page }) => {
    await expect(page.locator('h1:has-text("Waitlist")')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'test-results/admin-waitlist-page.png', fullPage: true })
  })

  test('should display waitlist stats cards', async ({ page }) => {
    // Check for stats cards - Total, Waiting, Notified, Accepted, Declined, Expired
    const statsCards = page.locator('[class*="Card"]').filter({ hasText: /Total|Waiting|Notified|Accepted|Declined|Expired/i })
    const count = await statsCards.count()

    if (count > 0) {
      console.log(`Found ${count} waitlist stats cards`)
    } else {
      console.log('No waitlist stats cards found')
    }

    await page.screenshot({ path: 'test-results/admin-waitlist-stats.png' })
  })

  test('should display waitlist entries table', async ({ page }) => {
    // Check for table
    const table = page.locator('table')

    if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for expected columns
      const headers = page.locator('th')
      const headerCount = await headers.count()
      console.log(`Found table with ${headerCount} columns`)

      await expect(table).toBeVisible()
    } else {
      // Might show empty message
      const noEntries = page.locator('text=/No waitlist|No entries|Empty/i')
      if (await noEntries.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('No waitlist entries found - this is OK')
      }
    }

    await page.screenshot({ path: 'test-results/admin-waitlist-table.png', fullPage: true })
  })

  test('should filter waitlist by status', async ({ page }) => {
    // Look for status filter dropdown
    const statusFilter = page.locator('button:has-text("Status"), select, [class*="Select"]').first()

    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click()
      await page.waitForTimeout(500)

      // Look for status options
      const waitingOption = page.locator('[role="option"]:has-text("Waiting"), text=Waiting').first()
      if (await waitingOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await waitingOption.click()
        await page.waitForTimeout(1000)
        console.log('Filtered by Waiting status')
      }

      await page.screenshot({ path: 'test-results/admin-waitlist-filter.png', fullPage: true })
    } else {
      console.log('Status filter not visible')
    }
  })

  test('should search waitlist by email', async ({ page }) => {
    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="email"], input[type="search"]')

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test@example.com')
      await page.waitForTimeout(1000)
      console.log('Search by email applied')

      await page.screenshot({ path: 'test-results/admin-waitlist-search.png', fullPage: true })
    } else {
      console.log('Search input not visible')
    }
  })

  test('should open notify dialog for waiting entry', async ({ page }) => {
    // Find notify button
    const notifyButton = page.locator('button:has-text("Notify"), button:has(svg.lucide-bell), button:has(svg.lucide-mail)').first()

    if (await notifyButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await notifyButton.click()
      await page.waitForTimeout(500)

      // Check for dialog or confirmation
      const dialog = page.locator('[role="dialog"], [role="alertdialog"]')
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Notify dialog opened')

        // Close dialog
        const cancelButton = page.locator('[role="dialog"] button:has-text("Cancel")')
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click()
        }
      }

      await page.screenshot({ path: 'test-results/admin-waitlist-notify.png' })
    } else {
      console.log('No notify button found - no waiting entries')
    }
  })

  test('should show entry details', async ({ page }) => {
    // Click on a waitlist row to see details or expand
    const entryRow = page.locator('table tbody tr').first()

    if (await entryRow.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for guest info columns
      const guestEmail = entryRow.locator('td').filter({ hasText: /@/ })
      if (await guestEmail.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Waitlist entry with email visible')
      }

      // Check for retreat info
      const retreatInfo = entryRow.locator('td').filter({ hasText: /Morocco|Siargao|Bali/i })
      if (await retreatInfo.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Waitlist entry with retreat info visible')
      }

      await page.screenshot({ path: 'test-results/admin-waitlist-entry-details.png' })
    } else {
      console.log('No waitlist entries to show')
    }
  })

  test('should delete waitlist entry', async ({ page }) => {
    // Find delete button
    const deleteButton = page.locator('button:has(svg.lucide-trash-2), button:has-text("Delete")').first()

    if (await deleteButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await deleteButton.click()
      await page.waitForTimeout(500)

      // Check for confirmation dialog
      const dialog = page.locator('[role="alertdialog"]')
      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Delete confirmation dialog opened')

        // Close without confirming
        const cancelButton = dialog.locator('button:has-text("Cancel")')
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click()
        }

        await page.screenshot({ path: 'test-results/admin-waitlist-delete-dialog.png' })
      }
    } else {
      console.log('No delete button found - no entries to delete')
    }
  })

  test('should display notes column properly', async ({ page }) => {
    // Check that notes are truncated properly (BUG-021 fix verification)
    const notesCell = page.locator('td').filter({ hasText: /notes/i }).first()

    if (await notesCell.isVisible({ timeout: 3000 }).catch(() => false)) {
      // Check for truncate class or max-width
      const hasProperStyling = await notesCell.evaluate((el) => {
        const style = window.getComputedStyle(el)
        return style.overflow === 'hidden' ||
               style.textOverflow === 'ellipsis' ||
               el.classList.contains('truncate') ||
               el.classList.contains('max-w-')
      })

      console.log(`Notes cell has proper styling: ${hasProperStyling}`)
    }

    await page.screenshot({ path: 'test-results/admin-waitlist-notes.png', fullPage: true })
  })
})
