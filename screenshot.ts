import { chromium } from '@playwright/test';

async function takeScreenshots() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const screenshotsDir = './screenshots';

  // Homepage
  await page.goto('http://localhost:3001/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${screenshotsDir}/1-homepage.png`, fullPage: false });
  console.log('✅ Homepage screenshot');

  // Retreat detail
  await page.goto('http://localhost:3001/retreats/1');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${screenshotsDir}/2-retreat.png`, fullPage: false });
  console.log('✅ Retreat screenshot');

  // Booking
  await page.goto('http://localhost:3001/booking?retreatId=1');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${screenshotsDir}/3-booking.png`, fullPage: false });
  console.log('✅ Booking screenshot');

  // Login
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${screenshotsDir}/4-login.png`, fullPage: false });
  console.log('✅ Login screenshot');

  // Login and go to admin
  await page.fill('input[type="email"]', 'admin@rainbowsurfretreats.com');
  await page.fill('input[type="password"]', 'RainbowSurf2024!');
  await page.click('button[type="submit"]');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${screenshotsDir}/5-admin.png`, fullPage: false });
  console.log('✅ Admin screenshot');

  await browser.close();
  console.log('\n📸 Screenshots saved to ./screenshots/');
}

takeScreenshots().catch(console.error);
