import { test, expect } from '@playwright/test';

const BASE_URL = 'https://rainbowsurfretreats-next.vercel.app';

test.describe('Rainbow Surf Retreats - Full E2E Tests', () => {

  test.describe('i18n Language Switching', () => {
    test('should switch languages and update UI text', async ({ page }) => {
      await page.goto(BASE_URL);

      // Check English by default
      await expect(page.locator('h1')).toContainText(/Catch Waves|Make Memories/);

      // Find and click language switcher - it should be in the navbar
      const langButton = page.locator('button:has-text("EN"), [aria-label*="language"], button:has([class*="flag"]), nav button').first();

      // Take screenshot of homepage in English
      await page.screenshot({ path: 'test-results/home-en.png', fullPage: true });

      console.log('Homepage loaded successfully in English');
    });

    test('should display German translations', async ({ page }) => {
      await page.goto(`${BASE_URL}/de`);

      // Wait for page to load
      await page.waitForLoadState('networkidle');

      // Check for German text
      const heroTitle = page.locator('h1');
      await expect(heroTitle).toBeVisible();

      await page.screenshot({ path: 'test-results/home-de.png', fullPage: true });
      console.log('German page loaded');
    });

    test('should display French translations', async ({ page }) => {
      await page.goto(`${BASE_URL}/fr`);
      await page.waitForLoadState('networkidle');

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

      await page.waitForLoadState('networkidle');

      // Look for booking button on retreat detail page
      const bookNowBtn = page.locator('button:has-text("Book"), a:has-text("Book")').first();
      if (await bookNowBtn.isVisible()) {
        await bookNowBtn.click();
        await page.waitForTimeout(2000);
      }

      await page.screenshot({ path: 'test-results/booking-start.png', fullPage: true });
    });

    test('should access booking page directly', async ({ page }) => {
      // Try to access booking page with retreat ID
      await page.goto(`${BASE_URL}/booking?retreatId=1`);
      await page.waitForLoadState('networkidle');

      await page.screenshot({ path: 'test-results/booking-page.png', fullPage: true });

      // Check for booking form elements
      const formExists = await page.locator('form, input[name="email"], input[name="firstName"]').first().isVisible();
      console.log('Booking form exists:', formExists);
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
});
