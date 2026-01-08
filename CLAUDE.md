# Project Rules for Claude

## Cron Jobs

**Important:** This project uses external cron service (cron-job.org) instead of Vercel Cron.

All cron endpoints should be configured at https://cron-job.org

### Current Cron Jobs:
- `/api/cron/process-payments` - Process scheduled payments
- `/api/cron/send-reminders` - Send payment deadline reminders
- `/api/cron/cleanup-trash` - Clean up deleted items and old email logs (>3 years)
- `/api/cron/expire-waitlist` - Expire old waitlist offers
- `/api/cron/publish-scheduled` - Publish scheduled blog posts
- `/api/cron/send-followup` - Send follow-up emails
- `/api/cron/weekly-summary` - Send weekly admin summary

### Cron Security:
All cron endpoints require `Authorization: Bearer {CRON_SECRET}` header.

## Deployment

- Hosting: Vercel
- Database: Supabase
- Email: Resend
- Payments: Stripe

## Environment Variables

Production environment variables are managed in Vercel Dashboard.
