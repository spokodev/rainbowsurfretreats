# Load & Stress Testing

This directory contains k6 load testing scripts for Rainbow Surf Retreats.

## Prerequisites

### Install k6

```bash
# macOS
brew install k6

# Windows (chocolatey)
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Available Tests

### 1. Basic Load Test (`basic-load.js`)

Tests the main public endpoints under normal to moderate load conditions.

```bash
# Run locally
k6 run scripts/load-tests/basic-load.js

# Run against production
k6 run -e BASE_URL=https://rainbowsurfretreats.com scripts/load-tests/basic-load.js
```

**What it tests:**
- Homepage loading
- Retreats API
- Individual retreat pages
- Static assets

**Thresholds:**
- 95% of requests under 1 second
- Less than 1% error rate

---

### 2. Webhook Stress Test (`webhook-stress.js`)

Simulates high volume of Resend webhook events.

```bash
k6 run scripts/load-tests/webhook-stress.js
```

**What it tests:**
- Webhook endpoint performance under load
- Handling of various event types (sent, delivered, opened, clicked, bounced)
- Spike handling (sudden burst of events)

**Thresholds:**
- 95% of requests under 500ms
- Less than 1% error rate

**Note:** This test requires webhook signature verification to be disabled or a valid test signature configured.

---

### 3. Booking Flow Test (`booking-flow.js`)

Simulates a "retreat launch" scenario with many concurrent bookings.

```bash
k6 run scripts/load-tests/booking-flow.js
```

**What it tests:**
- Full booking flow performance
- Concurrent booking handling
- Payment intent creation
- Overbooking prevention

**Scenarios:**
1. Normal browsing traffic (30 VUs)
2. Booking rush (50 requests/sec spike)

**Thresholds:**
- 95% of requests under 2 seconds
- Less than 5% error rate

---

### 4. Waitlist Spike Test (`waitlist-spike.js`)

Simulates a rush to join waitlist when a popular retreat sells out.

```bash
k6 run scripts/load-tests/waitlist-spike.js

# With specific retreat ID
k6 run -e RETREAT_ID=your-retreat-id scripts/load-tests/waitlist-spike.js
```

**What it tests:**
- Waitlist join performance under load
- Duplicate email prevention
- Database constraint handling
- Spike traffic handling

**Scenarios:**
1. Normal traffic (5 VUs)
2. Spike to 100 requests/sec
3. Duplicate join attempts

**Thresholds:**
- 95% of requests under 1 second
- Less than 5% error rate
- Duplicate detection working

---

## Running Tests

### Basic Commands

```bash
# Run a specific test
k6 run scripts/load-tests/basic-load.js

# Run with custom base URL
k6 run -e BASE_URL=https://staging.rainbowsurfretreats.com scripts/load-tests/basic-load.js

# Run with JSON output
k6 run --out json=results.json scripts/load-tests/basic-load.js

# Run with web dashboard (k6 cloud)
k6 run --out cloud scripts/load-tests/basic-load.js
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Target server URL |
| `RETREAT_ID` | `test-retreat-id` | Retreat ID for waitlist tests |
| `WEBHOOK_SECRET` | - | Webhook signature secret |

---

## Interpreting Results

### Key Metrics

| Metric | Good | Warning | Critical |
|--------|------|---------|----------|
| `http_req_duration p(95)` | < 500ms | 500ms - 2s | > 2s |
| `http_req_failed` | < 1% | 1% - 5% | > 5% |
| `vus` | Stable | Fluctuating | Dropping |

### Common Issues

1. **High p(95) latency**
   - Check database connection pool
   - Look for N+1 queries
   - Consider caching

2. **Increasing error rate**
   - Check server logs
   - Verify rate limits
   - Check external service availability

3. **Memory issues (endurance tests)**
   - Monitor server memory
   - Check for memory leaks
   - Review connection handling

---

## Monitoring During Tests

### Recommended Dashboards

1. **Vercel** (if deployed there)
   - Function invocations
   - Response times
   - Error rates

2. **Supabase**
   - Database connections
   - Query performance
   - Row operations

3. **Stripe**
   - API request rate
   - Error rate
   - Webhook delivery

4. **Resend**
   - Email queue depth
   - Delivery rate

---

## Best Practices

1. **Always test in staging first**
2. **Notify team before production tests**
3. **Start with low load, increase gradually**
4. **Monitor external services (Stripe, Resend)**
5. **Clean up test data after tests**
6. **Document any issues found**

---

## Troubleshooting

### "Too many open files" error

Increase system limits:
```bash
ulimit -n 10000
```

### Connection timeouts

Reduce virtual users or add connection pooling.

### Webhook signature failures

For testing, either:
1. Disable signature verification temporarily
2. Configure a test webhook secret
3. Use the `X-Load-Test: true` header to bypass verification

---

## Results Storage

Test results are saved to:
- `*-results.json` - Detailed metrics
- stdout - Summary

To analyze results:
```bash
# View summary
cat booking-flow-results.json | jq '.metrics.http_req_duration'

# Generate HTML report (requires k6 extension)
k6 run --out json=results.json script.js
# Then use a visualization tool
```
