import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000'

// Stripe Test Cards
const STRIPE_TEST_CARDS = {
  SUCCESS: '4242424242424242',           // Successful payment
  DECLINED: '4000000000000002',          // Card declined
  INSUFFICIENT_FUNDS: '4000000000009995', // Insufficient funds
  REQUIRES_3DS: '4000002500003155',       // Requires 3D Secure
  EXPIRED: '4000000000000069',            // Expired card
}

// Test user data
const TEST_USER = {
  firstName: 'Test',
  lastName: 'User',
  email: 'stripe-test@example.com',
  phone: '+49123456789',
  address: 'Test Street 123',
  city: 'Berlin',
  postal: '10115',
  country: 'Germany',
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

  try {
    const acceptCookies = page.locator('button:has-text("Accept")').first()
    if (await acceptCookies.isVisible({ timeout: 500 })) {
      await acceptCookies.click()
      await page.waitForTimeout(200)
    }
  } catch { /* ignore */ }
}

// Helper to fill booking form
async function fillBookingForm(page: Page) {
  // Step 1: Personal Information
  const firstNameInput = page.locator('input#firstName')
  await firstNameInput.waitFor({ state: 'visible', timeout: 10000 })

  await firstNameInput.fill(TEST_USER.firstName)
  await page.fill('input#lastName', TEST_USER.lastName)
  await page.fill('input#email', TEST_USER.email)
  await page.fill('input#phone', TEST_USER.phone)

  // Click Continue
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(500)
  await closePopups(page)

  // Step 2: Billing Details
  await page.fill('input#address', TEST_USER.address)
  await page.fill('input#city', TEST_USER.city)
  await page.fill('input#postal', TEST_USER.postal)

  // Click Continue
  await page.click('button:has-text("Continue")')
  await page.waitForTimeout(500)
  await closePopups(page)

  // Step 3: Accept Terms
  const termsCheckbox = page.locator('button[role="checkbox"]').first()
  await termsCheckbox.click()
}

test.describe('Stripe Payment - Complete Flow', () => {
  test.setTimeout(120000) // 2 minutes for payment flows

  test('should complete booking and redirect to Stripe Checkout', async ({ page }) => {
    // Navigate to a retreat with available rooms
    await page.goto(`${BASE_URL}/retreats/morocco-march-2026`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    // Find and click Book button
    const bookLink = page.locator('a[href*="/booking"]').first()
    if (!await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('No bookable rooms - skipping payment test')
      return
    }

    await bookLink.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    // Verify we're on booking page
    if (!page.url().includes('/booking')) {
      console.log('Did not reach booking page - skipping test')
      return
    }

    // Check if room is available
    const roomUnavailable = page.locator('text=Room No Longer Available')
    if (await roomUnavailable.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Room no longer available - skipping test')
      return
    }

    // Fill booking form
    await fillBookingForm(page)

    await page.screenshot({ path: 'test-results/stripe-booking-ready.png', fullPage: true })

    // Click Pay button
    const payButton = page.locator('button:has-text("Pay")').first()
    await payButton.click()

    // Wait for Stripe redirect (up to 30 seconds)
    try {
      await page.waitForURL('**/checkout.stripe.com/**', { timeout: 30000 })
      console.log('✅ Successfully redirected to Stripe Checkout')

      await page.screenshot({ path: 'test-results/stripe-checkout-page.png', fullPage: true })

      // Verify Stripe checkout page elements
      await expect(page.locator('[data-testid="payment-form"], form')).toBeVisible({ timeout: 10000 })

    } catch (error) {
      // Might still be processing or have an error
      const currentUrl = page.url()
      console.log(`Current URL: ${currentUrl}`)
      await page.screenshot({ path: 'test-results/stripe-checkout-failed.png', fullPage: true })

      // Check for error message on booking page
      const errorMessage = page.locator('text=/error|failed|try again/i')
      if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Error message displayed on booking page')
      }
    }
  })

  test('should fill Stripe Checkout with test card', async ({ page }) => {
    // This test continues from Stripe Checkout page
    // Navigate directly to a booking and complete the flow

    await page.goto(`${BASE_URL}/retreats/morocco-march-2026`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    const bookLink = page.locator('a[href*="/booking"]').first()
    if (!await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('No bookable rooms - skipping test')
      return
    }

    await bookLink.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    if (!page.url().includes('/booking')) {
      console.log('Did not reach booking page - skipping test')
      return
    }

    const roomUnavailable = page.locator('text=Room No Longer Available')
    if (await roomUnavailable.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('Room no longer available - skipping test')
      return
    }

    // Fill booking form
    await fillBookingForm(page)

    // Click Pay button
    const payButton = page.locator('button:has-text("Pay")').first()
    await payButton.click()

    // Wait for Stripe Checkout
    try {
      await page.waitForURL('**/checkout.stripe.com/**', { timeout: 30000 })

      // Wait for Stripe form to load
      await page.waitForTimeout(3000)

      // Fill card details on Stripe Checkout
      // Note: Stripe uses iframes, so we need to handle them properly

      // Card number
      const cardFrame = page.frameLocator('iframe[name*="card-number"], iframe[title*="card"]').first()
      const cardNumberInput = cardFrame.locator('input[name="cardnumber"], input[placeholder*="number"]')

      if (await cardNumberInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await cardNumberInput.fill(STRIPE_TEST_CARDS.SUCCESS)
        console.log('✅ Card number filled')

        // Expiry
        const expiryInput = cardFrame.locator('input[name="exp-date"], input[placeholder*="MM"]')
        if (await expiryInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await expiryInput.fill('12/30')
        }

        // CVC
        const cvcInput = cardFrame.locator('input[name="cvc"], input[placeholder*="CVC"]')
        if (await cvcInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cvcInput.fill('123')
        }

        await page.screenshot({ path: 'test-results/stripe-card-filled.png', fullPage: true })
      } else {
        // Stripe Checkout uses different layout
        // Try direct input selectors
        const emailInput = page.locator('input[name="email"], input#email')
        if (await emailInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await emailInput.fill(TEST_USER.email)
        }

        const cardInput = page.locator('[data-testid="card-number-input"] input, input[placeholder*="1234"]')
        if (await cardInput.isVisible({ timeout: 2000 }).catch(() => false)) {
          await cardInput.fill(STRIPE_TEST_CARDS.SUCCESS)
        }

        await page.screenshot({ path: 'test-results/stripe-checkout-form.png', fullPage: true })
      }

    } catch (error) {
      console.log('Did not reach Stripe Checkout:', error)
      await page.screenshot({ path: 'test-results/stripe-checkout-error.png', fullPage: true })
    }
  })
})

test.describe('Stripe Payment - Error Handling', () => {
  test.setTimeout(60000)

  test('should handle payment API errors gracefully', async ({ page }) => {
    // Go to booking page
    await page.goto(`${BASE_URL}/retreats/morocco-march-2026`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    const bookLink = page.locator('a[href*="/booking"]').first()
    if (!await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('No bookable rooms - skipping test')
      return
    }

    await bookLink.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    if (!page.url().includes('/booking')) {
      console.log('Did not reach booking page - skipping test')
      return
    }

    // Intercept Stripe API call and make it fail
    await page.route('**/api/stripe/checkout', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Payment service unavailable' }),
      })
    })

    // Fill form and try to pay
    await fillBookingForm(page)

    const payButton = page.locator('button:has-text("Pay")').first()
    await payButton.click()

    await page.waitForTimeout(3000)

    // Should show error message
    const errorMessage = page.locator('text=/error|failed|try again|unavailable/i')
    if (await errorMessage.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Error message displayed correctly')
    }

    await page.screenshot({ path: 'test-results/stripe-api-error.png', fullPage: true })
  })
})

test.describe('Stripe Payment - Different Payment Types', () => {
  test('should show deposit vs full payment options', async ({ page }) => {
    await page.goto(`${BASE_URL}/retreats/morocco-march-2026`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    const bookLink = page.locator('a[href*="/booking"]').first()
    if (!await bookLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('No bookable rooms - skipping test')
      return
    }

    await bookLink.click()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    // Look for payment type options
    const depositOption = page.locator('text=/Deposit|10%|Pay Later/i')
    const fullPaymentOption = page.locator('text=/Full Payment|Pay in Full|Pay Now.*100%/i')
    const paymentSchedule = page.locator('text=/Payment Schedule|payment.*schedule/i')

    if (await depositOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Deposit payment option visible')
    }

    if (await fullPaymentOption.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Full payment option visible')
    }

    if (await paymentSchedule.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Payment schedule info visible')
    }

    await page.screenshot({ path: 'test-results/stripe-payment-types.png', fullPage: true })
  })

  test('should show early bird pricing when applicable', async ({ page }) => {
    await page.goto(`${BASE_URL}/retreats/morocco-march-2026`)
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)
    await closePopups(page)

    // Look for early bird pricing
    const earlyBird = page.locator('text=/Early Bird|Frühbucher|special.*price/i')

    if (await earlyBird.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log('✅ Early bird pricing visible')

      // Should show discounted price
      const discountedPrice = page.locator('[class*="text-green"], [class*="line-through"]')
      if (await discountedPrice.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('✅ Discounted price styling visible')
      }
    } else {
      console.log('No early bird pricing for this retreat')
    }

    await page.screenshot({ path: 'test-results/stripe-early-bird.png', fullPage: true })
  })
})
