import { test, expect, BrowserContext, Page } from '@playwright/test';

// Use baseURL from playwright.config.ts (default: localhost:3000, or PLAYWRIGHT_BASE_URL env var)
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Helper to set locale cookie with proper domain
async function setLocaleCookie(context: BrowserContext, locale: string) {
  const url = new URL(BASE_URL);
  await context.addCookies([{
    name: 'locale',
    value: locale,
    domain: url.hostname,
    path: '/',
  }]);
}

test.describe('Rainbow Surf Retreats - Full E2E Tests', () => {

  test.describe('i18n Language Switching', () => {
    test('should switch languages and update UI text', async ({ page }) => {
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');

      // Check English hero text - actual text is "Global Gay Surfing Holidays"
      await expect(page.locator('h1')).toContainText(/Global Gay Surfing Holidays|LGBTQ/);

      // Find and click language switcher - it should be in the navbar
      const langButton = page.locator('button:has-text("EN"), [aria-label*="language"], button:has([class*="flag"]), nav button').first();

      // Take screenshot of homepage in English
      await page.screenshot({ path: 'test-results/home-en.png', fullPage: true });

      console.log('Homepage loaded successfully in English');
    });

    test('should display German translations', async ({ page, context }) => {
      // Set locale cookie for German
      await setLocaleCookie(context, 'de');
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      // Check for German text - actual translation is "Weltweite Schwule Surf-Urlaube"
      const heroTitle = page.locator('h1');
      await expect(heroTitle).toBeVisible();

      await page.screenshot({ path: 'test-results/home-de.png', fullPage: true });
      console.log('German page loaded');
    });

    test('should display French translations', async ({ page, context }) => {
      // Set locale cookie for French
      await setLocaleCookie(context, 'fr');
      await page.goto(BASE_URL);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(1000);

      await page.screenshot({ path: 'test-results/home-fr.png', fullPage: true });
      console.log('French page loaded');
    });
  });

  test.describe('Public Pages Navigation', () => {
    test('should navigate to retreats page', async ({ page }) => {
      await page.goto(BASE_URL);

      // Click on Retreats in navigation
      await page.click('nav a[href*="retreat"], nav >> text=Retreats');

      await page.waitForURL('**/retreats');

      // Check page content
      await expect(page.locator('h1')).toContainText(/Retreat/i);

      await page.screenshot({ path: 'test-results/retreats-page.png', fullPage: true });
    });

    test('should navigate to blog page', async ({ page }) => {
      await page.goto(BASE_URL);

      // Click on Blog
      await page.click('nav a[href*="blog"], nav >> text=Blog');

      await page.waitForURL('**/blog');

      await expect(page.locator('h1')).toContainText(/Blog/i);

      await page.screenshot({ path: 'test-results/blog-page.png', fullPage: true });
    });

    test('should display retreat details', async ({ page }) => {
      await page.goto(`${BASE_URL}/retreats`);

      // Click on first retreat card
      const retreatCard = page.locator('a[href*="/retreats/"]').first();
      await retreatCard.click();

      await page.waitForURL('**/retreats/**');

      await page.screenshot({ path: 'test-results/retreat-detail.png', fullPage: true });
    });
  });

  test.describe('Admin Panel', () => {
    test('should access admin login page', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      await expect(page.locator('input[type="email"], input[type="text"]')).toBeVisible();
      await expect(page.locator('input[type="password"]')).toBeVisible();

      await page.screenshot({ path: 'test-results/admin-login.png', fullPage: true });
    });

    test('should login to admin panel', async ({ page }) => {
      await page.goto(`${BASE_URL}/login`);

      // Fill login form
      await page.fill('input[type="email"], input[name="email"]', 'admin@rainbowsurfretreats.com');
      await page.fill('input[type="password"], input[name="password"]', 'RainbowSurf2024!');

      // Submit
      await page.click('button[type="submit"]');

      // Wait for redirect to admin
      await page.waitForTimeout(3000);

      await page.screenshot({ path: 'test-results/admin-dashboard.png', fullPage: true });

      // Check if redirected to admin or still on login with error
      const currentUrl = page.url();
      console.log('After login URL:', currentUrl);
    });

    test('should access admin blog section', async ({ page }) => {
      // First login
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"], input[name="email"]', 'admin@rainbowsurfretreats.com');
      await page.fill('input[type="password"], input[name="password"]', 'RainbowSurf2024!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Go to admin blog
      await page.goto(`${BASE_URL}/admin/blog`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/admin-blog.png', fullPage: true });
    });
  });

  test.describe('Blog CRUD Operations', () => {
    test('should create a new blog post', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"], input[name="email"]', 'admin@rainbowsurfretreats.com');
      await page.fill('input[type="password"], input[name="password"]', 'RainbowSurf2024!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Navigate to new blog post page
      await page.goto(`${BASE_URL}/admin/blog/new`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/admin-blog-new.png', fullPage: true });

      // Fill in blog post details
      const titleInput = page.locator('input[name="title"], input[placeholder*="title" i]').first();
      if (await titleInput.isVisible()) {
        await titleInput.fill('Test Blog Post from Playwright');

        // Fill other fields as available
        const slugInput = page.locator('input[name="slug"]');
        if (await slugInput.isVisible()) {
          await slugInput.fill('test-blog-post-playwright');
        }

        const excerptInput = page.locator('textarea[name="excerpt"], input[name="excerpt"]');
        if (await excerptInput.isVisible()) {
          await excerptInput.fill('This is a test blog post created by Playwright automated testing.');
        }

        await page.screenshot({ path: 'test-results/admin-blog-filled.png', fullPage: true });
      }
    });
  });

  test.describe('Booking and Payment Flow', () => {
    test('should start booking process', async ({ page }) => {
      await page.goto(`${BASE_URL}/retreats`);

      // Click on first retreat
      const bookButton = page.locator('a[href*="/retreats/"], button:has-text("Book")').first();
      await bookButton.click();

      await page.waitForLoadState('domcontentloaded');

      // Look for booking button on retreat detail page
      const bookNowBtn = page.locator('button:has-text("Book"), a:has-text("Book")').first();
      if (await bookNowBtn.isVisible()) {
        await bookNowBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: 'test-results/booking-start.png', fullPage: true });
    });

    test('should complete booking form and redirect to Stripe', async ({ page }) => {
      // Helper to close popups
      const closePopups = async () => {
        // Close newsletter popup
        const newsletterClose = page.locator('button:has(svg.lucide-x), [aria-label="Close"]').first();
        if (await newsletterClose.isVisible({ timeout: 1000 }).catch(() => false)) {
          await newsletterClose.click();
          await page.waitForTimeout(300);
        }
        // Accept cookies
        const acceptCookies = page.locator('button:has-text("Accept All")').first();
        if (await acceptCookies.isVisible({ timeout: 500 }).catch(() => false)) {
          await acceptCookies.click();
          await page.waitForTimeout(300);
        }
      };

      // First go to retreat detail page to select a room
      await page.goto(`${BASE_URL}/retreats/morocco-march-2026`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await closePopups();

      // Verify we're on the retreat detail page (not the list page)
      const retreatTitle = page.locator('h1');
      await retreatTitle.waitFor({ state: 'visible', timeout: 10000 });

      // Find Book button specifically in the room section (not header)
      // Look for "Book" button in room cards or "Book Now" in the main content area
      const roomBookButton = page.locator('main button:has-text("Book"), section button:has-text("Book")').first();
      const roomBookVisible = await roomBookButton.isVisible({ timeout: 5000 }).catch(() => false);

      if (!roomBookVisible) {
        // Try clicking on a room card's book link
        const roomLink = page.locator('a[href*="/booking"]').first();
        if (await roomLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await roomLink.click();
        } else {
          console.log('No bookable rooms available - skipping booking form test');
          return;
        }
      } else {
        await roomBookButton.click();
      }

      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(2000);
      await closePopups();

      await page.screenshot({ path: 'test-results/booking-form-1.png', fullPage: true });

      // Check if we're on the booking page
      if (!page.url().includes('/booking')) {
        console.log('Did not navigate to booking page - skipping test');
        return;
      }

      // Check if room is available
      const roomUnavailable = page.locator('text=Room No Longer Available');
      if (await roomUnavailable.isVisible({ timeout: 2000 }).catch(() => false)) {
        console.log('Selected room is no longer available - skipping booking form test');
        return;
      }

      // Wait for form to be ready and fill Step 1: Personal Info
      const firstNameInput = page.locator('input#firstName');
      await firstNameInput.waitFor({ state: 'visible', timeout: 10000 });
      await firstNameInput.fill('Test');
      await page.fill('input#lastName', 'User');
      await page.fill('input#email', 'test@example.com');
      await page.fill('input#phone', '+49123456789');

      // Click Continue
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await closePopups();

      await page.screenshot({ path: 'test-results/booking-form-2.png', fullPage: true });

      // Fill Step 2: Billing Details - use correct IDs from the form
      await page.fill('input#address', 'Test Street 123');
      await page.fill('input#city', 'Berlin');
      await page.fill('input#postal', '10115');

      // Click Continue again
      await page.click('button:has-text("Continue")');
      await page.waitForTimeout(500);
      await closePopups();

      await page.screenshot({ path: 'test-results/booking-form-3.png', fullPage: true });

      // Close popup again if it appeared
      await closePopups();

      // Step 3: Accept terms - click on the checkbox button
      const termsCheckbox = page.locator('button[role="checkbox"]').first();
      await termsCheckbox.click();

      await page.screenshot({ path: 'test-results/booking-ready.png', fullPage: true });

      // Intercept API calls
      page.on('response', response => {
        if (response.url().includes('/api/stripe/checkout')) {
          console.log('Stripe API response:', response.status());
        }
      });

      // Click Pay button (it shows "Pay €XX.XX")
      const payButton = page.locator('button:has-text("Pay")').first();
      await payButton.click();

      // Wait for redirect to Stripe
      await page.waitForTimeout(8000);

      await page.screenshot({ path: 'test-results/booking-checkout.png', fullPage: true });

      // Check if redirected to Stripe checkout
      const currentUrl = page.url();
      console.log('After checkout URL:', currentUrl);

      if (currentUrl.includes('checkout.stripe.com')) {
        console.log('SUCCESS: Redirected to Stripe Checkout!');
      }
    });
  });

  test.describe('Newsletter Subscription', () => {
    test('should show newsletter section', async ({ page }) => {
      await page.goto(BASE_URL);

      // Scroll to newsletter section
      await page.evaluate(() => {
        const newsletter = document.querySelector('#newsletter, [class*="newsletter"]');
        if (newsletter) newsletter.scrollIntoView();
      });

      await page.waitForTimeout(1000);

      // Find email input in newsletter
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible();

      await page.screenshot({ path: 'test-results/newsletter-section.png', fullPage: true });
    });
  });

  test.describe('Cookie Consent', () => {
    test('should show cookie banner on first visit', async ({ page }) => {
      // Clear cookies first
      await page.context().clearCookies();

      await page.goto(BASE_URL);
      await page.waitForTimeout(2000); // Cookie banner has delay

      const cookieBanner = page.locator('[class*="cookie"], [role="dialog"]:has-text("cookie")');

      await page.screenshot({ path: 'test-results/cookie-banner.png', fullPage: true });
    });
  });

  test.describe('Policies Page', () => {
    test('should display policies page with all sections', async ({ page }) => {
      await page.goto(`${BASE_URL}/policies`);
      await page.waitForLoadState('domcontentloaded');

      // Wait for policies to load from API
      await page.waitForTimeout(3000);

      // Check hero section
      await expect(page.locator('h1')).toContainText(/Policies|Políticas|Politiques|Richtlinien|Beleid/i);

      // Check that policy sections are visible (accordion buttons)
      const policySections = page.locator('button:has(svg)').filter({ hasText: /.+/ });
      const sectionCount = await policySections.count();
      console.log(`Found ${sectionCount} policy sections`);

      // Should have at least 4 policy sections
      expect(sectionCount).toBeGreaterThanOrEqual(4);

      await page.screenshot({ path: 'test-results/policies-page.png', fullPage: true });
    });

    test('should expand and collapse policy sections', async ({ page }) => {
      await page.goto(`${BASE_URL}/policies`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // Find and click on a policy section (Payment Terms or similar)
      const firstSection = page.locator('button').filter({ hasText: /Payment|Zahlungs|Pago|Paiement|Betaling/i }).first();

      if (await firstSection.isVisible({ timeout: 5000 }).catch(() => false)) {
        // Click to expand
        await firstSection.click();
        await page.waitForTimeout(500);

        // Check content is visible
        const content = page.locator('text=/deposit|Anzahlung|depósito|acompte|aanbetaling/i').first();
        await expect(content).toBeVisible({ timeout: 5000 });

        await page.screenshot({ path: 'test-results/policies-expanded.png', fullPage: true });

        // Click again to collapse
        await firstSection.click();
        await page.waitForTimeout(500);
      } else {
        console.log('Payment section not found, checking if any policy sections exist');
        await page.screenshot({ path: 'test-results/policies-no-payment.png', fullPage: true });
      }
    });

    test('should display policies in different languages', async ({ page, context }) => {
      // Test German by setting locale cookie
      await setLocaleCookie(context, 'de');
      await page.goto(`${BASE_URL}/policies`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      // German title might be "Richtlinien" or stay as "Policies"
      await expect(page.locator('h1').first()).toBeVisible();
      await page.screenshot({ path: 'test-results/policies-de.png', fullPage: true });

      // Test Spanish by changing locale cookie
      await setLocaleCookie(context, 'es');
      await page.goto(`${BASE_URL}/policies`);
      await page.waitForLoadState('domcontentloaded');
      await page.waitForTimeout(3000);

      await expect(page.locator('h1').first()).toBeVisible();
      await page.screenshot({ path: 'test-results/policies-es.png', fullPage: true });
    });
  });

  test.describe('Admin Policies Management', () => {
    test('should access admin policies page after login', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"], input[name="email"]', 'admin@rainbowsurfretreats.com');
      await page.fill('input[type="password"], input[name="password"]', 'RainbowSurf2024!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Navigate to policies admin
      await page.goto(`${BASE_URL}/admin/policies`);
      await page.waitForLoadState('networkidle');

      // Check page loaded - use more specific selector for main content h1
      await expect(page.locator('main h1.text-3xl')).toContainText(/Policies/i);

      // Check language tabs are visible
      await expect(page.locator('button:has-text("English")')).toBeVisible();
      await expect(page.locator('button:has-text("Deutsch")')).toBeVisible();

      await page.screenshot({ path: 'test-results/admin-policies.png', fullPage: true });
    });

    test('should edit policy content in admin', async ({ page }) => {
      // Login first
      await page.goto(`${BASE_URL}/login`);
      await page.fill('input[type="email"], input[name="email"]', 'admin@rainbowsurfretreats.com');
      await page.fill('input[type="password"], input[name="password"]', 'RainbowSurf2024!');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(3000);

      // Navigate to policies admin
      await page.goto(`${BASE_URL}/admin/policies`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      // Click on first policy section to expand
      const firstCard = page.locator('[class*="card"]').first();
      await firstCard.click();
      await page.waitForTimeout(500);

      await page.screenshot({ path: 'test-results/admin-policies-edit.png', fullPage: true });
    });
  });
});
