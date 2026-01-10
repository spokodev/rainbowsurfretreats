'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Mail,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Download,
  Clock,
  AlertTriangle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  AdminPagination,
  AdminSearchInput,
  AdminStatusFilter,
  AdminFilterBar,
  AdminDateRangeFilter,
  type StatusOption,
} from '@/components/admin/table'

interface EmailLog {
  id: string
  email_type: string
  recipient_email: string
  recipient_type: 'customer' | 'admin'
  subject: string
  booking_id: string | null
  payment_id: string | null
  resend_email_id: string | null
  status: 'sent' | 'delivered' | 'failed' | 'bounced'
  error_message: string | null
  delivered_at: string | null
  opened_at: string | null
  clicked_at: string | null
  bounced_at: string | null
  bounce_reason: string | null
  complained_at: string | null
  open_count: number
  click_count: number
  metadata: Record<string, unknown>
  created_at: string
  booking?: {
    id: string
    booking_number: string
    first_name: string
    last_name: string
    email: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const EMAIL_TYPE_OPTIONS: StatusOption[] = [
  { value: 'payment_failed', label: 'Payment Failed' },
  { value: 'deadline_reminder', label: 'Deadline Reminder' },
  { value: 'booking_confirmation', label: 'Booking Confirmation' },
  { value: 'booking_cancelled', label: 'Booking Cancelled' },
  { value: 'admin_payment_failed', label: 'Admin: Payment Failed' },
  { value: 'admin_waitlist_join', label: 'Admin: Waitlist Join' },
  { value: 'admin_new_booking', label: 'Admin: New Booking' },
]

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'sent', label: 'Sent' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'failed', label: 'Failed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complained', label: 'Spam Complaint' },
]

const RECIPIENT_TYPE_OPTIONS: StatusOption[] = [
  { value: 'customer', label: 'Customer' },
  { value: 'admin', label: 'Admin' },
]

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'delivered':
      return 'default'
    case 'sent':
      return 'secondary'
    case 'failed':
    case 'bounced':
    case 'complained':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'delivered':
      return <CheckCircle className="h-3 w-3" />
    case 'sent':
      return <Clock className="h-3 w-3" />
    case 'failed':
    case 'bounced':
      return <XCircle className="h-3 w-3" />
    case 'complained':
      return <AlertTriangle className="h-3 w-3" />
    default:
      return null
  }
}

const getTypeLabel = (type: string) => {
  const found = EMAIL_TYPE_OPTIONS.find((t) => t.value === type)
  return found?.label || type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const exportToCSV = (logs: EmailLog[]) => {
  const headers = [
    'Date',
    'Type',
    'Recipient',
    'Recipient Type',
    'Subject',
    'Status',
    'Delivered',
    'Opened',
    'Clicked',
    'Booking',
    'Error',
  ]

  const rows = logs.map((log) => [
    new Date(log.created_at).toISOString(),
    log.email_type,
    log.recipient_email,
    log.recipient_type,
    log.subject,
    log.status,
    log.delivered_at ? 'Yes' : 'No',
    log.opened_at ? `Yes (${log.open_count}x)` : 'No',
    log.clicked_at ? `Yes (${log.click_count}x)` : 'No',
    log.booking?.booking_number || '',
    log.error_message || log.bounce_reason || '',
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)
  link.setAttribute('href', url)
  link.setAttribute(
    'download',
    `email-logs-${new Date().toISOString().split('T')[0]}.csv`
  )
  link.style.visibility = 'hidden'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function EmailLogsPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse state from URL
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || 50
  const search = searchParams.get('search') || ''
  const type = searchParams.get('type') || ''
  const status = searchParams.get('status') || ''
  const recipientType = searchParams.get('recipientType') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''

  const [logs, setLogs] = useState<EmailLog[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
  })
  const [stats, setStats] = useState<{
    sent: number
    delivered: number
    failed: number
    opened: number
    total: number
  }>({ sent: 0, delivered: 0, failed: 0, opened: 0, total: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Email preview modal state
  const [previewEmail, setPreviewEmail] = useState<{
    id: string
    subject: string
    htmlContent: string | null
    status: string
    errorMessage: string | null
  } | null>(null)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  const hasActiveFilters =
    !!type || !!status || !!recipientType || !!dateFrom || !!dateTo || !!search

  const resetFilters = useCallback(() => {
    updateParams({
      search: null,
      type: null,
      status: null,
      recipientType: null,
      dateFrom: null,
      dateTo: null,
      page: null,
    })
  }, [updateParams])

  const fetchLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pageSize.toString(),
      })

      if (type) params.append('type', type)
      if (status) params.append('status', status)
      if (recipientType) params.append('recipientType', recipientType)
      if (search) params.append('search', search)
      if (dateFrom) params.append('dateFrom', dateFrom)
      if (dateTo) params.append('dateTo', dateTo)

      const res = await fetch(`/api/admin/email-logs?${params}`)
      if (!res.ok) throw new Error('Failed to fetch email logs')
      const data = await res.json()

      setLogs(data.data || [])
      setPagination((prev) => ({
        ...prev,
        ...data.pagination,
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [page, pageSize, type, status, recipientType, search, dateFrom, dateTo])

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/email-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stats' }),
      })
      if (!res.ok) return
      const data = await res.json()
      const byStatus = data.data?.byStatus || {}
      setStats({
        sent: byStatus.sent || 0,
        delivered: byStatus.delivered || 0,
        failed: (byStatus.failed || 0) + (byStatus.bounced || 0),
        opened: data.data?.opened || 0,
        total: data.data?.total || 0,
      })
    } catch {
      // Stats fetch failed - not critical, use zeros
    }
  }, [])

  // Fetch email content for preview
  const fetchEmailPreview = useCallback(async (emailId: string, subject: string) => {
    setIsLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/email-logs/${emailId}`)
      if (!res.ok) {
        throw new Error('Failed to fetch email content')
      }
      const data = await res.json()
      setPreviewEmail({
        id: emailId,
        subject,
        htmlContent: data.data?.html_content || null,
        status: data.data?.status || 'sent',
        errorMessage: data.data?.error_message || null,
      })
    } catch (err) {
      console.error('Error fetching email preview:', err)
      setPreviewEmail({
        id: emailId,
        subject,
        htmlContent: null,
        status: 'failed',
        errorMessage: 'Failed to load email details',
      })
    } finally {
      setIsLoadingPreview(false)
    }
  }, [])

  useEffect(() => {
    fetchLogs()
    fetchStats()
  }, [fetchLogs, fetchStats])

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <AlertCircle className="h-12 w-12 text-destructive mb-4" />
        <p className="text-lg font-medium">Error loading email logs</p>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={fetchLogs} className="mt-4">
          Try Again
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email Logs</h1>
          <p className="text-muted-foreground">
            Track all sent emails with delivery and engagement status
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchLogs} disabled={isLoading}>
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={() => exportToCSV(logs)}
            disabled={logs.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Sent
            </CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{stats.total}</div>
            <p className="text-xs text-muted-foreground">All emails</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-green-600">
              {stats.delivered}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.delivered / stats.total) * 100).toFixed(0)}% delivery rate` : 'No emails yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed/Bounced
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-destructive">
              {stats.failed}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.total > 0 ? `${((stats.failed / stats.total) * 100).toFixed(1)}% failure rate` : 'No emails yet'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Opened
            </CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-blue-600">
              {stats.opened}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.delivered > 0 ? `${((stats.opened / stats.delivered) * 100).toFixed(0)}% open rate` : 'No delivered emails'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Email Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>Email Activity</CardTitle>
          {pagination.total > 0 && (
            <CardDescription>
              Showing {logs.length} of {pagination.total} emails
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <AdminSearchInput
              value={search}
              onChange={(value) => updateParams({ search: value || null, page: null })}
              placeholder="Search by email address..."
              className="max-w-sm"
            />

            <AdminFilterBar hasActiveFilters={hasActiveFilters} onReset={resetFilters}>
              <AdminStatusFilter
                value={type || 'all'}
                onChange={(value) => updateParams({ type: value, page: null })}
                options={EMAIL_TYPE_OPTIONS}
                placeholder="Email Type"
                className="w-[180px]"
              />
              <AdminStatusFilter
                value={status || 'all'}
                onChange={(value) => updateParams({ status: value, page: null })}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="w-[140px]"
              />
              <AdminStatusFilter
                value={recipientType || 'all'}
                onChange={(value) => updateParams({ recipientType: value, page: null })}
                options={RECIPIENT_TYPE_OPTIONS}
                placeholder="Recipient"
                className="w-[140px]"
              />
              <AdminDateRangeFilter
                fromValue={dateFrom || null}
                toValue={dateTo || null}
                onFromChange={(value) => updateParams({ dateFrom: value, page: null })}
                onToChange={(value) => updateParams({ dateTo: value, page: null })}
                fromPlaceholder="From date"
                toPlaceholder="To date"
              />
            </AdminFilterBar>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Mail className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <h3 className="text-lg font-medium text-foreground mb-1">No email logs yet</h3>
              <p className="text-sm max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No emails match your filters. Try adjusting or clearing them.'
                  : 'Email delivery logs will appear here as emails are sent from the system.'}
              </p>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" className="mt-4" onClick={resetFilters}>
                  Clear all filters
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tracking</TableHead>
                    <TableHead>Booking</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.recipient_type === 'admin'
                              ? 'outline'
                              : 'secondary'
                          }
                        >
                          {getTypeLabel(log.email_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-sm truncate max-w-[200px]">
                            {log.recipient_email}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {log.recipient_type}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className="text-sm truncate block max-w-[250px]"
                          title={log.subject}
                        >
                          {log.subject}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={getStatusBadgeVariant(log.status)}
                            className="gap-1 w-fit"
                          >
                            {getStatusIcon(log.status)}
                            {log.status}
                          </Badge>
                          {(log.error_message || log.bounce_reason) && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button className="inline-flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 cursor-help">
                                  <AlertCircle className="h-3.5 w-3.5" />
                                  <span className="underline decoration-dotted">
                                    {log.bounce_reason ? 'Bounced' : 'Error'}
                                  </span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="bottom"
                                className="max-w-[300px] bg-destructive text-destructive-foreground"
                              >
                                <p className="text-sm font-medium mb-1">
                                  {log.bounce_reason ? 'Bounce Reason' : 'Error Message'}
                                </p>
                                <p className="text-xs">
                                  {log.error_message || log.bounce_reason}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {log.delivered_at && (
                            <span
                              className="text-green-600"
                              title={`Delivered: ${formatDate(log.delivered_at)}`}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </span>
                          )}
                          {log.opened_at && (
                            <span
                              className="text-blue-600 flex items-center gap-0.5"
                              title={`Opened: ${formatDate(log.opened_at)}`}
                            >
                              <Eye className="h-4 w-4" />
                              {log.open_count > 1 && (
                                <span className="text-xs">{log.open_count}</span>
                              )}
                            </span>
                          )}
                          {log.clicked_at && (
                            <span
                              className="text-purple-600 flex items-center gap-0.5"
                              title={`Clicked: ${formatDate(log.clicked_at)}`}
                            >
                              <MousePointer className="h-4 w-4" />
                              {log.click_count > 1 && (
                                <span className="text-xs">{log.click_count}</span>
                              )}
                            </span>
                          )}
                          {log.complained_at && (
                            <span
                              className="text-orange-600"
                              title={`Spam complaint: ${formatDate(log.complained_at)}`}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </span>
                          )}
                          {!log.delivered_at &&
                            !log.opened_at &&
                            !log.clicked_at &&
                            log.status === 'sent' && (
                              <span className="text-muted-foreground text-xs">
                                Pending
                              </span>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.booking?.booking_number ? (
                          <Link
                            href={`/admin/bookings/${log.booking_id}`}
                            className="text-primary hover:underline font-mono text-sm"
                          >
                            {log.booking.booking_number}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => fetchEmailPreview(log.id, log.subject)}
                          title="View email content"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <AdminPagination
                page={pagination.page}
                pageSize={pagination.limit}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={(newPage) => updateParams({ page: newPage.toString() })}
                onPageSizeChange={(size) =>
                  updateParams({ pageSize: size.toString(), page: null })
                }
              />
            </>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={!!previewEmail} onOpenChange={() => setPreviewEmail(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">
              {previewEmail?.subject || 'Email Preview'}
            </DialogTitle>
          </DialogHeader>

          {/* Error Banner */}
          {previewEmail?.status === 'failed' && previewEmail.errorMessage && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 mb-4">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Email Failed to Send</p>
                  <p className="text-sm text-destructive/80 mt-1">
                    {previewEmail.errorMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-auto min-h-0">
            {isLoadingPreview ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : previewEmail?.htmlContent ? (
              <iframe
                srcDoc={previewEmail.htmlContent}
                className="w-full h-[70vh] border rounded-md bg-white"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Mail className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-lg font-medium">No content available</p>
                <p className="text-sm">
                  Email content is only stored for emails sent after this feature was enabled.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AdminEmailLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <EmailLogsPageContent />
    </Suspense>
  )
}
