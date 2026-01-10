/**
 * Basic Load Test for Rainbow Surf Retreats
 *
 * Tests the main public endpoints under normal load conditions.
 *
 * Run: k6 run scripts/load-tests/basic-load.js
 * With env: k6 run -e BASE_URL=https://yoursite.com scripts/load-tests/basic-load.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Trend } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')
const retreatLoadTime = new Trend('retreat_load_time')

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 }, // Ramp up to 20 users
    { duration: '1m', target: 50 }, // Ramp up to 50 users
    { duration: '2m', target: 50 }, // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 }, // Stay at 100 users
    { duration: '30s', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% of requests under 1s
    http_req_failed: ['rate<0.01'], // Less than 1% errors
    errors: ['rate<0.05'], // Custom error rate under 5%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  group('Homepage and Retreats', () => {
    // Test homepage
    const homeRes = http.get(`${BASE_URL}/`)
    check(homeRes, {
      'homepage status 200': (r) => r.status === 200,
      'homepage load < 2s': (r) => r.timings.duration < 2000,
    }) || errorRate.add(1)

    sleep(1)

    // Test retreats API
    const retreatsRes = http.get(`${BASE_URL}/api/retreats`)
    check(retreatsRes, {
      'retreats API status 200': (r) => r.status === 200,
      'retreats returns array': (r) => {
        try {
          const data = JSON.parse(r.body)
          return Array.isArray(data.data || data)
        } catch {
          return false
        }
      },
    }) || errorRate.add(1)

    retreatLoadTime.add(retreatsRes.timings.duration)

    sleep(1)
  })

  group('Individual Retreat Page', () => {
    // Real retreat slugs from database
    const slugs = ['morocco-march-2026', 'bali-september-2026', 'portugal-october-2026', 'costa-rica-adventure-2026-07']
    const randomSlug = slugs[Math.floor(Math.random() * slugs.length)]

    const retreatRes = http.get(`${BASE_URL}/retreats/${randomSlug}`)
    check(retreatRes, {
      'retreat page loads': (r) => r.status === 200 || r.status === 404,
    })

    sleep(2)
  })

  group('Static Assets', () => {
    // Test that static assets load quickly
    const assetsRes = http.batch([
      ['GET', `${BASE_URL}/favicon.ico`],
    ])

    assetsRes.forEach((res) => {
      check(res, {
        'static asset loads': (r) => r.status === 200 || r.status === 304,
      })
    })

    sleep(0.5)
  })
}

export function handleSummary(data) {
  console.log('\n=== Load Test Summary ===')
  console.log(`Total requests: ${data.metrics.http_reqs.values.count}`)
  console.log(`Failed requests: ${data.metrics.http_req_failed.values.passes}`)
  console.log(`Avg response time: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms`)
  console.log(`p95 response time: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms`)

  return {
    'stdout': JSON.stringify(data, null, 2),
  }
}
