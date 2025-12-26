# Cron Jobs Setup (Free Tier)

Since Vercel free tier doesn't support cron jobs, you need to use an external cron service.

## Recommended: cron-job.org (Free)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Create the following cron jobs:

### 1. Process Payments (Daily at 9:00 AM UTC)

- **URL:** `https://your-domain.vercel.app/api/cron/process-payments`
- **Schedule:** `0 9 * * *`
- **Method:** GET
- **Headers:**
  ```
  Authorization: Bearer YOUR_CRON_SECRET
  ```

### 2. Send Reminders (Daily at 10:00 AM UTC)

- **URL:** `https://your-domain.vercel.app/api/cron/send-reminders`
- **Schedule:** `0 10 * * *`
- **Method:** GET
- **Headers:**
  ```
  Authorization: Bearer YOUR_CRON_SECRET
  ```

## Environment Variable

Make sure to set `CRON_SECRET` in your Vercel environment variables:

```
CRON_SECRET=your-secure-random-string-here
```

Generate a secure secret:
```bash
openssl rand -base64 32
```

## Alternative Services

- **EasyCron** - https://www.easycron.com (200 free runs/month)
- **UptimeRobot** - https://uptimerobot.com (can ping every 5 min)
- **GitHub Actions** - Free for public repos

### GitHub Actions Example

Create `.github/workflows/cron.yml`:

```yaml
name: Scheduled Tasks

on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9:00 UTC

jobs:
  process-payments:
    runs-on: ubuntu-latest
    steps:
      - name: Process payments
        run: |
          curl -X GET "https://your-domain.vercel.app/api/cron/process-payments" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"

  send-reminders:
    runs-on: ubuntu-latest
    needs: process-payments
    steps:
      - name: Send reminders
        run: |
          curl -X GET "https://your-domain.vercel.app/api/cron/send-reminders" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Manual Trigger

You can also trigger cron jobs manually from the admin panel:
- Go to Admin > Payments
- Click "Process Due Payments" button

Or via API:
```bash
curl -X POST "https://your-domain.vercel.app/api/cron/process-payments" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Cron Job Endpoints

| Endpoint | Purpose | Recommended Schedule |
|----------|---------|---------------------|
| `/api/cron/process-payments` | Charge scheduled payments | Daily at 9:00 AM |
| `/api/cron/send-reminders` | Send payment & pre-retreat reminders | Daily at 10:00 AM |
