'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useTranslations } from 'next-intl'
import {
  Mail,
  Users,
  Send,
  BarChart3,
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Loader2,
  Search,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import Link from 'next/link'

interface Subscriber {
  id: string
  email: string
  first_name: string | null
  language: string
  source: string
  status: string
  confirmed_at: string | null
  unsubscribed_at: string | null
  quiz_completed: boolean
  created_at: string
  last_booking?: { booking_number: string } | null
}

interface Campaign {
  id: string
  name: string
  status: string
  sent_at: string | null
  created_at: string
  target_languages: string[]
  stats: {
    total: number
    sent: number
    delivered: number
    opened: number
    clicked: number
    openRate: number
    clickRate: number
  }
}

interface Stats {
  subscribers: {
    total: number
    active: number
    pending: number
    unsubscribed: number
    bounced: number
    byLanguage: Record<string, number>
    bySource: Record<string, number>
  }
  campaigns: {
    total: number
    draft: number
    sent: number
    scheduled: number
  }
  emailPerformance: {
    sent: number
    delivered: number
    opened: number
    clicked: number
    bounced: number
    deliveryRate: number
    openRate: number
    clickRate: number
    period: string
  }
  growth: {
    newSubscribersLast7Days: number
    growthRate: number
  }
}

export default function AdminNewsletterPage() {
  // BUG-019 FIX: Use translations for toast messages
  const t = useTranslations('adminNewsletter')

  const [activeTab, setActiveTab] = useState('subscribers')
  const [subscribers, setSubscribers] = useState<Subscriber[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [languageFilter, setLanguageFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Debounce search input (300ms delay)
  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(value)
    }, 300)
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current)
      }
    }
  }, [])

  // Pagination
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [summary, setSummary] = useState({ total: 0, active: 0, pending: 0, unsubscribed: 0, bounced: 0 })

  const fetchSubscribers = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      params.set('page', page.toString())
      params.set('limit', '50')
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (languageFilter !== 'all') params.set('language', languageFilter)
      if (debouncedSearch) params.set('search', debouncedSearch)

      const response = await fetch(`/api/admin/newsletter/subscribers?${params}`)
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      setSubscribers(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setSummary(result.summary || { total: 0, active: 0, pending: 0, unsubscribed: 0, bounced: 0 })
    } catch (error) {
      console.error('Fetch subscribers error:', error)
      toast.error(t('toast.loadSubscribersFailed'))
    } finally {
      setIsLoading(false)
    }
  }, [page, statusFilter, languageFilter, debouncedSearch, t])

  const fetchCampaigns = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter/campaigns')
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      setCampaigns(result.data || [])
    } catch (error) {
      console.error('Fetch campaigns error:', error)
      toast.error(t('toast.loadCampaignsFailed'))
    }
  }, [t])

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/newsletter/stats')
      const result = await response.json()

      if (!response.ok) throw new Error(result.error)

      setStats(result)
    } catch (error) {
      console.error('Fetch stats error:', error)
      toast.error(t('toast.loadStatsFailed'))
    }
  }, [t])

  useEffect(() => {
    if (activeTab === 'subscribers') {
      fetchSubscribers()
    } else if (activeTab === 'campaigns') {
      fetchCampaigns()
    } else if (activeTab === 'analytics') {
      fetchStats()
    }
  }, [activeTab, fetchSubscribers, fetchCampaigns, fetchStats])

  const handleDeleteSubscriber = async (id: string) => {
    try {
      setIsDeleting(id)
      const response = await fetch(`/api/admin/newsletter/subscribers/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete')

      toast.success(t('toast.subscriberDeleted'))
      fetchSubscribers()
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(t('toast.deleteSubscriberFailed'))
    } finally {
      setIsDeleting(null)
    }
  }

  const handleExport = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (languageFilter !== 'all') params.set('language', languageFilter)

      const response = await fetch(`/api/admin/newsletter/subscribers/export?${params}`)

      if (!response.ok) {
        // Check if response is JSON error
        const contentType = response.headers.get('content-type')
        if (contentType?.includes('application/json')) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Export failed')
        }
        throw new Error('Export failed')
      }

      // Validate response is CSV before creating blob
      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('text/csv')) {
        throw new Error('Invalid response format')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `newsletter-subscribers-${new Date().toISOString().split('T')[0]}.csv`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success(t('toast.exportSuccess'))
    } catch (error) {
      console.error('Export error:', error)
      toast.error(error instanceof Error ? error.message : t('toast.exportFailed'))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>
      case 'pending':
        return <Badge className="bg-orange-100 text-orange-700 border-orange-200"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
      case 'unsubscribed':
        return <Badge variant="outline"><XCircle className="w-3 h-3 mr-1" />Unsubscribed</Badge>
      case 'bounced':
        return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Bounced</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getCampaignStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Sent</Badge>
      case 'sending':
        return <Badge variant="secondary" className="bg-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" />Sending</Badge>
      case 'scheduled':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Scheduled</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Newsletter</h1>
          <p className="text-muted-foreground">Manage subscribers and email campaigns</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="subscribers" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Subscribers
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Campaigns
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Subscribers Tab */}
        <TabsContent value="subscribers" className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl">{summary.total}</CardTitle>
                <CardDescription>Total</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-green-600">{summary.active}</CardTitle>
                <CardDescription>Active</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-orange-500">{summary.pending}</CardTitle>
                <CardDescription>Pending</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-gray-500">{summary.unsubscribed}</CardTitle>
                <CardDescription>Unsubscribed</CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-2xl text-red-600">{summary.bounced}</CardTitle>
                <CardDescription>Bounced</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4 items-center">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      placeholder="Search by email..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
                    <SelectItem value="bounced">Bounced</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="de">German</SelectItem>
                    <SelectItem value="es">Spanish</SelectItem>
                    <SelectItem value="fr">French</SelectItem>
                    <SelectItem value="nl">Dutch</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={handleExport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={fetchSubscribers}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Subscribers Table */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Language</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Last Booking</TableHead>
                      <TableHead>Subscribed</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {subscribers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                          No subscribers found
                        </TableCell>
                      </TableRow>
                    ) : (
                      subscribers.map((subscriber) => (
                        <TableRow key={subscriber.id}>
                          <TableCell className="font-medium">{subscriber.email}</TableCell>
                          <TableCell>{subscriber.first_name || '-'}</TableCell>
                          <TableCell>{getStatusBadge(subscriber.status)}</TableCell>
                          <TableCell className="uppercase">{subscriber.language}</TableCell>
                          <TableCell className="capitalize">{subscriber.source}</TableCell>
                          <TableCell>
                            {subscriber.last_booking?.booking_number || '-'}
                          </TableCell>
                          <TableCell>
                            {new Date(subscriber.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={isDeleting === subscriber.id}
                                >
                                  {isDeleting === subscriber.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                  )}
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Delete Subscriber?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This will permanently delete {subscriber.email} from the newsletter list.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDeleteSubscriber(subscriber.id)}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button
                variant="outline"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="py-2 px-4">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Email Campaigns</h2>
            <Link href="/admin/newsletter/campaigns/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Campaign
              </Button>
            </Link>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Recipients</TableHead>
                    <TableHead>Opens</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>Sent At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No campaigns yet. Create your first campaign!
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell>{getCampaignStatusBadge(campaign.status)}</TableCell>
                        <TableCell>{campaign.stats.total}</TableCell>
                        <TableCell>
                          {campaign.stats.opened} ({campaign.stats.openRate}%)
                        </TableCell>
                        <TableCell>
                          {campaign.stats.clicked} ({campaign.stats.clickRate}%)
                        </TableCell>
                        <TableCell>
                          {campaign.sent_at
                            ? new Date(campaign.sent_at).toLocaleDateString()
                            : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/newsletter/campaigns/${campaign.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          {stats ? (
            <>
              {/* Overview Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-3xl">{stats.subscribers.total}</CardTitle>
                    <CardDescription>Total Subscribers</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-green-600">
                      +{stats.growth.newSubscribersLast7Days} this week
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-3xl">{stats.campaigns.sent}</CardTitle>
                    <CardDescription>Campaigns Sent</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      {stats.campaigns.draft} drafts
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-3xl">{stats.emailPerformance.openRate}%</CardTitle>
                    <CardDescription>Open Rate (30d)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      {stats.emailPerformance.opened} opens
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-3xl">{stats.emailPerformance.clickRate}%</CardTitle>
                    <CardDescription>Click Rate (30d)</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      {stats.emailPerformance.clicked} clicks
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Subscribers by Language */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscribers by Language</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.subscribers.byLanguage).map(([lang, count]) => (
                        <div key={lang} className="flex justify-between items-center">
                          <span className="uppercase font-medium">{lang}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 bg-blue-500 rounded"
                              style={{
                                width: `${Math.min((count / stats.subscribers.total) * 200, 200)}px`,
                              }}
                            />
                            <span className="text-sm text-gray-500">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Subscribers by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(stats.subscribers.bySource).map(([source, count]) => (
                        <div key={source} className="flex justify-between items-center">
                          <span className="capitalize font-medium">{source}</span>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 bg-green-500 rounded"
                              style={{
                                width: `${Math.min((count / stats.subscribers.total) * 200, 200)}px`,
                              }}
                            />
                            <span className="text-sm text-gray-500">{count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Email Performance */}
              <Card>
                <CardHeader>
                  <CardTitle>Email Performance (Last 30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{stats.emailPerformance.sent}</p>
                      <p className="text-sm text-gray-500">Sent</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{stats.emailPerformance.delivered}</p>
                      <p className="text-sm text-gray-500">Delivered</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{stats.emailPerformance.opened}</p>
                      <p className="text-sm text-gray-500">Opened</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums">{stats.emailPerformance.clicked}</p>
                      <p className="text-sm text-gray-500">Clicked</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold tabular-nums text-red-500">{stats.emailPerformance.bounced}</p>
                      <p className="text-sm text-gray-500">Bounced</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
