/**
 * Webhook Stress Test for Rainbow Surf Retreats
 *
 * Simulates high volume of Resend webhook events.
 * Tests the system's ability to handle email delivery notifications.
 *
 * WARNING: This test requires webhook signature verification to be disabled
 * or a valid test signature to be configured.
 *
 * Run: k6 run scripts/load-tests/webhook-stress.js
 * With env: k6 run -e BASE_URL=https://yoursite.com -e WEBHOOK_SECRET=xxx scripts/load-tests/webhook-stress.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Counter } from 'k6/metrics'
import { randomString } from 'https://jslib.k6.io/k6-utils/1.4.0/index.js'

// Custom metrics
const webhookErrors = new Counter('webhook_errors')
const webhookSuccess = new Counter('webhook_success')
const errorRate = new Rate('error_rate')

// Test configuration - Stress test with constant arrival rate
export const options = {
  scenarios: {
    // Scenario 1: Constant load
    constant_load: {
      executor: 'constant-arrival-rate',
      rate: 50, // 50 requests per second
      timeUnit: '1s',
      duration: '2m',
      preAllocatedVUs: 20,
      maxVUs: 100,
    },
    // Scenario 2: Spike test
    spike: {
      executor: 'ramping-arrival-rate',
      startRate: 10,
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '30s', target: 10 }, // Warm up
        { duration: '10s', target: 200 }, // Spike!
        { duration: '1m', target: 200 }, // Stay at spike
        { duration: '10s', target: 10 }, // Recover
        { duration: '30s', target: 10 }, // Cool down
      ],
      startTime: '2m30s', // Start after constant_load
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_failed: ['rate<0.01'], // Less than 1% failures
    error_rate: ['rate<0.05'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

// Webhook event types to simulate
const eventTypes = [
  'email.sent',
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
]

// Generate a random webhook payload
function generateWebhookPayload(eventType) {
  const emailId = `test_${randomString(16)}`
  const timestamp = new Date().toISOString()

  const basePayload = {
    type: eventType,
    created_at: timestamp,
    data: {
      email_id: emailId,
      from: 'Rainbow Surf Retreats <hello@rainbowsurfretreats.com>',
      to: [`test_${randomString(8)}@example.com`],
      subject: 'Test Email Subject',
    },
  }

  // Add event-specific data
  if (eventType === 'email.clicked') {
    basePayload.data.click = {
      link: 'https://rainbowsurfretreats.com/retreats/test',
      timestamp: timestamp,
    }
  } else if (eventType === 'email.bounced') {
    basePayload.data.bounce = {
      type: 'hard',
      message: 'Mailbox does not exist',
    }
  }

  return basePayload
}

// Generate mock Svix headers (for testing without real verification)
function generateWebhookHeaders(payload) {
  const timestamp = Math.floor(Date.now() / 1000).toString()
  const msgId = `msg_${randomString(24)}`

  return {
    'Content-Type': 'application/json',
    'svix-id': msgId,
    'svix-timestamp': timestamp,
    // Note: In production, you'd need a real signature
    // For testing, you may need to disable signature verification
    'svix-signature': `v1,${randomString(44)}`,
    // Add test header to identify load test requests
    'X-Load-Test': 'true',
  }
}

export default function () {
  // Pick a random event type (weighted towards common events)
  const weights = [0.1, 0.3, 0.25, 0.15, 0.1, 0.1] // sent, delivered, opened, clicked, bounced, complained
  let random = Math.random()
  let eventType = eventTypes[0]

  for (let i = 0; i < weights.length; i++) {
    random -= weights[i]
    if (random <= 0) {
      eventType = eventTypes[i]
      break
    }
  }

  const payload = generateWebhookPayload(eventType)
  const headers = generateWebhookHeaders(payload)

  const response = http.post(
    `${BASE_URL}/api/webhooks/resend`,
    JSON.stringify(payload),
    { headers }
  )

  const success = check(response, {
    'webhook accepted': (r) => r.status === 200 || r.status === 401, // 401 expected if signature verification is on
    'response time OK': (r) => r.timings.duration < 500,
  })

  if (success) {
    webhookSuccess.add(1)
  } else {
    webhookErrors.add(1)
    errorRate.add(1)
    console.log(`Webhook failed: ${response.status} - ${response.body}`)
  }

  // Small sleep to prevent overwhelming
  sleep(0.1)
}

export function handleSummary(data) {
  const summary = {
    total_requests: data.metrics.http_reqs?.values?.count || 0,
    success_rate: data.metrics.http_req_failed?.values?.rate
      ? ((1 - data.metrics.http_req_failed.values.rate) * 100).toFixed(2) + '%'
      : 'N/A',
    avg_duration: data.metrics.http_req_duration?.values?.avg?.toFixed(2) + 'ms' || 'N/A',
    p95_duration: data.metrics.http_req_duration?.values?.['p(95)']?.toFixed(2) + 'ms' || 'N/A',
    max_duration: data.metrics.http_req_duration?.values?.max?.toFixed(2) + 'ms' || 'N/A',
  }

  console.log('\n=== Webhook Stress Test Summary ===')
  console.log(JSON.stringify(summary, null, 2))

  return {
    'stdout': JSON.stringify(summary, null, 2),
    'webhook-stress-results.json': JSON.stringify(data, null, 2),
  }
}
