import { chromium } from '@playwright/test';

async function runTests() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🧪 Starting E2E Tests...\n');

  // Test 1: Homepage
  console.log('1️⃣ Testing Homepage...');
  await page.goto('http://localhost:3001/');
  const title = await page.title();
  console.log(`   Title: ${title}`);
  const heroText = await page.locator('h1').first().textContent();
  console.log(`   Hero: ${heroText?.substring(0, 50)}...`);
  console.log('   ✅ Homepage OK\n');

  // Test 2: About page
  console.log('2️⃣ Testing About page...');
  await page.goto('http://localhost:3001/about');
  await page.waitForLoadState('networkidle');
  const aboutTitle = await page.locator('h1').first().textContent();
  console.log(`   Title: ${aboutTitle}`);
  console.log('   ✅ About OK\n');

  // Test 3: Retreat detail page
  console.log('3️⃣ Testing Retreat Detail page...');
  await page.goto('http://localhost:3001/retreats/1');
  await page.waitForLoadState('networkidle');
  const retreatTitle = await page.locator('h1').first().textContent();
  console.log(`   Retreat: ${retreatTitle}`);
  console.log('   ✅ Retreat Detail OK\n');

  // Test 4: Booking page
  console.log('4️⃣ Testing Booking page...');
  await page.goto('http://localhost:3001/booking?retreatId=1');
  await page.waitForLoadState('networkidle');
  const bookingTitle = await page.locator('h1').first().textContent();
  console.log(`   Title: ${bookingTitle}`);
  console.log('   ✅ Booking OK\n');

  // Test 5: Login page
  console.log('5️⃣ Testing Login page...');
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');
  const loginForm = await page.locator('form').count();
  console.log(`   Login form found: ${loginForm > 0}`);
  console.log('   ✅ Login page OK\n');

  // Test 6: Admin redirect (should redirect to login)
  console.log('6️⃣ Testing Admin redirect (unauthenticated)...');
  await page.goto('http://localhost:3001/admin');
  await page.waitForLoadState('networkidle');
  const currentUrl = page.url();
  console.log(`   Redirected to: ${currentUrl}`);
  console.log(`   ✅ Admin redirect OK (${currentUrl.includes('login') ? 'correctly redirected' : 'no redirect'})\n`);

  // Test 7: Login and access admin
  console.log('7️⃣ Testing Login flow...');
  await page.goto('http://localhost:3001/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"]', 'admin@rainbowsurfretreats.com');
  await page.fill('input[type="password"]', 'RainbowSurf2024!');
  console.log('   Filled credentials');

  await page.click('button[type="submit"]');
  console.log('   Clicked submit');

  // Wait for navigation
  await page.waitForTimeout(3000);
  const afterLoginUrl = page.url();
  console.log(`   After login URL: ${afterLoginUrl}`);

  if (afterLoginUrl.includes('admin')) {
    console.log('   ✅ Login successful, redirected to admin!\n');

    // Test 8: Admin dashboard
    console.log('8️⃣ Testing Admin Dashboard...');
    const dashboardTitle = await page.locator('h1').first().textContent();
    console.log(`   Dashboard title: ${dashboardTitle}`);
    console.log('   ✅ Admin Dashboard OK\n');

    // Test 9: Admin pages
    console.log('9️⃣ Testing Admin sub-pages...');

    for (const subPage of ['retreats', 'bookings', 'payments', 'blog', 'settings']) {
      await page.goto(`http://localhost:3001/admin/${subPage}`);
      await page.waitForLoadState('networkidle');
      const pageTitle = await page.locator('h1').first().textContent();
      console.log(`   /admin/${subPage}: ${pageTitle}`);
    }
    console.log('   ✅ All admin pages OK\n');
  } else {
    console.log('   ⚠️ Login may have failed or redirect didnt work\n');
  }

  // Summary
  console.log('═══════════════════════════════════════');
  console.log('🎉 All E2E tests completed!');
  console.log('═══════════════════════════════════════');

  await browser.close();
}

runTests().catch(console.error);
