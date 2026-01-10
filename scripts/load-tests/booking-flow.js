/**
 * Booking Flow Load Test for Rainbow Surf Retreats
 *
 * Simulates the complete booking flow:
 * 1. Browse retreats
 * 2. View retreat details
 * 3. Select room and dates
 * 4. Submit booking
 * 5. Create payment intent
 *
 * This test simulates a "retreat launch" scenario where many users
 * try to book simultaneously.
 *
 * Run: k6 run scripts/load-tests/booking-flow.js
 * With env: k6 run -e BASE_URL=https://yoursite.com scripts/load-tests/booking-flow.js
 */

import http from 'k6/http'
import { check, sleep, group, fail } from 'k6'
import { Rate, Trend, Counter } from 'k6/metrics'
import { randomString, randomIntBetween } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

// Custom metrics
const bookingAttempts = new Counter('booking_attempts')
const bookingSuccess = new Counter('booking_success')
const bookingFailures = new Counter('booking_failures')
const bookingDuration = new Trend('booking_flow_duration')
const errorRate = new Rate('error_rate')

// Test configuration - Simulate retreat launch
export const options = {
  scenarios: {
    // Scenario 1: Normal browsing load
    browsers: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 30 }, // Normal traffic
        { duration: '2m', target: 30 },
        { duration: '30s', target: 0 },
      ],
      exec: 'browseOnly',
    },
    // Scenario 2: Booking rush (retreat launch)
    booking_rush: {
      executor: 'ramping-arrival-rate',
      startRate: 1,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 100,
      stages: [
        { duration: '30s', target: 5 }, // Warm up
        { duration: '10s', target: 50 }, // Launch spike!
        { duration: '2m', target: 30 }, // Sustained load
        { duration: '30s', target: 5 }, // Cool down
      ],
      exec: 'bookingFlow',
      startTime: '30s',
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% under 2s
    http_req_failed: ['rate<0.05'], // Less than 5% failures
    booking_success: ['count>0'], // At least some bookings succeed
    error_rate: ['rate<0.1'], // Less than 10% error rate
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Test data
const testUsers = [
  { firstName: 'Test', lastName: 'User', email: 'test@example.com', phone: '+1234567890' },
  { firstName: 'Load', lastName: 'Tester', email: 'load@example.com', phone: '+0987654321' },
  { firstName: 'Stress', lastName: 'Test', email: 'stress@example.com', phone: '+1122334455' },
]

// Browsing only scenario
export function browseOnly() {
  group('Browse Retreats', () => {
    // Homepage
    const homeRes = http.get(`${BASE_URL}/`)
    check(homeRes, { 'homepage loads': (r) => r.status === 200 })
    sleep(randomIntBetween(2, 5))

    // Retreats list
    const retreatsRes = http.get(`${BASE_URL}/api/retreats`)
    check(retreatsRes, { 'retreats API works': (r) => r.status === 200 })
    sleep(randomIntBetween(1, 3))

    // Random retreat detail - use real slugs from database
    const slugs = ['morocco-march-2026', 'bali-september-2026', 'portugal-october-2026']
    const slug = slugs[randomIntBetween(0, slugs.length - 1)]
    const detailRes = http.get(`${BASE_URL}/retreats/${slug}`)
    check(detailRes, { 'retreat detail loads': (r) => r.status === 200 || r.status === 404 })
    sleep(randomIntBetween(3, 8))
  })
}

// Full booking flow
export function bookingFlow() {
  const startTime = Date.now()
  bookingAttempts.add(1)

  const user = testUsers[randomIntBetween(0, testUsers.length - 1)]
  const uniqueEmail = `loadtest_${randomString(8)}_${__VU}@example.com`

  group('1. Browse to Retreat', () => {
    // Get available retreats
    const retreatsRes = http.get(`${BASE_URL}/api/retreats`)
    if (!check(retreatsRes, { 'retreats loaded': (r) => r.status === 200 })) {
      errorRate.add(1)
      bookingFailures.add(1)
      return
    }

    sleep(1)
  })

  let retreatId, roomId

  group('2. Select Retreat and Room', () => {
    // Real IDs from database - only rooms with available inventory
    const retreats = [
      { id: 'ed01df9b-cdbc-41e4-8a9d-a2dc1431e095', roomId: 'fcc86e0b-5543-426a-aaf6-c43b03e44d13', slug: 'bali-september-2026' }, // Twin Room Garden View (4 available)
      { id: '03876fb1-a6f3-458b-8170-0d34c1172ee4', roomId: '25eb3ce9-e3be-4d20-94d7-5cded78689ee', slug: 'costa-rica-adventure-2026-07' }, // Budget Dorm (10 available)
      { id: '81ffbeea-880c-407f-aacc-39ae1f10b69c', roomId: '4520a099-fd62-4317-ac60-aeb926d03371', slug: 'portugal-october-2026' }, // Shared Twin Room (4 available)
    ]
    const selected = retreats[randomIntBetween(0, retreats.length - 1)]
    retreatId = selected.id
    roomId = selected.roomId

    // Simulate viewing retreat details
    const detailRes = http.get(`${BASE_URL}/api/retreats?slug=${selected.slug}`)
    check(detailRes, { 'retreat detail accessible': (r) => r.status === 200 })

    sleep(2)
  })

  group('3. Submit Booking via Stripe Checkout', () => {
    // Use correct checkout endpoint with proper validation
    const bookingData = {
      retreatId: retreatId,
      roomId: roomId,
      firstName: user.firstName,
      lastName: user.lastName,
      email: uniqueEmail,
      phone: user.phone,
      country: 'DE',
      paymentType: 'deposit',
      acceptTerms: true,
      newsletterOptIn: false,
      language: 'en',
      guestsCount: 1,
      notes: 'Load test booking - please ignore',
    }

    const bookingRes = http.post(
      `${BASE_URL}/api/stripe/checkout`,
      JSON.stringify(bookingData),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Load-Test': 'true',
        },
      }
    )

    // Check response - 200 means checkout session created
    const checkoutOk = check(bookingRes, {
      'checkout request processed': (r) => r.status === 200 || r.status === 400 || r.status === 404 || r.status === 429,
      'checkout response time OK': (r) => r.timings.duration < 5000,
    })

    if (bookingRes.status === 200) {
      bookingSuccess.add(1)
      try {
        const body = JSON.parse(bookingRes.body)
        if (body.sessionId || body.url) {
          console.log(`Checkout session created for: ${uniqueEmail}`)
        }
      } catch (e) {
        // Ignore parse errors
      }
    } else if (bookingRes.status === 429) {
      // Rate limited - expected behavior
      console.log('Rate limited - expected under high load')
    } else if (bookingRes.status >= 500) {
      bookingFailures.add(1)
      errorRate.add(1)
      console.log(`Checkout error: ${bookingRes.status} - ${bookingRes.body?.substring(0, 200)}`)
    }

    sleep(1)
  })

  const duration = Date.now() - startTime
  bookingDuration.add(duration)
}

// Default function (not used with scenarios, but required)
export default function () {
  bookingFlow()
}

export function handleSummary(data) {
  const summary = {
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    booking_attempts: data.metrics.booking_attempts?.values?.count || 0,
    booking_success: data.metrics.booking_success?.values?.count || 0,
    booking_failures: data.metrics.booking_failures?.values?.count || 0,
    success_rate: data.metrics.booking_attempts?.values?.count
      ? ((data.metrics.booking_success?.values?.count || 0) / data.metrics.booking_attempts.values.count * 100).toFixed(2) + '%'
      : 'N/A',
    avg_flow_duration: data.metrics.booking_flow_duration?.values?.avg?.toFixed(0) + 'ms' || 'N/A',
    p95_request_duration: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) + 'ms' || 'N/A',
  }

  console.log('\n=== Booking Flow Load Test Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'booking-flow-results.json': JSON.stringify(data, null, 2),
  }
}
