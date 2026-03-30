// k6 Load Test — Green Space Mapper API
// Run: k6 run tests/performance/k6-load.js

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up to 10 users
    { duration: '1m',  target: 50 },  // sustained 50 users
    { duration: '20s', target: 0 },   // ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed:   ['rate<0.01'],
    errors:            ['rate<0.05'],
  },
};

const BASE = 'http://localhost:5000';

export default function () {
  // 1. GET all spaces
  const spaces = http.get(`${BASE}/api/spaces`);
  const spacesOk = check(spaces, {
    'GET /api/spaces: status 200': r => r.status === 200,
    'GET /api/spaces: response time < 300ms': r => r.timings.duration < 300,
    'GET /api/spaces: returns array': r => Array.parse(r.body)?.length >= 0,
  });
  errorRate.add(!spacesOk);

  sleep(0.5);

  // 2. External weather API check (just timing)
  const weather = http.get(
    'https://api.open-meteo.com/v1/forecast?latitude=12.97&longitude=77.59&current=temperature_2m'
  );
  check(weather, {
    'Open-Meteo: status 200': r => r.status === 200,
    'Open-Meteo: response time < 2s': r => r.timings.duration < 2000,
  });

  sleep(1);

  // 3. AQI API check
  const aqi = http.get(
    'https://air-quality-api.open-meteo.com/v1/air-quality?latitude=12.97&longitude=77.59&current=european_aqi'
  );
  check(aqi, {
    'AQI API: status 200': r => r.status === 200,
  });

  sleep(1);
}
