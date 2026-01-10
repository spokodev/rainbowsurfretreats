import { test, expect } from '@playwright/test'

const BASE_URL = 'https://rainbowsurfretreats.vercel.app'
const ADMIN_EMAIL = 'test@admin.com'
const ADMIN_PASSWORD = 'Admin123!'

test.describe('Admin Booking Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Login to admin
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
  })

  test('should show booking list with test bookings', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({ path: 'test-results/actions-1-bookings-list.png' })

    // Check for test bookings
    const pendingBooking = page.locator('text=TEST-PENDING-001')
    const confirmedBooking = page.locator('text=TEST-CONFIRMED-001')
    const refundBooking = page.locator('text=TEST-REFUND-001')

    expect(await pendingBooking.isVisible() || await confirmedBooking.isVisible() || await refundBooking.isVisible()).toBe(true)
  })

  test('should show Confirm button for pending booking with deposit', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find pending booking row and click the eye (view) button
    const pendingRow = page.locator('tr:has-text("TEST-PENDING-001")')
    if (await pendingRow.isVisible()) {
      // Click on the eye icon link to go to detail page
      const viewButton = pendingRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/actions-2-pending-detail.png' })

      // Should show Confirm Booking button
      const confirmButton = page.locator('button:has-text("Confirm Booking")')
      expect(await confirmButton.isVisible()).toBe(true)

      // Should show Cancel Booking button
      const cancelButton = page.locator('button:has-text("Cancel Booking")')
      expect(await cancelButton.isVisible()).toBe(true)
    }
  })

  test('should show action buttons for confirmed booking', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find confirmed booking row and click the eye (view) button
    const confirmedRow = page.locator('tr:has-text("TEST-CONFIRMED-001")')
    if (await confirmedRow.isVisible()) {
      const viewButton = confirmedRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/actions-3-confirmed-detail.png' })

      // Should show Cancel Booking button
      const cancelButton = page.locator('button:has-text("Cancel Booking")')
      expect(await cancelButton.isVisible()).toBe(true)
    }
  })

  test('should show Refund button for paid booking', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find refund booking row and click the eye (view) button
    const refundRow = page.locator('tr:has-text("TEST-REFUND-001")')
    if (await refundRow.isVisible()) {
      const viewButton = refundRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)
      await page.screenshot({ path: 'test-results/actions-4-refund-detail.png' })

      // Should show Process Refund button
      const refundButton = page.locator('button:has-text("Process Refund")')
      expect(await refundButton.isVisible()).toBe(true)
    }
  })

  test('should open Cancel Booking dialog', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find pending booking and go to detail
    const pendingRow = page.locator('tr:has-text("TEST-PENDING-001")')
    if (await pendingRow.isVisible()) {
      const viewButton = pendingRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      const cancelButton = page.locator('button:has-text("Cancel Booking")')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/actions-5-cancel-dialog.png' })

        // Check dialog is open
        const dialogTitle = page.locator('[role="dialog"] h2, [role="alertdialog"] h2').filter({ hasText: /Cancel/i })
        expect(await dialogTitle.isVisible()).toBe(true)

        // Check for reason textarea
        const reasonInput = page.locator('[role="dialog"] textarea, [role="alertdialog"] textarea')
        expect(await reasonInput.isVisible()).toBe(true)

        // Check for email checkbox
        const emailCheckbox = page.locator('[role="dialog"] input[type="checkbox"], [role="alertdialog"] input[type="checkbox"]')
        expect(await emailCheckbox.isVisible()).toBe(true)

        // Close dialog
        const closeButton = page.locator('button:has-text("Keep Booking")')
        await closeButton.click()
      }
    }
  })

  test('should open Refund dialog for paid booking', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find refund booking and go to detail
    const refundRow = page.locator('tr:has-text("TEST-REFUND-001")')
    if (await refundRow.isVisible()) {
      const viewButton = refundRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      const refundButton = page.locator('button:has-text("Process Refund")')
      if (await refundButton.isVisible()) {
        await refundButton.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: 'test-results/actions-6-refund-dialog.png' })

        // Check dialog is open
        const dialogTitle = page.locator('[role="dialog"] h2, [role="alertdialog"] h2').filter({ hasText: /Refund/i })
        expect(await dialogTitle.isVisible()).toBe(true)

        // Check for amount input
        const amountInput = page.locator('[role="dialog"] input[type="number"], [role="alertdialog"] input[type="number"]')
        expect(await amountInput.isVisible()).toBe(true)

        // Close dialog
        const closeButton = page.locator('[role="dialog"] button:has-text("Cancel"), [role="alertdialog"] button:has-text("Cancel")')
        await closeButton.click()
      }
    }
  })

  test('should execute Cancel Booking action', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')

    // Find TEST-PENDING-001 booking (fresh booking to cancel)
    const pendingRow = page.locator('tr:has-text("TEST-PENDING-001")')
    if (await pendingRow.isVisible()) {
      const viewButton = pendingRow.locator('a[href*="/admin/bookings/"]')
      await viewButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      const cancelButton = page.locator('button:has-text("Cancel Booking")')
      if (await cancelButton.isVisible()) {
        await cancelButton.click()
        await page.waitForTimeout(500)

        // Fill in reason
        const reasonInput = page.locator('[role="dialog"] textarea, [role="alertdialog"] textarea')
        await reasonInput.fill('Test cancellation via Playwright')

        // Uncheck email (don't send real email)
        const emailCheckbox = page.locator('[role="dialog"] input[type="checkbox"], [role="alertdialog"] input[type="checkbox"]')
        if (await emailCheckbox.isChecked()) {
          await emailCheckbox.uncheck()
        }

        await page.screenshot({ path: 'test-results/actions-7-cancel-filled.png' })

        // Submit cancel - find the red destructive button
        const confirmCancelButton = page.locator('[role="dialog"] button.bg-destructive, [role="dialog"] button:has-text("Cancel Booking"):not(:has-text("Keep"))')
        await confirmCancelButton.click()

        await page.waitForTimeout(2000)
        await page.screenshot({ path: 'test-results/actions-8-after-cancel.png' })

        // Check for success - page should show cancelled status or we should be back on list
        const cancelledBadge = page.locator('text=cancelled').first()
        const successToast = page.locator('[data-sonner-toast]')

        expect(await cancelledBadge.isVisible() || await successToast.isVisible()).toBe(true)
      }
    }
  })
})
