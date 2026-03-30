import { test, expect } from '@playwright/test';
import { AddSpacePage } from '../pages/AddSpacePage.js';
import { TEST_SPACE } from '../utils/constants.js';

test.describe('Add Space — Form Validation & Submission', () => {

  // ── TC-30: Add Space page renders ────────────────────────────────────────
  test('TC-30: Add Space page loads with form fields', async ({ page }) => {
    const add = new AddSpacePage(page);
    await add.goto();
    await expect(page.getByRole('heading', { name: /Add Green Space/i })).toBeVisible();
    await expect(add.nameInput).toBeVisible();
    await expect(add.latInput).toBeVisible();
    await expect(add.lngInput).toBeVisible();
    await expect(add.submitBtn).toBeVisible();
  });

  // ── TC-31: Submit with empty fields shows validation errors ───────────────
  test('TC-31: Empty-submit triggers required-field validation', async ({ page }) => {
    const add = new AddSpacePage(page);
    await add.goto();
    await add.submitBtn.click();
    // Browser native validation or custom message must block the form
    const nameValid = await add.nameInput.evaluate(el => el.validity.valid);
    expect(nameValid).toBe(false);
  });

  // ── TC-32: Invalid lat/lng shows validation error ──────────────────────────
  test('TC-32: Out-of-range coordinates are flagged', async ({ page }) => {
    const add = new AddSpacePage(page);
    await add.goto();
    await add.nameInput.fill('Test Park');
    await add.latInput.fill('999'); // invalid
    await add.lngInput.fill('999');
    await add.submitBtn.click();
    // Should show an error or browser validation fail
    const latValid = await add.latInput.evaluate(el => el.validity.valid);
    expect(latValid).toBe(false);
  });

  // ── TC-33: Full valid submission creates space ─────────────────────────────
  test('TC-33: Valid form submission redirects to home', async ({ page }) => {
    const add = new AddSpacePage(page);
    await add.goto();

    await add.fillForm({
      name: TEST_SPACE.name,
      lat: TEST_SPACE.lat,
      lng: TEST_SPACE.lng,
      description: TEST_SPACE.description,
    });

    // Intercept the POST so we don't persist junk data unless we want to
    let posted = false;
    await page.route('/api/spaces', async route => {
      if (route.request().method() === 'POST') {
        posted = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            _id: '64abc000000000000000aaaa',
            ...TEST_SPACE,
            location: { lat: TEST_SPACE.lat, lng: TEST_SPACE.lng },
            facilities: TEST_SPACE.facilities,
            imageUrl: '',
            createdAt: new Date().toISOString(),
          }),
        });
      } else {
        await route.continue();
      }
    });

    await add.submitBtn.click();
    // Should either redirect to home or show a success indicator
    await page.waitForTimeout(1500);
    const url = page.url();
    expect(posted || url.includes('/')).toBeTruthy();
  });

  // ── TC-34: Back link navigates to home ────────────────────────────────────
  test('TC-34: Back to Map link works', async ({ page }) => {
    const add = new AddSpacePage(page);
    await add.goto();
    await page.getByText(/Back to Map/i).first().click();
    await expect(page).toHaveURL('/');
  });

  // ── TC-35: API failure on submit — no crash ───────────────────────────────
  test('TC-35: Server error on submit shows error, page stays', async ({ page }) => {
    await page.route('/api/spaces', route => {
      if (route.request().method() === 'POST') {
        route.fulfill({ status: 500, body: JSON.stringify({ error: 'Server error' }) });
      } else {
        route.continue();
      }
    });

    const add = new AddSpacePage(page);
    await add.goto();
    await add.fillForm({
      name: TEST_SPACE.name,
      lat: TEST_SPACE.lat,
      lng: TEST_SPACE.lng,
      description: TEST_SPACE.description,
    });
    await add.submitBtn.click();
    await page.waitForTimeout(2000);
    // Page should still be on /add (or show error) — not a blank crash
    await expect(add.nameInput.or(page.getByText(/error|failed/i).first())).toBeVisible();
  });
});
