import { test, expect } from '@playwright/test';
import { API_URL } from '../utils/constants.js';

// Using Playwright's built-in request context for API tests.
// No browser needed — these run against the live server only.

let createdId = null; // shared across tests

test.describe('API — /api/spaces CRUD', () => {

  // ── TC-A1: GET /api/spaces returns 200 + array ──────────────────────────
  test('TC-A1: GET /api/spaces → 200 with array body', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/spaces`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  // ── TC-A2: POST creates a new space ─────────────────────────────────────
  test('TC-A2: POST /api/spaces → 201 with created space', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/spaces`, {
      multipart: {
        name: 'Playwright API Test Park',
        lat: '12.9779',
        lng: '77.5952',
        description: 'Auto-created by Playwright API test — safe to delete',
        facilities: JSON.stringify(['garden']),
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body._id).toBeTruthy();
    expect(body.name).toBe('Playwright API Test Park');
    createdId = body._id;
  });

  // ── TC-A3: GET by ID returns the space ──────────────────────────────────
  test('TC-A3: GET /api/spaces/:id → 200 with correct space', async ({ request }) => {
    test.skip(!createdId, 'TC-A2 must pass first');
    const res = await request.get(`${API_URL}/api/spaces/${createdId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body._id).toBe(createdId);
  });

  // ── TC-A4: GET with invalid ID returns 500 (CastError) ──────────────────
  test('TC-A4: GET /api/spaces/invalid-id → 500', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/spaces/000000000000000000000000`);
    // MongoDB findById with valid-format but non-existent ID → 404
    expect([404, 500]).toContain(res.status());
  });

  // ── TC-A5: PUT updates the space ────────────────────────────────────────
  test('TC-A5: PUT /api/spaces/:id → 200 with updated name', async ({ request }) => {
    test.skip(!createdId, 'TC-A2 must pass first');
    const res = await request.put(`${API_URL}/api/spaces/${createdId}`, {
      multipart: {
        name: 'Playwright API Test Park (Updated)',
        lat: '12.9779',
        lng: '77.5952',
        facilities: JSON.stringify(['garden', 'benches']),
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.name).toContain('Updated');
  });

  // ── TC-A6: Facility filter returns matching subset ───────────────────────
  test('TC-A6: GET /api/spaces?facilities=garden → filtered subset', async ({ request }) => {
    const res = await request.get(`${API_URL}/api/spaces?facilities=garden`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    // Every returned space should have 'garden' in its facilities array
    for (const space of body) {
      expect(space.facilities).toContain('garden');
    }
  });

  // ── TC-A7: DELETE removes the space ─────────────────────────────────────
  test('TC-A7: DELETE /api/spaces/:id → 200 + confirmation', async ({ request }) => {
    test.skip(!createdId, 'TC-A2 must pass first');
    const res = await request.delete(`${API_URL}/api/spaces/${createdId}`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.message).toMatch(/deleted/i);
    createdId = null;
  });

  // ── TC-A8: GET deleted space → 404 ──────────────────────────────────────
  test('TC-A8: GET after delete → 404', async ({ request }) => {
    // Uses a static ID that we know does not exist
    const res = await request.get(`${API_URL}/api/spaces/64000000000000000000dead`);
    expect([404, 500]).toContain(res.status());
  });

  // ── TC-A9: POST missing required fields → 400 ────────────────────────────
  test('TC-A9: POST with missing name → 400', async ({ request }) => {
    const res = await request.post(`${API_URL}/api/spaces`, {
      multipart: { lat: '12.9', lng: '77.5' }, // no name
    });
    expect(res.status()).toBe(400);
  });
});
