import { test, expect } from '@playwright/test';

test.describe('UI — Explore Page', () => {
  test('Search and view green spaces', async ({ page }) => {
    // Navigate to the Explore page
    await page.goto('/explore');

    // Wait for the page to load
    await expect(page.getByRole('heading', { name: '🔍 Explore Any Location' })).toBeVisible();

    // Type a location in the search input
    const searchInput = page.getByPlaceholder('Search any place, university, park, city…');
    await searchInput.fill('Central Park New York');

    // Wait for dropdown to show up
    const suggestion = page.getByRole('button', { name: /Central Park/i }).first();
    await suggestion.waitFor({ state: 'visible', timeout: 10000 });
    await suggestion.click();

    // The loading spinner should vanish
    await expect(page.getByText('Loading weather, AQI & nearby places…')).toBeHidden({ timeout: 15000 });

    // Expect to see map and weather data
    await expect(page.getByText('📍 Location on Map')).toBeVisible();
    await expect(page.getByText('🗺️ Nearby Green Spaces')).toBeVisible();
  });
});
