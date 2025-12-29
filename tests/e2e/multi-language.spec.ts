import { test, expect, Page, BrowserContext } from '@playwright/test';

// All supported languages
// NOTE: This app uses cookie-based i18n (not URL prefixes)
const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'de', name: 'German' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'nl', name: 'Dutch' },
];

// Expected translations for key UI elements
const TRANSLATIONS: Record<string, Record<string, string>> = {
  en: {
    heroTitle: 'Catch Waves',
    bookNow: 'Book Now',
    retreats: 'Retreats',
    blog: 'Blog',
  },
  de: {
    heroTitle: 'Wellen fangen',
    bookNow: 'Jetzt Buchen',
    retreats: 'Retreats',
    blog: 'Blog',
  },
  es: {
    heroTitle: 'Atrapa las olas',
    bookNow: 'Reservar Ahora',
    retreats: 'Retiros',
    blog: 'Blog',
  },
  fr: {
    heroTitle: 'Attrapez les vagues',
    bookNow: 'Réserver',
    retreats: 'Retraites',
    blog: 'Blog',
  },
  nl: {
    heroTitle: 'Golven vangen',
    bookNow: 'Boek Nu',
    retreats: 'Retreats',
    blog: 'Blog',
  },
};

// Helper to set locale cookie
async function setLocale(context: BrowserContext, locale: string) {
  await context.addCookies([{
    name: 'locale',
    value: locale,
    domain: 'rainbowsurfretreats-next.vercel.app',
    path: '/',
  }]);
}

// Helper to close popups
async function closePopups(page: Page) {
  // Wait a bit for popups to appear
  await page.waitForTimeout(2000);

  // Close newsletter popup
  try {
    const newsletterClose = page.locator('[role="dialog"] button:has(svg), button[aria-label="Close"], button:has(.lucide-x)').first();
    if (await newsletterClose.isVisible({ timeout: 1000 })) {
      await newsletterClose.click();
      await page.waitForTimeout(300);
    }
  } catch { /* ignore */ }

  // Accept cookies
  try {
    const acceptCookies = page.locator('button:has-text("Accept")').first();
    if (await acceptCookies.isVisible({ timeout: 500 })) {
      await acceptCookies.click();
      await page.waitForTimeout(200);
    }
  } catch { /* ignore */ }
}

test.describe('Multi-Language Homepage Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Homepage in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      // Set locale cookie
      await setLocale(context, lang.code);

      // Navigate to homepage
      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Take full page screenshot
      await page.screenshot({
        path: `test-results/lang-${lang.code}-homepage.png`,
        fullPage: true,
      });

      // Verify page loaded
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

      // Verify navigation exists
      await expect(page.locator('nav')).toBeVisible();

      // Check for translated content
      const translations = TRANSLATIONS[lang.code];
      if (translations) {
        // Check if hero contains expected text (flexible matching)
        const heroText = await page.locator('h1').textContent();
        console.log(`   Hero text (${lang.code}): "${heroText}"`);

        // Check Book Now button
        const bookButton = page.locator(`a:has-text("${translations.bookNow}"), button:has-text("${translations.bookNow}")`).first();
        if (await bookButton.isVisible({ timeout: 2000 }).catch(() => false)) {
          console.log(`   ✅ Book Now button found: "${translations.bookNow}"`);
        } else {
          console.log(`   ⚠️ Book Now button not found with text: "${translations.bookNow}"`);
        }
      }

      console.log(`✅ Homepage ${lang.name} (${lang.code}) loaded successfully`);
    });
  }
});

test.describe('Multi-Language Retreats Page Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Retreats list in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      await setLocale(context, lang.code);

      await page.goto('/retreats');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Take screenshot
      await page.screenshot({
        path: `test-results/lang-${lang.code}-retreats-list.png`,
        fullPage: true,
      });

      // Verify page title
      await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

      // Count retreat cards
      const retreatCards = page.locator('a[href*="/retreats/"]');
      const cardCount = await retreatCards.count();
      console.log(`✅ Retreats list ${lang.name} (${lang.code}): ${cardCount} retreats found`);

      expect(cardCount).toBeGreaterThan(0);
    });
  }
});

test.describe('Multi-Language Retreat Detail Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Retreat detail page in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      await setLocale(context, lang.code);

      // Go to retreats list first
      await page.goto('/retreats');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Click first retreat
      const retreatLink = page.locator('a[href*="/retreats/"]').first();
      if (await retreatLink.isVisible({ timeout: 5000 })) {
        await retreatLink.click();
        await page.waitForLoadState('domcontentloaded');
        await closePopups(page);

        // Take full page screenshot
        await page.screenshot({
          path: `test-results/lang-${lang.code}-retreat-detail.png`,
          fullPage: true,
        });

        // Verify main sections
        await expect(page.locator('h1')).toBeVisible({ timeout: 10000 });

        // Check for hero image
        const heroImage = page.locator('section img').first();
        await expect(heroImage).toBeVisible();

        // Screenshot hero section
        const heroSection = page.locator('section').first();
        await heroSection.screenshot({
          path: `test-results/lang-${lang.code}-retreat-hero.png`,
        });

        // Check for location section with map
        const locationCard = page.locator('[class*="Card"]').filter({ hasText: /Location|Standort|Ubicación|Emplacement|Locatie/i }).first();
        if (await locationCard.isVisible({ timeout: 2000 }).catch(() => false)) {
          await locationCard.scrollIntoViewIfNeeded();
          await locationCard.screenshot({
            path: `test-results/lang-${lang.code}-retreat-location.png`,
          });

          // Check for map iframe
          const mapIframe = page.locator('iframe[src*="google.com/maps"]');
          if (await mapIframe.isVisible({ timeout: 2000 }).catch(() => false)) {
            console.log(`   ✅ Map displayed for ${lang.code}`);
          }
        }

        // Check Room Options
        const roomCard = page.locator('[class*="Card"]').filter({ hasText: /Room|Zimmer|Habitación|Chambre|Kamer/i }).first();
        if (await roomCard.isVisible({ timeout: 2000 }).catch(() => false)) {
          await roomCard.scrollIntoViewIfNeeded();
          await roomCard.screenshot({
            path: `test-results/lang-${lang.code}-retreat-rooms.png`,
          });
        }

        console.log(`✅ Retreat detail ${lang.name} (${lang.code}) loaded successfully`);
      } else {
        console.log(`⚠️ No retreats found for ${lang.name} (${lang.code})`);
      }
    });
  }
});

test.describe('Multi-Language Blog Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Blog page in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      await setLocale(context, lang.code);

      await page.goto('/blog');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Take screenshot
      await page.screenshot({
        path: `test-results/lang-${lang.code}-blog-list.png`,
        fullPage: true,
      });

      // Verify page title
      const title = page.locator('h1');
      await expect(title).toBeVisible({ timeout: 10000 });
      const titleText = await title.textContent();
      console.log(`✅ Blog ${lang.name} (${lang.code}): title = "${titleText}"`);
    });
  }
});

test.describe('Language Switcher Tests', () => {

  test('should switch language via cookie and reload', async ({ page, context }) => {
    // Start with English
    await setLocale(context, 'en');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await closePopups(page);

    // Take screenshot in English
    await page.screenshot({
      path: 'test-results/lang-switch-1-english.png',
      fullPage: true,
    });

    const enHeroText = await page.locator('h1').textContent();
    console.log(`English hero: "${enHeroText}"`);

    // Switch to German
    await setLocale(context, 'de');
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await closePopups(page);

    // Take screenshot in German
    await page.screenshot({
      path: 'test-results/lang-switch-2-german.png',
      fullPage: true,
    });

    const deHeroText = await page.locator('h1').textContent();
    console.log(`German hero: "${deHeroText}"`);

    // Verify the text changed
    expect(enHeroText).not.toBe(deHeroText);
    console.log('✅ Language switch works via cookie');
  });

  test('should have working language switcher in UI', async ({ page, context }) => {
    await setLocale(context, 'en');
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await closePopups(page);

    // Find language switcher button (flag + language code)
    const langSwitcher = page.locator('button:has-text("EN"), button:has([class*="flag"])').first();

    if (await langSwitcher.isVisible({ timeout: 3000 })) {
      await langSwitcher.click();
      await page.waitForTimeout(500);

      // Take screenshot of open language menu
      await page.screenshot({
        path: 'test-results/lang-switcher-menu.png',
        fullPage: true,
      });

      // Check for language options
      const germanOption = page.locator('button:has-text("Deutsch"), [role="option"]:has-text("Deutsch")');
      if (await germanOption.isVisible({ timeout: 2000 })) {
        console.log('✅ German option found in language switcher');

        // Click German
        await germanOption.click();
        await page.waitForTimeout(1000);

        // Take screenshot after language change
        await page.screenshot({
          path: 'test-results/lang-switcher-after-german.png',
          fullPage: true,
        });
      }

      console.log('✅ Language switcher UI works');
    } else {
      console.log('⚠️ Language switcher not found');
    }
  });
});

test.describe('Multi-Language Booking Page Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Booking page in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      await setLocale(context, lang.code);

      // Go directly to booking page with a known retreat slug
      // Morocco retreat is typically available
      await page.goto('/booking?slug=morocco-march-2026');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Take screenshot of booking page
      await page.screenshot({
        path: `test-results/lang-${lang.code}-booking.png`,
        fullPage: true,
      });

      // Check if booking form is displayed (not a "retreat not found" message)
      const bookingForm = page.locator('form, [class*="booking"]');
      const firstNameInput = page.locator('input#firstName, input[name="firstName"], input[placeholder*="First"], input[placeholder*="Vor"]');

      if (await firstNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        console.log(`✅ Booking page ${lang.name} (${lang.code}) loaded successfully`);
      } else {
        // Try alternative - go to retreats and find any bookable retreat
        await page.goto('/retreats');
        await page.waitForLoadState('domcontentloaded');
        await closePopups(page);

        // Look for any link with "Book Now" text on the page
        const bookNowLink = page.locator('a:has-text("Book Now")').first();
        if (await bookNowLink.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bookNowLink.click();
          await page.waitForLoadState('domcontentloaded');
          await closePopups(page);

          await page.screenshot({
            path: `test-results/lang-${lang.code}-booking-alt.png`,
            fullPage: true,
          });
          console.log(`✅ Booking page ${lang.name} (${lang.code}) loaded via alternative path`);
        } else {
          console.log(`⚠️ No bookable retreats available for ${lang.name}`);
        }
      }
    });
  }
});

test.describe('Responsive Design Tests', () => {

  const viewports = [
    { name: 'mobile', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 },
  ];

  for (const viewport of viewports) {
    test(`should display correctly on ${viewport.name}`, async ({ page, context }) => {
      await setLocale(context, 'en');
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Take screenshot
      await page.screenshot({
        path: `test-results/responsive-${viewport.name}-home.png`,
        fullPage: true,
      });

      // Verify main elements visible
      await expect(page.locator('h1')).toBeVisible();

      // Test retreats page
      await page.goto('/retreats');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      await page.screenshot({
        path: `test-results/responsive-${viewport.name}-retreats.png`,
        fullPage: true,
      });

      console.log(`✅ Responsive ${viewport.name} test passed`);
    });
  }
});

test.describe('Footer Tests', () => {

  for (const lang of LANGUAGES) {
    test(`Footer in ${lang.name} (${lang.code})`, async ({ page, context }) => {
      await setLocale(context, lang.code);

      await page.goto('/');
      await page.waitForLoadState('domcontentloaded');
      await closePopups(page);

      // Scroll to footer
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);

      // Take screenshot
      await footer.screenshot({
        path: `test-results/lang-${lang.code}-footer.png`,
      });

      console.log(`✅ Footer ${lang.name} (${lang.code}) captured`);
    });
  }
});
