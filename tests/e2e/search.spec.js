import { test, expect } from '@playwright/test';
import { ExplorePage } from '../pages/ExplorePage.js';
import { SEARCH_QUERIES } from '../utils/constants.js';

test.describe('Search — ExplorePage', () => {
  test('TC-07: Autocomplete suggestions appear on typing', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.lpu);
    const suggestions = page.locator('button').filter({ hasText: '📍' });
    await expect(suggestions.first()).toBeVisible({ timeout: 5000 });
  });

  test('TC-08 + TC-09: Select suggestion loads weather data', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.india);
    await explore.selectFirstSuggestion();
    await explore.waitForData();
    await expect(explore.weatherCard).toBeVisible();
  });

  test('TC-10: AQI badge is visible after selection', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.india);
    await explore.selectFirstSuggestion();
    await explore.waitForData();
    await expect(explore.aqiCard).toBeVisible();
  });

  test('TC-11: Best Time to Visit section renders', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.india);
    await explore.selectFirstSuggestion();
    await explore.waitForData();
    await expect(explore.bestTimeCard).toBeVisible({ timeout: 15000 });
    // Should show time of day
    await expect(page.getByText(/Best Time of Day/i)).toBeVisible();
    // Should show best days grid
    await expect(page.getByText(/Best Upcoming Days/i)).toBeVisible();
  });

  test('TC-13: Satellite map toggle works', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.india);
    await explore.selectFirstSuggestion();
    await explore.waitForData();
    await page.locator('.leaflet-container').waitFor({ state: 'visible' });
    await explore.satelliteBtn.click();
    // Esri satellite tile should appear
    const satelliteTile = page.locator('img[src*="arcgisonline"]');
    await expect(satelliteTile.first()).toBeVisible({ timeout: 8000 });
    // Toggle back to street
    await explore.streetBtn.click();
    const osmTile = page.locator('img[src*="openstreetmap"]');
    await expect(osmTile.first()).toBeVisible({ timeout: 8000 });
  });

  test('TC-12: Nearby green spaces section loads', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.india);
    await explore.selectFirstSuggestion();
    await explore.waitForData();
    await expect(explore.nearbySection).toBeVisible({ timeout: 20000 });
  });

  test('TC-21: Invalid search yields no suggestions', async ({ page }) => {
    const explore = new ExplorePage(page);
    await explore.goto();
    await explore.searchFor(SEARCH_QUERIES.invalid);
    await page.waitForTimeout(1200);
    const count = await page.locator('button').filter({ hasText: '📍' }).count();
    expect(count).toBe(0);
  });
});
