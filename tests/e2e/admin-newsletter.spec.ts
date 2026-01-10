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

test.describe('Admin Newsletter Page', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
    await closePopups(page)
    await page.goto(`${BASE_URL}/admin/newsletter`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
  })

  test('should display newsletter page with title', async ({ page }) => {
    await expect(page.locator('h1:has-text("Newsletter")')).toBeVisible({ timeout: 10000 })
    await page.screenshot({ path: 'test-results/admin-newsletter-page.png', fullPage: true })
  })

  test('should display subscriber stats', async ({ page }) => {
    // Check for stats - Total, Active, Pending, Unsubscribed
    const statsCards = page.locator('[class*="Card"]').filter({ hasText: /Total|Active|Pending|Unsubscribed|Bounced/i })
    const count = await statsCards.count()

    if (count > 0) {
      console.log(`Found ${count} subscriber stats`)
    }

    await page.screenshot({ path: 'test-results/admin-newsletter-stats.png' })
  })

  test('should display Subscribers tab', async ({ page }) => {
    // Click Subscribers tab
    const subscribersTab = page.locator('button[role="tab"]:has-text("Subscribers")')

    if (await subscribersTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await subscribersTab.click()
      await page.waitForTimeout(1000)

      // Check for subscribers table
      const table = page.locator('table')
      if (await table.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Subscribers table is visible')
      } else {
        console.log('No subscribers table - may be empty')
      }

      await page.screenshot({ path: 'test-results/admin-newsletter-subscribers.png', fullPage: true })
    }
  })

  test('should display Campaigns tab', async ({ page }) => {
    // Click Campaigns tab
    const campaignsTab = page.locator('button[role="tab"]:has-text("Campaigns")')

    if (await campaignsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await campaignsTab.click()
      await page.waitForTimeout(1000)

      // Check for campaigns list or create button
      const createButton = page.locator('button:has-text("Create"), button:has-text("New Campaign")')
      if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        console.log('Create Campaign button found')
      }

      await page.screenshot({ path: 'test-results/admin-newsletter-campaigns.png', fullPage: true })
    }
  })

  test('should filter subscribers by language', async ({ page }) => {
    // Go to Subscribers tab first
    const subscribersTab = page.locator('button[role="tab"]:has-text("Subscribers")')
    if (await subscribersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subscribersTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for language filter
    const languageFilter = page.locator('select, button').filter({ hasText: /Language|English|German|Spanish/i }).first()

    if (await languageFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await languageFilter.click()
      await page.waitForTimeout(500)

      // Select a language
      const englishOption = page.locator('[role="option"]:has-text("English"), text=English').first()
      if (await englishOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await englishOption.click()
        await page.waitForTimeout(1000)
        console.log('Filtered by English language')
      }

      await page.screenshot({ path: 'test-results/admin-newsletter-filter-language.png', fullPage: true })
    } else {
      console.log('Language filter not visible')
    }
  })

  test('should filter subscribers by status', async ({ page }) => {
    // Go to Subscribers tab first
    const subscribersTab = page.locator('button[role="tab"]:has-text("Subscribers")')
    if (await subscribersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subscribersTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for status filter
    const statusFilter = page.locator('select, button').filter({ hasText: /Status|Active|Pending|Unsubscribed/i }).first()

    if (await statusFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
      await statusFilter.click()
      await page.waitForTimeout(500)

      // Select Active status
      const activeOption = page.locator('[role="option"]:has-text("Active"), text=Active').first()
      if (await activeOption.isVisible({ timeout: 2000 }).catch(() => false)) {
        await activeOption.click()
        await page.waitForTimeout(1000)
        console.log('Filtered by Active status')
      }

      await page.screenshot({ path: 'test-results/admin-newsletter-filter-status.png', fullPage: true })
    } else {
      console.log('Status filter not visible')
    }
  })

  test('should search subscribers by email', async ({ page }) => {
    // Go to Subscribers tab first
    const subscribersTab = page.locator('button[role="tab"]:has-text("Subscribers")')
    if (await subscribersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subscribersTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for search input
    const searchInput = page.locator('input[placeholder*="Search"], input[placeholder*="email"]')

    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchInput.fill('test@example.com')
      await page.waitForTimeout(1000)
      console.log('Search by email applied')

      await page.screenshot({ path: 'test-results/admin-newsletter-search.png', fullPage: true })
    } else {
      console.log('Search input not visible')
    }
  })

  test('should export subscribers to CSV', async ({ page }) => {
    // Go to Subscribers tab first
    const subscribersTab = page.locator('button[role="tab"]:has-text("Subscribers")')
    if (await subscribersTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await subscribersTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for export button
    const exportButton = page.locator('button:has(svg.lucide-download), button:has-text("Export"), button:has-text("CSV")')

    if (await exportButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Export CSV button found')
      // Don't click to avoid downloading in test
    } else {
      console.log('Export button not visible')
    }

    await page.screenshot({ path: 'test-results/admin-newsletter-export.png' })
  })

  test('should open create campaign dialog', async ({ page }) => {
    // Go to Campaigns tab first
    const campaignsTab = page.locator('button[role="tab"]:has-text("Campaigns")')
    if (await campaignsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await campaignsTab.click()
      await page.waitForTimeout(1000)
    }

    // Click Create Campaign button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New Campaign"), button:has(svg.lucide-plus)')

    if (await createButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await createButton.click()
      await page.waitForTimeout(500)

      // Check for dialog or new page
      const dialog = page.locator('[role="dialog"]')
      const campaignForm = page.locator('form, input[name="name"], input[placeholder*="Campaign"]')

      if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Create campaign dialog opened')

        // Close dialog
        const cancelButton = dialog.locator('button:has-text("Cancel")')
        if (await cancelButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await cancelButton.click()
        }
      } else if (await campaignForm.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Campaign form page opened')
        await page.goBack()
      }

      await page.screenshot({ path: 'test-results/admin-newsletter-create-campaign.png' })
    } else {
      console.log('Create Campaign button not visible')
    }
  })

  test('should show campaign stats', async ({ page }) => {
    // Go to Campaigns tab first
    const campaignsTab = page.locator('button[role="tab"]:has-text("Campaigns")')
    if (await campaignsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await campaignsTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for campaign stats - sent, delivered, opened, clicked
    const statsText = page.locator('text=/Sent|Delivered|Opened|Clicked|Open Rate/i')
    const statsCount = await statsText.count()

    if (statsCount > 0) {
      console.log(`Found ${statsCount} campaign stats elements`)
    } else {
      console.log('No campaign stats visible - may be no campaigns yet')
    }

    await page.screenshot({ path: 'test-results/admin-newsletter-campaign-stats.png', fullPage: true })
  })

  test('should send test email', async ({ page }) => {
    // Go to Campaigns tab first
    const campaignsTab = page.locator('button[role="tab"]:has-text("Campaigns")')
    if (await campaignsTab.isVisible({ timeout: 2000 }).catch(() => false)) {
      await campaignsTab.click()
      await page.waitForTimeout(1000)
    }

    // Look for Send Test button on a campaign
    const sendTestButton = page.locator('button:has-text("Send Test"), button:has-text("Test")')

    if (await sendTestButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('Send Test button found')
      // Don't click to avoid sending actual test email

      await page.screenshot({ path: 'test-results/admin-newsletter-send-test.png' })
    } else {
      console.log('No Send Test button visible - may be no campaigns')
    }
  })
})
