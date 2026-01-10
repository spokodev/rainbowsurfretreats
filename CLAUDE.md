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

---

## Documentation Guidelines

### Documentation Location
All project documentation is stored in `/DEV/` folder at the project root.

### When to Update Documentation

**ALWAYS update documentation when:**
1. Adding new admin features or pages
2. Creating new API endpoints
3. Changing database schema (new tables, columns, relationships)
4. Adding new cron jobs or background tasks
5. Changing authentication or authorization logic
6. Adding new email templates or notification types
7. Fixing significant bugs (document the issue and solution)
8. Changing integration points (Stripe, Resend, Supabase)

### Documentation Files

| File | Purpose | Update When |
|------|---------|-------------|
| `ADMIN_GUIDE.md` | User guide for admin panel | New features, UI changes |
| `ADMIN_README.md` | Technical overview of admin | Architecture changes |
| `BACKEND_INTEGRATION_SPEC.md` | API documentation | New/changed endpoints |
| `PROJECT_OVERVIEW.md` | High-level project info | Major changes |

### Documentation Format

1. **Use Ukrainian** for user-facing guides (ADMIN_GUIDE)
2. **Use English** for technical documentation
3. Include code examples where helpful
4. Document known issues and workarounds
5. Keep API documentation up-to-date with actual endpoints

### Known Issues Documentation

When documenting bugs:
```markdown
### Known Issues
| Priority | Issue | Location | Status |
|----------|-------|----------|--------|
| HIGH | Description | file.ts:line | Open/Fixed |
```

---

## Admin Panel Features

### Email Logs (`/admin/email-logs`)
- Tracks all sent emails via Resend
- Webhook integration for delivery status
- Statuses: sent, delivered, bounced, complained
- API: `/api/admin/email-logs`

### Waitlist (`/admin/waitlist`)
- Manages waitlist for sold-out retreats
- Notification system with 72h response window
- Statuses: waiting → notified → accepted/declined/expired
- API: `/api/admin/waitlist`, `/api/waitlist`

### Feedback (`/admin/feedback`)
- Guest feedback after retreats
- NPS calculation and rating analysis
- Export to CSV
- API: `/api/feedback`

---

## Code Conventions

### Admin Pages Structure
```
/app/admin/[feature]/page.tsx  - Main page component
/app/api/admin/[feature]/      - Admin API routes
/app/api/[feature]/            - Public API routes
```

### Empty States
All admin tables must have proper empty states with:
- Icon (opacity-30)
- Title (text-lg font-medium)
- Description (text-sm text-muted-foreground)
- "Clear filters" button if filters are active

### Error Handling
- Use toast notifications for user feedback
- Log errors to console in development
- Return proper HTTP status codes from API
