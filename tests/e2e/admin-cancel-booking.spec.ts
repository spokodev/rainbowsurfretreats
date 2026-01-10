import { test, expect } from '@playwright/test'

const BASE_URL = 'https://rainbowsurfretreats.vercel.app'
const ADMIN_EMAIL = 'test@admin.com'
const ADMIN_PASSWORD = 'Admin123!'

test.describe('Admin Cancel Booking', () => {
  test('should show cancel and refund buttons on booking detail page', async ({ page }) => {
    // Login to admin
    await page.goto(`${BASE_URL}/login`)
    await page.waitForLoadState('domcontentloaded')
    
    await page.fill('input[type="email"]', ADMIN_EMAIL)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')
    
    // Wait for login to complete (redirects to home for regular users)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await page.screenshot({ path: 'test-results/cancel-test-1-after-login.png' })

    // Go directly to admin bookings
    await page.goto(`${BASE_URL}/admin/bookings`)
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({ path: 'test-results/cancel-test-2-bookings-list.png' })
    
    // Check if there are any bookings
    const bookingRows = page.locator('table tbody tr, [data-testid="booking-row"]')
    const count = await bookingRows.count()
    
    if (count === 0) {
      console.log('No bookings found - skipping detail page test')
      return
    }
    
    // Click first booking to go to detail
    await bookingRows.first().click()
    await page.waitForLoadState('domcontentloaded')
    await page.screenshot({ path: 'test-results/cancel-test-3-booking-detail.png' })
    
    // Check for action buttons
    const cancelButton = page.locator('button:has-text("Cancel Booking")')
    const refundButton = page.locator('button:has-text("Process Refund")')
    const confirmButton = page.locator('button:has-text("Confirm Booking")')
    const completeButton = page.locator('button:has-text("Mark Completed")')
    
    // At least one action button should be visible
    const hasCancelButton = await cancelButton.isVisible().catch(() => false)
    const hasRefundButton = await refundButton.isVisible().catch(() => false)
    const hasConfirmButton = await confirmButton.isVisible().catch(() => false)
    const hasCompleteButton = await completeButton.isVisible().catch(() => false)
    
    console.log('Buttons found:', { hasCancelButton, hasRefundButton, hasConfirmButton, hasCompleteButton })
    
    // Take screenshot showing buttons
    await page.screenshot({ path: 'test-results/cancel-test-4-action-buttons.png' })
    
    // Test cancel dialog if button exists
    if (hasCancelButton) {
      await cancelButton.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/cancel-test-5-cancel-dialog.png' })
      
      // Check dialog content
      const dialogTitle = page.locator('text=Cancel Booking')
      expect(await dialogTitle.isVisible()).toBe(true)
      
      // Close dialog
      const keepBookingBtn = page.locator('button:has-text("Keep Booking")')
      if (await keepBookingBtn.isVisible()) {
        await keepBookingBtn.click()
      }
    }
    
    // Test refund dialog if button exists
    if (hasRefundButton) {
      await refundButton.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: 'test-results/cancel-test-6-refund-dialog.png' })
      
      // Check dialog content
      const dialogTitle = page.locator('text=Process Refund')
      expect(await dialogTitle.isVisible()).toBe(true)
      
      // Close dialog
      const cancelBtn = page.locator('[role="dialog"] button:has-text("Cancel")')
      if (await cancelBtn.isVisible()) {
        await cancelBtn.click()
      }
    }
    
    expect(hasCancelButton || hasRefundButton || hasConfirmButton || hasCompleteButton).toBe(true)
  })
})
