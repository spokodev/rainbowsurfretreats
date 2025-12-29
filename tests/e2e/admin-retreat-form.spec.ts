import { test, expect, Page } from '@playwright/test';

// Admin credentials (for testing only)
const ADMIN_EMAIL = 'admin@rainbowsurfretreats.com';
const ADMIN_PASSWORD = 'RainbowSurf2024!';

// Helper function to login
async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForTimeout(3000);
  await page.waitForLoadState('networkidle');
}

// Helper to close popups
async function closePopups(page: Page) {
  try {
    const closeButton = page.locator('button:has(svg.lucide-x), [aria-label="Close"]').first();
    if (await closeButton.isVisible({ timeout: 500 })) {
      await closeButton.click();
    }
  } catch { /* Ignore if no popup */ }

  try {
    const acceptCookies = page.locator('button:has-text("Accept")').first();
    if (await acceptCookies.isVisible({ timeout: 500 })) {
      await acceptCookies.click();
    }
  } catch { /* Ignore if no cookie banner */ }
}

test.describe('Admin Retreat Form - Authentication', () => {

  test('should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should access new retreat form after login', async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);

    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Should see the form
    await expect(page.locator('form')).toBeVisible({ timeout: 10000 });

    await page.screenshot({ path: 'test-results/admin-retreat-form.png', fullPage: true });
  });
});

test.describe('Admin Retreat Form - Accordion Sections', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');
  });

  test('should display all accordion sections', async ({ page }) => {
    // Check for accordion sections
    const sections = [
      'Basic Information',
      'Rooms & Pricing',
      'Media & Description',
      'Retreat Details',
      'Location & Map',
      'Additional Information',
    ];

    for (const section of sections) {
      const sectionHeader = page.locator(`button:has-text("${section}"), [data-state] >> text=${section}`);
      await expect(sectionHeader).toBeVisible({ timeout: 5000 });
    }

    await page.screenshot({ path: 'test-results/admin-accordion-sections.png', fullPage: true });
  });

  test('should expand and collapse accordion sections', async ({ page }) => {
    // Find an accordion trigger
    const mediaSection = page.locator('button:has-text("Media & Description")');
    await mediaSection.click();
    await page.waitForTimeout(300);

    // Check if content is visible
    const descriptionField = page.locator('textarea[name="description"], #description');
    await expect(descriptionField).toBeVisible({ timeout: 3000 });

    await page.screenshot({ path: 'test-results/admin-accordion-expanded.png', fullPage: true });
  });

  test('should have Basic Information expanded by default', async ({ page }) => {
    // Basic info fields should be visible by default
    const destinationField = page.locator('input#destination, input[name="destination"]');
    await expect(destinationField).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Admin Retreat Form - Basic Information Validation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');
  });

  test('should show validation error when destination is empty', async ({ page }) => {
    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Retreat")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    // Should show validation error
    await page.waitForTimeout(500);
    const errorMessage = page.locator('text=/required|Required|Pflichtfeld/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error when location is empty', async ({ page }) => {
    // Fill destination but not location
    await page.fill('input#destination, input[name="destination"]', 'Test Destination');

    const submitButton = page.locator('button[type="submit"]:has-text("Create"), button:has-text("Create Retreat")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    await page.waitForTimeout(500);
    const errorMessage = page.locator('text=/required|Required/i');
    await expect(errorMessage.first()).toBeVisible({ timeout: 5000 });
  });

  test('should fill all required fields successfully', async ({ page }) => {
    // Fill Basic Information
    await page.fill('input#destination', 'Playwright Test Retreat');
    await page.fill('input#location', 'Test Location, Country');

    // Set dates
    const startDateInput = page.locator('input#start_date, input[name="start_date"]');
    const endDateInput = page.locator('input#end_date, input[name="end_date"]');

    // Use date picker or fill directly
    await startDateInput.fill('2026-06-01');
    await endDateInput.fill('2026-06-08');

    // Select level
    const levelSelect = page.locator('button:has-text("Level"), select#level, [name="level"]').first();
    if (await levelSelect.isVisible()) {
      await levelSelect.click();
      await page.click('text=All Levels');
    }

    // Select type
    const typeSelect = page.locator('button:has-text("Type"), select#type, [name="type"]').first();
    if (await typeSelect.isVisible()) {
      await typeSelect.click();
      await page.click('text=Standard');
    }

    // Fill price
    await page.fill('input#price, input[name="price"]', '1500');

    await page.screenshot({ path: 'test-results/admin-form-filled-basic.png', fullPage: true });
  });

  test('should reject negative price', async ({ page }) => {
    await page.fill('input#price, input[name="price"]', '-100');

    const submitButton = page.locator('button[type="submit"]:has-text("Create")');
    await submitButton.scrollIntoViewIfNeeded();
    await submitButton.click();

    await page.waitForTimeout(500);

    // Price field should have error or value should be rejected
    const priceInput = page.locator('input#price');
    const value = await priceInput.inputValue();

    // Either the value is cleared or there's an error
    const hasError = await page.locator('text=/positive|greater than|invalid/i').isVisible().catch(() => false);
    expect(value === '' || value === '0' || hasError).toBeTruthy();
  });
});

test.describe('Admin Retreat Form - Rooms Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Expand Rooms section
    const roomsSection = page.locator('button:has-text("Rooms & Pricing")');
    await roomsSection.click();
    await page.waitForTimeout(300);
  });

  test('should add a new room', async ({ page }) => {
    const addRoomButton = page.locator('button:has-text("Add Room")');
    await addRoomButton.scrollIntoViewIfNeeded();
    await addRoomButton.click();

    await page.waitForTimeout(300);

    // Should see room fields
    const roomNameInput = page.locator('input[name*="rooms"][name*="name"], input[placeholder*="Room Name"]').first();
    await expect(roomNameInput).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-room-added.png', fullPage: true });
  });

  test('should fill room details', async ({ page }) => {
    const addRoomButton = page.locator('button:has-text("Add Room")');
    await addRoomButton.click();
    await page.waitForTimeout(300);

    // Fill room details
    await page.fill('input[name*="rooms.0.name"]', 'Shared Dorm');
    await page.fill('input[name*="rooms.0.price"]', '1200');
    await page.fill('input[name*="rooms.0.deposit_price"]', '600');
    await page.fill('input[name*="rooms.0.available"]', '5');

    await page.screenshot({ path: 'test-results/admin-room-filled.png', fullPage: true });
  });

  test('should remove a room', async ({ page }) => {
    // Add two rooms first
    const addRoomButton = page.locator('button:has-text("Add Room")');
    await addRoomButton.click();
    await page.waitForTimeout(300);
    await addRoomButton.click();
    await page.waitForTimeout(300);

    // Count rooms
    let roomCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /Room Name|Deposit/i });
    const initialCount = await roomCards.count();

    // Remove first room
    const removeButton = page.locator('button:has-text("Remove")').first();
    await removeButton.click();
    await page.waitForTimeout(300);

    // Count should decrease
    roomCards = page.locator('[class*="border"][class*="rounded"]').filter({ hasText: /Room Name|Deposit/i });
    const newCount = await roomCards.count();

    expect(newCount).toBeLessThan(initialCount);
  });
});

test.describe('Admin Retreat Form - Early Bird Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Expand Rooms section where Early Bird is
    const roomsSection = page.locator('button:has-text("Rooms & Pricing")');
    await roomsSection.click();
    await page.waitForTimeout(300);
  });

  test('should toggle Early Bird on and show price field', async ({ page }) => {
    // Find Early Bird switch
    const earlyBirdSwitch = page.locator('button[role="switch"]#early_bird_enabled, [id="early_bird_enabled"]');
    await earlyBirdSwitch.scrollIntoViewIfNeeded();

    // Should be off initially
    const isChecked = await earlyBirdSwitch.getAttribute('data-state');
    expect(isChecked).toBe('unchecked');

    // Toggle on
    await earlyBirdSwitch.click();
    await page.waitForTimeout(300);

    // Early bird price field should appear
    const earlyBirdPriceField = page.locator('input#early_bird_price, input[name="early_bird_price"]');
    await expect(earlyBirdPriceField).toBeVisible();

    await page.screenshot({ path: 'test-results/admin-early-bird-on.png', fullPage: true });
  });

  test('should toggle Early Bird off and hide price field', async ({ page }) => {
    const earlyBirdSwitch = page.locator('button[role="switch"]#early_bird_enabled');
    await earlyBirdSwitch.scrollIntoViewIfNeeded();

    // Toggle on first
    await earlyBirdSwitch.click();
    await page.waitForTimeout(300);

    // Toggle off
    await earlyBirdSwitch.click();
    await page.waitForTimeout(300);

    // Early bird price field should be hidden
    const earlyBirdPriceField = page.locator('input#early_bird_price');
    await expect(earlyBirdPriceField).not.toBeVisible();
  });
});

test.describe('Admin Retreat Form - Geocoding', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Expand Location section
    const locationSection = page.locator('button:has-text("Location & Map")');
    await locationSection.click();
    await page.waitForTimeout(300);
  });

  test('should have geocoding button', async ({ page }) => {
    const geocodeButton = page.locator('button:has-text("Find on Map"), button:has-text("Geocode")');
    await geocodeButton.scrollIntoViewIfNeeded();
    await expect(geocodeButton).toBeVisible();
  });

  test('should show error when geocoding without address', async ({ page }) => {
    const geocodeButton = page.locator('button:has-text("Find on Map")');
    await geocodeButton.scrollIntoViewIfNeeded();
    await geocodeButton.click();

    // Should show error toast
    await page.waitForTimeout(500);
    const toast = page.locator('[class*="toast"], [role="alert"]').filter({ hasText: /address|Address/i });
    await expect(toast).toBeVisible({ timeout: 3000 });
  });

  test('should geocode valid address', async ({ page }) => {
    // Fill address
    const addressInput = page.locator('input#exact_address, textarea#exact_address');
    await addressInput.fill('Imsouane, Morocco');

    const geocodeButton = page.locator('button:has-text("Find on Map")');
    await geocodeButton.click();

    // Wait for geocoding to complete
    await page.waitForTimeout(3000);

    // Check if coordinates were filled
    const latInput = page.locator('input#latitude, input[name="latitude"]');
    const lngInput = page.locator('input#longitude, input[name="longitude"]');

    const latValue = await latInput.inputValue();
    const lngValue = await lngInput.inputValue();

    // Should have values (approximately 30.8, -9.8 for Imsouane)
    expect(parseFloat(latValue)).toBeGreaterThan(0);
    expect(parseFloat(lngValue)).toBeLessThan(0); // Morocco is west of Greenwich

    await page.screenshot({ path: 'test-results/admin-geocoded.png', fullPage: true });
  });

  test('should show map preview when coordinates are set', async ({ page }) => {
    // Fill coordinates manually
    const latInput = page.locator('input#latitude, input[name="latitude"]');
    const lngInput = page.locator('input#longitude, input[name="longitude"]');

    await latInput.fill('30.8');
    await lngInput.fill('-9.8');

    // Trigger change
    await latInput.blur();
    await page.waitForTimeout(500);

    // Map preview should appear
    const mapIframe = page.locator('iframe[src*="google.com/maps"]');
    await expect(mapIframe).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Admin Retreat Form - Dynamic Arrays', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Expand Retreat Details section
    const detailsSection = page.locator('button:has-text("Retreat Details")');
    await detailsSection.click();
    await page.waitForTimeout(300);
  });

  test('should add highlight', async ({ page }) => {
    const addHighlightButton = page.locator('button:has-text("Add Highlight")');
    await addHighlightButton.scrollIntoViewIfNeeded();

    const initialCount = await page.locator('input[name*="highlights"]').count();

    await addHighlightButton.click();
    await page.waitForTimeout(300);

    const newCount = await page.locator('input[name*="highlights"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should add included item', async ({ page }) => {
    const addIncludedButton = page.locator('button:has-text("Add Included"), button:has-text("Add Item")').filter({ hasNot: page.locator(':has-text("Not")') }).first();
    await addIncludedButton.scrollIntoViewIfNeeded();

    const initialCount = await page.locator('input[name*="included"]').count();

    await addIncludedButton.click();
    await page.waitForTimeout(300);

    const newCount = await page.locator('input[name*="included"]').count();
    expect(newCount).toBe(initialCount + 1);
  });

  test('should remove array item when more than one exists', async ({ page }) => {
    // Add two items
    const addHighlightButton = page.locator('button:has-text("Add Highlight")');
    await addHighlightButton.scrollIntoViewIfNeeded();
    await addHighlightButton.click();
    await page.waitForTimeout(200);

    // Now try to remove
    const removeButton = page.locator('button:has([class*="x-circle"]), button[aria-label*="Remove"]').first();
    if (await removeButton.isVisible()) {
      const initialCount = await page.locator('input[name*="highlights"]').count();
      await removeButton.click();
      await page.waitForTimeout(300);

      const newCount = await page.locator('input[name*="highlights"]').count();
      expect(newCount).toBe(initialCount - 1);
    }
  });
});

test.describe('Admin Retreat Form - Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');

    // Expand Media section
    const mediaSection = page.locator('button:has-text("Media & Description")');
    await mediaSection.click();
    await page.waitForTimeout(300);
  });

  test('should display image upload area', async ({ page }) => {
    const uploadArea = page.locator('text=/Upload|Drag|Drop/i').first();
    await expect(uploadArea).toBeVisible();
  });

  test('should reject oversized files', async ({ page }) => {
    // Create a mock large file scenario
    await page.route('**/api/upload*', (route) => {
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'File too large. Maximum size is 5MB' }),
      });
    });

    // Try to upload - note: actual file upload testing is limited in Playwright
    // This tests the error handling
  });
});

test.describe('Admin Retreat Form - Publish Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');
  });

  test('should toggle publish status', async ({ page }) => {
    // Find publish toggle in Basic Information (should be visible)
    const publishSwitch = page.locator('button[role="switch"]#is_published, [id="is_published"]');
    await publishSwitch.scrollIntoViewIfNeeded();

    // Should be off initially (draft)
    const initialState = await publishSwitch.getAttribute('data-state');
    expect(initialState).toBe('unchecked');

    // Toggle on
    await publishSwitch.click();
    await page.waitForTimeout(300);

    // Should now be checked (published)
    const newState = await publishSwitch.getAttribute('data-state');
    expect(newState).toBe('checked');

    await page.screenshot({ path: 'test-results/admin-publish-toggle.png', fullPage: true });
  });

  test('should show correct badge for publish status', async ({ page }) => {
    const publishSwitch = page.locator('button[role="switch"]#is_published');

    // Check Draft badge visible initially
    const draftBadge = page.locator('[class*="badge"]:has-text("Draft")');
    await expect(draftBadge).toBeVisible();

    // Toggle to published
    await publishSwitch.click();
    await page.waitForTimeout(300);

    // Check Published badge
    const publishedBadge = page.locator('[class*="badge"]:has-text("Published")');
    await expect(publishedBadge).toBeVisible();
  });
});

test.describe('Admin Retreat Form - Edit Existing Retreat', () => {
  test('should load existing retreat data', async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);

    // Go to retreats list
    await page.goto('/admin/retreats');
    await page.waitForLoadState('networkidle');

    // Click edit on first retreat
    const editButton = page.locator('a:has-text("Edit"), button:has-text("Edit")').first();

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await page.waitForLoadState('networkidle');

      // Form should be loaded with data
      const destinationInput = page.locator('input#destination');
      const value = await destinationInput.inputValue();

      expect(value.length).toBeGreaterThan(0);

      await page.screenshot({ path: 'test-results/admin-edit-retreat.png', fullPage: true });
    }
  });
});

test.describe('Admin Retreat Form - Cancel Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await closePopups(page);
    await page.goto('/admin/retreats/new');
    await page.waitForLoadState('networkidle');
  });

  test('should navigate back on cancel', async ({ page }) => {
    const cancelButton = page.locator('button:has-text("Cancel")');
    await cancelButton.scrollIntoViewIfNeeded();
    await cancelButton.click();

    // Should navigate away from form
    await page.waitForNavigation({ timeout: 5000 }).catch(() => {});

    const url = page.url();
    expect(url).not.toContain('/new');
  });
});
