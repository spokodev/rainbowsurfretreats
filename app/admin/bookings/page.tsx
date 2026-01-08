'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { Plus, Loader2, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useAdminTableState } from '@/hooks/use-admin-table-state'
import {
  AdminPagination,
  AdminSearchInput,
  AdminStatusFilter,
  AdminFilterBar,
  AdminDateRangeFilter,
  type StatusOption,
} from '@/components/admin/table'
import { BookingsTableWithSort } from '@/components/admin/bookings-table-with-sort'

interface Booking {
  id: string
  booking_number: string
  first_name: string
  last_name: string
  email: string
  guests_count: number
  total_amount: number
  deposit_amount: number
  balance_due: number
  status: string
  payment_status: string
  check_in_date: string
  check_out_date: string
  created_at: string
  language?: string
  retreat: {
    id: string
    destination: string
  } | null
  room: {
    name: string
  } | null
}

interface BookingsResponse {
  data: Booking[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  stats: {
    confirmed: number
    pending: number
    cancelled: number
    total: number
  }
}

const STATUS_OPTIONS: StatusOption[] = [
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
]

const PAYMENT_STATUS_OPTIONS: StatusOption[] = [
  { value: 'paid', label: 'Paid' },
  { value: 'deposit', label: 'Deposit' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'refunded', label: 'Refunded' },
]

function BookingsPageContent() {
  const [bookings, setBookings] = useState<Booking[]>([])
  const [stats, setStats] = useState({ confirmed: 0, pending: 0, cancelled: 0, total: 0 })
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const tableState = useAdminTableState({
    defaultPageSize: 25,
    defaultSortBy: 'created_at',
    defaultSortOrder: 'desc',
    filterKeys: ['status', 'paymentStatus', 'retreatId', 'dateFrom', 'dateTo'],
  })

  const fetchBookings = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      params.set('page', tableState.page.toString())
      params.set('pageSize', tableState.pageSize.toString())
      if (tableState.search) params.set('search', tableState.search)
      if (tableState.sortBy) params.set('sort', tableState.sortBy)
      if (tableState.sortOrder) params.set('order', tableState.sortOrder)

      // Add filters
      Object.entries(tableState.filters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          params.set(key, value)
        }
      })

      const response = await fetch(`/api/admin/bookings?${params.toString()}`)
      if (!response.ok) {
        throw new Error('Failed to fetch bookings')
      }

      const data: BookingsResponse = await response.json()
      setBookings(data.data)
      setPagination(data.pagination)
      setStats(data.stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }, [tableState.page, tableState.pageSize, tableState.search, tableState.sortBy, tableState.sortOrder, tableState.filters])

  useEffect(() => {
    fetchBookings()
  }, [fetchBookings])

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground">
            Manage guest bookings and reservations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchBookings} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button asChild>
            <Link href="/admin/bookings/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Booking
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.confirmed}</div>
            <p className="text-xs text-muted-foreground">Confirmed</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">Pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.cancelled}</div>
            <p className="text-xs text-muted-foreground">Cancelled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bookings</CardTitle>
          <CardDescription>View and manage all guest reservations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search and Filters */}
          <div className="space-y-4">
            <AdminSearchInput
              value={tableState.search}
              onChange={tableState.setSearch}
              placeholder="Search by booking #, name, or email..."
              className="max-w-sm"
            />

            <AdminFilterBar
              hasActiveFilters={tableState.hasActiveFilters}
              onReset={tableState.resetFilters}
            >
              <AdminStatusFilter
                value={tableState.filters.status || 'all'}
                onChange={(value) => tableState.setFilter('status', value)}
                options={STATUS_OPTIONS}
                placeholder="Status"
                className="w-[140px]"
              />
              <AdminStatusFilter
                value={tableState.filters.paymentStatus || 'all'}
                onChange={(value) => tableState.setFilter('paymentStatus', value)}
                options={PAYMENT_STATUS_OPTIONS}
                placeholder="Payment"
                className="w-[140px]"
              />
              <AdminDateRangeFilter
                fromValue={tableState.filters.dateFrom || null}
                toValue={tableState.filters.dateTo || null}
                onFromChange={(value) => tableState.setFilter('dateFrom', value)}
                onToChange={(value) => tableState.setFilter('dateTo', value)}
                fromPlaceholder="Check-in from"
                toPlaceholder="Check-in to"
              />
            </AdminFilterBar>
          </div>

          {/* Error State */}
          {error && (
            <div className="text-center py-8">
              <p className="text-red-500 mb-4">{error}</p>
              <Button onClick={fetchBookings}>Try again</Button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !error && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && bookings.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">
                {tableState.hasActiveFilters
                  ? 'No bookings match your filters'
                  : 'No bookings found'}
              </p>
              {tableState.hasActiveFilters ? (
                <Button variant="outline" onClick={tableState.resetFilters}>
                  Clear filters
                </Button>
              ) : (
                <Button asChild>
                  <Link href="/admin/bookings/new">Create your first booking</Link>
                </Button>
              )}
            </div>
          )}

          {/* Table */}
          {!isLoading && !error && bookings.length > 0 && (
            <>
              <BookingsTableWithSort
                bookings={bookings}
                sortBy={tableState.sortBy}
                sortOrder={tableState.sortOrder}
                onSort={tableState.setSort}
              />

              <AdminPagination
                page={pagination.page}
                pageSize={pagination.pageSize}
                total={pagination.total}
                totalPages={pagination.totalPages}
                onPageChange={tableState.setPage}
                onPageSizeChange={(size) => tableState.updateParams({ pageSize: size.toString(), page: null })}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function AdminBookingsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <BookingsPageContent />
    </Suspense>
  )
}
