import { test, expect } from '@playwright/test';
import { DetailsPage } from '../pages/DetailsPage.js';
import { HomePage } from '../pages/HomePage.js';

// Helper — navigates home, opens My Spaces, clicks the first marker,
// then follows "View Details" so we always have a real MongoDB ID.
async function goToFirstDetails(page) {
  const home = new HomePage(page);
  await home.goto();
  await home.waitForMap();
  await home.openMySpaces();

  const markers = page.locator('.leaflet-marker-icon');
  const count = await markers.count();
  if (count === 0) return null;

  await markers.first().click();
  await expect(page.getByText('View Details')).toBeVisible({ timeout: 4000 });
  await page.getByText('View Details').click();
  await page.waitForURL(/\/park\/.+/);
  return new DetailsPage(page);
}

test.describe('Details Page — Park/Space Detail View', () => {

  // ── TC-14: Page loads without crashing ─────────────────────────────────
  test('TC-14: Details page renders core sections', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.mapContainer).toBeVisible();
    await expect(details.backBtn).toBeVisible();
  });

  // ── TC-15: Weather card is shown ────────────────────────────────────────
  test('TC-15: Weather data card loads', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.weatherCard).toBeVisible({ timeout: 15000 });
    // Wind and humidity should be present
    await expect(page.getByText(/Wind/i).first()).toBeVisible();
    await expect(page.getByText(/Humidity/i).first()).toBeVisible();
  });

  // ── TC-16: AQI badge is shown ────────────────────────────────────────────
  test('TC-16: AQI badge renders with label', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.aqiBadge).toBeVisible({ timeout: 15000 });
    // Should also display one of the known AQI labels
    const aqiLabels = /Good|Fair|Moderate|Poor|Very Poor|Hazardous/i;
    await expect(page.getByText(aqiLabels).first()).toBeVisible({ timeout: 15000 });
  });

  // ── TC-17: Best Time to Visit section renders ───────────────────────────
  test('TC-17: Best Time to Visit section is visible', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.bestTimeCard).toBeVisible({ timeout: 20000 });
    await expect(page.getByText(/Best Time of Day/i)).toBeVisible();
    await expect(page.getByText(/Best Upcoming Days/i)).toBeVisible();
  });

  // ── TC-18: Satellite map toggle ──────────────────────────────────────────
  test('TC-18: Satellite / Street map toggle works', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();

    // Switch to satellite
    await details.satelliteBtn.click();
    await expect(
      page.locator('img[src*="arcgisonline"]').first()
    ).toBeVisible({ timeout: 8000 });

    // Switch back to street
    await details.streetBtn.click();
    await expect(
      page.locator('img[src*="openstreetmap"]').first()
    ).toBeVisible({ timeout: 8000 });
  });

  // ── TC-19: Nearby Green Spaces section loads ─────────────────────────────
  test('TC-19: Nearby Green Spaces section is rendered', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.nearbyCard).toBeVisible();
    // The section eventually shows places OR a "no nearby places" message
    const hasPlaces = page.locator('a[href*="openstreetmap.org"]');
    const noPlaces  = page.getByText(/No nearby places found/i);
    await expect(hasPlaces.first().or(noPlaces)).toBeVisible({ timeout: 25000 });
  });

  // ── TC-20: Back button navigates to home ─────────────────────────────────
  test('TC-20: Back button returns to home map', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await details.backBtn.click();
    await expect(page).toHaveURL('/');
    await expect(page.locator('.leaflet-container')).toBeVisible({ timeout: 8000 });
  });

  // ── TC-22: Delete flow — confirm & cancel ───────────────────────────────
  test('TC-22: Delete cancel flow does not delete space', async ({ page }) => {
    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();

    // Click trash icon to reveal confirm
    await page.locator('button').filter({ has: page.locator('svg') }).nth(1).click();
    await expect(page.getByText('Confirm')).toBeVisible({ timeout: 3000 });

    // Click Cancel — space should remain
    await page.getByText('Cancel').click();
    await expect(page.getByText('Confirm')).not.toBeVisible();
    // Page should still show the space (map still visible)
    await expect(details.mapContainer).toBeVisible();
  });

  // ── TC-26: Weather API failure — no unhandled crash ──────────────────────
  test('TC-26: Weather API down — page still renders', async ({ page }) => {
    await page.route('**/open-meteo.com/**', route => route.abort());

    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    // Map and heading should still render even without weather
    await details.waitForLoad();
    await expect(details.mapContainer).toBeVisible();
    // No uncaught JS error — page title still present
    await expect(page.locator('h1').first()).toBeVisible();
  });

  // ── TC-27: Overpass API failure — nearby section still shows ─────────────
  test('TC-27: Overpass down — nearby section shows graceful state', async ({ page }) => {
    await page.route('**/overpass**', route => route.abort());

    const details = await goToFirstDetails(page);
    if (!details) return test.skip(true, 'No spaces exist');

    await details.waitForLoad();
    await expect(details.nearbyCard).toBeVisible();
    // Should show either empty-state or a partial result — no crash
    await expect(page.locator('h1').first()).toBeVisible();
  });
});
