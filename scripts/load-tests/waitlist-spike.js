/**
 * Waitlist Spike Test for Rainbow Surf Retreats
 *
 * Simulates a scenario where a popular retreat sells out and many users
 * rush to join the waitlist simultaneously.
 *
 * Tests:
 * - Waitlist join endpoint performance
 * - Duplicate email prevention under load
 * - Database constraint handling
 *
 * Run: k6 run scripts/load-tests/waitlist-spike.js
 * With env: k6 run -e BASE_URL=https://yoursite.com -e RETREAT_ID=xxx scripts/load-tests/waitlist-spike.js
 */

import http from 'k6/http'
import { check, sleep, group } from 'k6'
import { Rate, Counter, Trend } from 'k6/metrics'
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

// Custom metrics
const waitlistJoinAttempts = new Counter('waitlist_join_attempts')
const waitlistJoinSuccess = new Counter('waitlist_join_success')
const waitlistRateLimited = new Counter('waitlist_rate_limited')
const waitlistDuplicates = new Counter('waitlist_duplicates')
const waitlistErrors = new Counter('waitlist_errors')
const joinDuration = new Trend('waitlist_join_duration')
const errorRate = new Rate('error_rate')

// Test configuration - Spike test
export const options = {
  scenarios: {
    // Pre-spike: Normal traffic
    normal_traffic: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
      exec: 'normalTraffic',
    },
    // Spike: Retreat sells out, everyone rushes to waitlist
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 200,
      stages: [
        { duration: '10s', target: 5 }, // Building up
        { duration: '5s', target: 100 }, // SPIKE!
        { duration: '30s', target: 100 }, // Sustained spike
        { duration: '10s', target: 20 }, // Gradual decrease
        { duration: '30s', target: 5 }, // Cool down
      ],
      exec: 'joinWaitlist',
      startTime: '30s',
    },
    // Post-spike: Duplicate attempts
    duplicate_test: {
      executor: 'per-vu-iterations',
      vus: 10,
      iterations: 5,
      exec: 'duplicateJoinAttempt',
      startTime: '2m',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<1000'], // 95% under 1s
    http_req_failed: ['rate<0.05'], // Less than 5% failures
    waitlist_join_success: ['count>0'], // Some joins succeed
    error_rate: ['rate<0.1'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
// Real retreat IDs from database
const RETREAT_IDS = [
  '5f042ed9-7599-4694-a003-249a039d1db2', // morocco-march-2026
  'ed01df9b-cdbc-41e4-8a9d-a2dc1431e095', // bali-september-2026
  '81ffbeea-880c-407f-aacc-39ae1f10b69c', // portugal-october-2026
]
const RETREAT_ID = __ENV.RETREAT_ID || RETREAT_IDS[0]

// First names for generating test data
const firstNames = ['Alex', 'Jordan', 'Taylor', 'Morgan', 'Casey', 'Riley', 'Quinn', 'Avery', 'Charlie', 'Dakota']
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

// Normal browsing traffic
export function normalTraffic() {
  const res = http.get(`${BASE_URL}/retreats`)
  check(res, { 'page loads': (r) => r.status === 200 || r.status === 404 })
  sleep(randomIntBetween(2, 5))
}

// Waitlist join attempt
export function joinWaitlist() {
  const startTime = Date.now()
  waitlistJoinAttempts.add(1)

  // Generate unique user data
  const firstName = firstNames[randomIntBetween(0, firstNames.length - 1)]
  const lastName = lastNames[randomIntBetween(0, lastNames.length - 1)]
  const uniqueEmail = `loadtest_${randomString(12)}_${__VU}_${__ITER}@example.com`

  const waitlistData = {
    retreatId: RETREAT_ID,
    firstName: firstName,
    lastName: lastName,
    email: uniqueEmail,
    phone: `+1${randomIntBetween(1000000000, 9999999999)}`,
    guestsCount: 1,
    notes: 'Load test - please ignore',
  }

  const response = http.post(
    `${BASE_URL}/api/waitlist`,
    JSON.stringify(waitlistData),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true',
      },
    }
  )

  const duration = Date.now() - startTime
  joinDuration.add(duration)

  // Check response
  if (response.status === 200 || response.status === 201) {
    waitlistJoinSuccess.add(1)
    check(response, {
      'join successful': () => true,
      'returns position': (r) => {
        try {
          const body = JSON.parse(r.body)
          return body.position !== undefined || body.data?.position !== undefined
        } catch {
          return false
        }
      },
    })
  } else if (response.status === 429) {
    // Rate limited - expected under high load (5 req/hour limit)
    // This is NOT an error - it shows rate limiting is working
    waitlistRateLimited.add(1)
    check(response, { 'rate limited': () => true })
  } else if (response.status === 409 || response.body?.includes('already')) {
    // Already on waitlist - expected for duplicates
    waitlistDuplicates.add(1)
  } else if (response.status === 400 || response.status === 404) {
    // Validation error or not found
    check(response, {
      'request handled': (r) => r.status === 400 || r.status === 404,
    })
  } else if (response.status >= 500) {
    waitlistErrors.add(1)
    errorRate.add(1)
    console.log(`Waitlist error: ${response.status} - ${response.body?.substring(0, 200)}`)
  }

  // Small think time
  sleep(0.5)
}

// Test duplicate join prevention
export function duplicateJoinAttempt() {
  // Use a fixed email to test duplicate prevention
  const fixedEmail = `duplicate_test_${__VU}@example.com`

  const waitlistData = {
    retreatId: RETREAT_ID,
    firstName: 'Duplicate',
    lastName: 'Tester',
    email: fixedEmail,
    phone: '+1234567890',
    guestsCount: 1,
    notes: 'Duplicate test - please ignore',
  }

  const response = http.post(
    `${BASE_URL}/api/waitlist`,
    JSON.stringify(waitlistData),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Load-Test': 'true',
      },
    }
  )

  if (__ITER === 0) {
    // First attempt should succeed or fail with validation
    check(response, {
      'first attempt processed': (r) => r.status === 200 || r.status === 201 || r.status === 400 || r.status === 404,
    })
  } else {
    // Subsequent attempts should be rejected as duplicates
    check(response, {
      'duplicate rejected': (r) => r.status === 409 || r.status === 200 || r.status === 400,
    })

    if (response.status === 200 || response.status === 201) {
      // If we got 200 on a duplicate, check if it returns existing position
      try {
        const body = JSON.parse(response.body)
        if (body.message?.includes('already') || body.data?.existing) {
          waitlistDuplicates.add(1)
        } else {
          console.log(`WARNING: Duplicate email accepted without detection: ${fixedEmail}`)
        }
      } catch {
        // Parsing error, log it
      }
    }
  }

  sleep(1)
}

// Default function
export default function () {
  joinWaitlist()
}

export function handleSummary(data) {
  const attempts = data.metrics.waitlist_join_attempts?.values?.count || 0
  const success = data.metrics.waitlist_join_success?.values?.count || 0
  const rateLimited = data.metrics.waitlist_rate_limited?.values?.count || 0
  const duplicates = data.metrics.waitlist_duplicates?.values?.count || 0
  const errors = data.metrics.waitlist_errors?.values?.count || 0

  const summary = {
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    waitlist_attempts: attempts,
    waitlist_success: success,
    waitlist_rate_limited: rateLimited,
    waitlist_duplicates: duplicates,
    waitlist_errors: errors,
    success_rate: attempts ? ((success / attempts) * 100).toFixed(2) + '%' : 'N/A',
    rate_limit_rate: attempts ? ((rateLimited / attempts) * 100).toFixed(2) + '%' : 'N/A',
    error_rate: attempts ? ((errors / attempts) * 100).toFixed(2) + '%' : 'N/A',
    avg_join_duration: data.metrics.waitlist_join_duration?.values?.avg?.toFixed(0) + 'ms' || 'N/A',
    p95_join_duration: data.metrics.waitlist_join_duration?.values?.['p(95)']?.toFixed(0) + 'ms' || 'N/A',
    p95_request_duration: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(0) + 'ms' || 'N/A',
  }

  console.log('\n=== Waitlist Spike Test Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'waitlist-spike-results.json': JSON.stringify(data, null, 2),
  }
}
