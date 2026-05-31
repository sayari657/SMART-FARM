/**
 * Smart Farm AI — k6 Load Test Suite
 * Run: k6 run tests/load/k6_smoke.js
 * Spike test: k6 run --vus 50 --duration 30s tests/load/k6_smoke.js
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

const BASE     = __ENV.BASE_URL || 'http://localhost:8000';
const USERNAME = __ENV.TEST_USER || 'admin';
const PASSWORD = __ENV.TEST_PASS || 'admin123';

const responseTime = new Trend('response_time_ms');
const errorRate    = new Rate('error_rate');
const detectCount  = new Counter('detections_total');

export const options = {
  scenarios: {
    smoke: {
      executor: 'constant-vus',
      vus: 3,
      duration: '30s',
    },
    average_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '1m',  target: 10 },
        { duration: '20s', target: 0  },
      ],
      startTime: '35s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],    // 95% of requests < 2s
    error_rate:        ['rate<0.05'],     // < 5% errors
    response_time_ms:  ['p(99)<5000'],    // 99th percentile < 5s
  },
};

let token = null;

export function setup() {
  const r = http.post(`${BASE}/api/v1/auth/login`,
    JSON.stringify({ username: USERNAME, password: PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } }
  );
  return { token: r.json('access_token') };
}

export default function (data) {
  const headers = {
    'Authorization': `Bearer ${data.token}`,
    'Content-Type':  'application/json',
  };

  // 1. Health
  let r = http.get(`${BASE}/health`);
  responseTime.add(r.timings.duration);
  errorRate.add(r.status !== 200);
  check(r, { 'health ok': (r) => r.status === 200 });

  sleep(0.5);

  // 2. CV Events
  r = http.get(`${BASE}/api/v1/cv/events?limit=10`, { headers });
  responseTime.add(r.timings.duration);
  errorRate.add(r.status !== 200);
  check(r, { 'cv events ok': (r) => r.status === 200 });

  sleep(0.5);

  // 3. Dashboard
  r = http.get(`${BASE}/api/v1/dashboard/summary`, { headers });
  responseTime.add(r.timings.duration);
  check(r, { 'dashboard ok': (r) => r.status < 500 });

  sleep(0.5);

  // 4. Agent chat (quick query)
  r = http.post(
    `${BASE}/api/v1/agent/chat?query=test&species=goat`,
    null,
    { headers }
  );
  responseTime.add(r.timings.duration);
  check(r, { 'agent ok': (r) => r.status === 200 });

  sleep(1);
}

export function teardown(data) {
  console.log('Load test complete.');
}
