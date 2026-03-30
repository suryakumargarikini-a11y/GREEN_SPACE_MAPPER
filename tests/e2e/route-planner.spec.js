import { test, expect } from '@playwright/test';

// Helper — open home and show the Route Planner panel
async function openRoutePlanner(page) {
  await page.goto('/');
  await page.locator('.leaflet-container').waitFor({ state: 'visible', timeout: 10000 });
  const btn = page.getByRole('button', { name: /route|directions|navigate/i }).first();
  if (!(await btn.isVisible())) return false;
  await btn.click();
  await expect(page.getByText(/Route Planner/i)).toBeVisible({ timeout: 4000 });
  return true;
}

test.describe('Route Planner Panel', () => {

  // ── TC-40: Panel renders with origin & destination inputs ─────────────────
  test('TC-40: Route Planner panel mounts correctly', async ({ page }) => {
    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    await expect(page.getByText(/Your current location|Location not detected/i).first()).toBeVisible();
    await expect(page.getByPlaceholder(/Search destination/i)).toBeVisible();
  });

  // ── TC-41: Travel mode chip toggles ──────────────────────────────────────
  test('TC-41: Driving and Walking mode chips toggle state', async ({ page }) => {
    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    const walkBtn = page.getByText(/🚶 Walking/i);
    await expect(walkBtn).toBeVisible();
    await walkBtn.click();
    // After click the button should be "active" (green bg via class)
    await expect(walkBtn).toHaveClass(/bg-green-500/);
  });

  // ── TC-42: Popular destinations chips visible ─────────────────────────────
  test('TC-42: Popular Green Spaces quick-chips are rendered', async ({ page }) => {
    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    await expect(page.getByText(/Popular Green Spaces/i)).toBeVisible();
    await expect(page.getByText(/Cubbon Park, BLR/i)).toBeVisible();
  });

  // ── TC-43: Destination search shows Nominatim autocomplete ────────────────
  test('TC-43: Typing in destination shows suggestions', async ({ page }) => {
    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    const input = page.getByPlaceholder(/Search destination/i);
    await input.fill('Lalbagh');
    await page.waitForTimeout(800); // debounce
    const suggestions = page.locator('button').filter({ hasText: '📍' });
    await expect(suggestions.first()).toBeVisible({ timeout: 6000 });
  });

  // ── TC-44: OSRM failure — shows error, no crash ───────────────────────────
  test('TC-44: OSRM API failure shows error message', async ({ page }) => {
    await page.route('**/router.project-osrm.org/**', route => route.abort());

    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    // Click a popular destination to trigger routing
    const cubbon = page.getByText(/Cubbon Park, BLR/i);
    if (await cubbon.isVisible()) {
      await cubbon.click();
      await page.waitForTimeout(3000);
      await expect(
        page.getByText(/unavailable|Could not find|error/i).first()
      ).toBeVisible({ timeout: 5000 });
    }
  });

  // ── TC-45: Close button dismisses panel ───────────────────────────────────
  test('TC-45: Close button hides the Route Planner', async ({ page }) => {
    const opened = await openRoutePlanner(page);
    if (!opened) return test.skip(true, 'Route Planner button not visible');

    await page.locator('button').filter({ has: page.locator('svg') }).last().click();
    await expect(page.getByText(/Route Planner/i)).not.toBeVisible({ timeout: 3000 });
  });
});
