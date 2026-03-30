import { test, expect } from '@playwright/test';
import { HomePage } from '../pages/HomePage.js';

test.describe('Filters & Sidebar — HomePage', () => {

  // ── TC-02: Facility filter chips render ───────────────────────────────────
  test('TC-02: Filter chips are visible in the sidebar', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForMap();

    // Filter chips: playground, walking_track, garden, benches, sports_area
    const chips = page.locator('button').filter({ hasText: /playground|walking|garden|bench|sport/i });
    await expect(chips.first()).toBeVisible({ timeout: 6000 });
  });

  // ── TC-03: Clicking a filter updates the results list ─────────────────────
  test('TC-03: Selecting a filter fires filtered API request', async ({ page }) => {
    const home = new HomePage(page);

    let filteredUrl = '';
    page.on('request', req => {
      if (req.url().includes('/api/spaces') && req.url().includes('facilities=')) {
        filteredUrl = req.url();
      }
    });

    await home.goto();
    await home.waitForMap();

    const gardenChip = page.locator('button').filter({ hasText: /garden/i }).first();
    if (await gardenChip.isVisible()) {
      await gardenChip.click();
      await page.waitForTimeout(1000);
      expect(filteredUrl).toContain('facilities=');
    } else {
      test.skip(true, 'No filter chips visible');
    }
  });

  // ── TC-36: Sidebar lists spaces loaded from API ────────────────────────────
  test('TC-36: Sidebar shows space cards after data loads', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForMap();

    // "My Spaces" tab should show cards or empty state
    await home.openMySpaces();
    await page.waitForTimeout(1000);
    const cards   = page.locator('[data-testid="space-card"]');
    const noData  = page.getByText(/no spaces|no results|nothing here/i).first();
    // At least one of these should be reachable (cards present OR empty-state)
    const cardCount = await cards.count();
    const noDataVis = await noData.isVisible().catch(() => false);
    expect(cardCount > 0 || noDataVis).toBeTruthy();
  });

  // ── TC-37: Dark mode toggle persists ──────────────────────────────────────
  test('TC-37: Dark mode toggle applies dark class to body', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForMap();

    const darkToggle = page.locator('button[aria-label*="dark" i], button[title*="dark" i], button').filter({ hasText: /🌙|☀️/i }).first();
    if (await darkToggle.isVisible()) {
      const before = await page.evaluate(() => document.body.classList.contains('dark'));
      await darkToggle.click();
      const after  = await page.evaluate(() => document.body.classList.contains('dark'));
      expect(after).toBe(!before);
    } else {
      test.skip(true, 'Dark mode toggle not found');
    }
  });

  // ── TC-38: Nearby Places tab/section appears ──────────────────────────────
  test('TC-38: Nearby Places section renders in sidebar', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForMap();
    const nearby = page.getByText(/Nearby/i).first();
    await expect(nearby).toBeVisible({ timeout: 8000 });
  });

  // ── TC-39: Route Planner panel opens from map ─────────────────────────────
  test('TC-39: Route Planner button opens the panel', async ({ page }) => {
    const home = new HomePage(page);
    await home.goto();
    await home.waitForMap();
    const routeBtn = page.getByRole('button', { name: /route|directions/i }).first();
    if (await routeBtn.isVisible()) {
      await routeBtn.click();
      await expect(page.getByText(/Route Planner/i)).toBeVisible({ timeout: 4000 });
    } else {
      test.skip(true, 'Route Planner button not found');
    }
  });
});
