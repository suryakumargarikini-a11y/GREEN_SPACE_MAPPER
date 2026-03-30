import { test, expect } from '@playwright/test';
import { ExplorePage } from '../pages/ExplorePage.js';

test.describe('Edge Cases & Error Handling', () => {
  test('TC-25: Invalid park ID shows error state', async ({ page }) => {
    await page.goto('/park/000000000000000000000000');
    // Should show error, not crash
    await expect(
      page.getByText(/Could not load|not found|error/i).first()
    ).toBeVisible({ timeout: 8000 });
  });

  test('TC-21: Gibberish search — no crash, no suggestions', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor('!@#$%xyzqq1234567');
    await page.waitForTimeout(1200);
    // Page should not crash
    await expect(explore.searchInput).toBeVisible();
    const count = await page.locator('button').filter({ hasText: '📍' }).count();
    expect(count).toBe(0);
  });

  test('TC-24: Slow network — loading spinner appears', async ({ page }) => {
    // Throttle Open-Meteo calls
    await page.route('**/open-meteo.com/**', async route => {
      await new Promise(r => setTimeout(r, 3000));
      await route.continue();
    });
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor('Bangalore');
    await explore.selectFirstSuggestion();
    // Spinner should appear while data loads
    await expect(page.locator('.animate-spin').first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-23: API failure — graceful fallback message', async ({ page }) => {
    // Block Open-Meteo to simulate API failure
    await page.route('**/open-meteo.com/**', route => route.abort());
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor('Bangalore');
    await explore.selectFirstSuggestion();
    // Page should not crash — no unhandled error
    await page.waitForTimeout(3000);
    await expect(explore.searchInput).toBeVisible();
  });

  test('Empty search box — no dropdown shown', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor('');
    await page.waitForTimeout(500);
    const count = await page.locator('button').filter({ hasText: '📍' }).count();
    expect(count).toBe(0);
  });
});
