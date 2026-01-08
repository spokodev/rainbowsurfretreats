'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Eye, Mail, Calendar, User, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { SendEmailDialog } from '@/components/admin/send-email-dialog'
import { AdminSortHeader } from '@/components/admin/table'
import type { SortOrder } from '@/hooks/use-admin-table-state'

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
    id?: string
    destination: string
  } | null
  room: {
    name: string
  } | null
}

interface BookingsTableWithSortProps {
  bookings: Booking[]
  sortBy: string
  sortOrder: SortOrder
  onSort: (column: string) => void
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'confirmed':
      return 'default'
    case 'pending':
      return 'secondary'
    case 'cancelled':
      return 'destructive'
    default:
      return 'outline'
  }
}

const getPaymentBadgeVariant = (status: string) => {
  switch (status) {
    case 'paid':
      return 'default'
    case 'deposit':
      return 'secondary'
    case 'unpaid':
      return 'outline'
    case 'refunded':
      return 'destructive'
    default:
      return 'outline'
  }
}

export function BookingsTableWithSort({
  bookings,
  sortBy,
  sortOrder,
  onSort,
}: BookingsTableWithSortProps) {
  const [emailDialogOpen, setEmailDialogOpen] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const handleEmailClick = (booking: Booking) => {
    setSelectedBooking(booking)
    setEmailDialogOpen(true)
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <AdminSortHeader
                column="booking_number"
                label="Booking ID"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <AdminSortHeader
                column="first_name"
                label="Guest"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <TableHead>Retreat</TableHead>
              <TableHead>Room</TableHead>
              <AdminSortHeader
                column="check_in_date"
                label="Dates"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <TableHead>Guests</TableHead>
              <TableHead className="text-right">Paid</TableHead>
              <TableHead className="text-right">Balance</TableHead>
              <AdminSortHeader
                column="total_amount"
                label="Total"
                currentSort={sortBy}
                currentOrder={sortOrder}
                onSort={onSort}
                className="text-right"
              />
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow key={booking.id}>
                <TableCell className="font-mono text-sm">
                  {booking.booking_number}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">
                        {booking.first_name} {booking.last_name}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {booking.email}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{booking.retreat?.destination || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell>{booking.room?.name || 'Standard'}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div className="text-sm">
                      <div>
                        {new Date(booking.check_in_date).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </div>
                      <div className="text-muted-foreground">
                        to{' '}
                        {new Date(booking.check_out_date).toLocaleDateString(
                          'en-US',
                          { month: 'short', day: 'numeric' }
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{booking.guests_count}</TableCell>
                <TableCell className="text-right">
                  <span className="text-green-600 font-medium">
                    €{booking.deposit_amount?.toFixed(2) || '0.00'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span
                    className={
                      booking.balance_due > 0
                        ? 'text-orange-600 font-medium'
                        : 'text-muted-foreground'
                    }
                  >
                    €{booking.balance_due?.toFixed(2) || '0.00'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="font-semibold">
                    €{booking.total_amount?.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={getStatusBadgeVariant(booking.status)}>
                    {booking.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getPaymentBadgeVariant(booking.payment_status)}>
                    {booking.payment_status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/admin/bookings/${booking.id}`}>
                        <Eye className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEmailClick(booking)}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedBooking && (
        <SendEmailDialog
          open={emailDialogOpen}
          onOpenChange={setEmailDialogOpen}
          recipient={{
            email: selectedBooking.email,
            name: `${selectedBooking.first_name} ${selectedBooking.last_name}`,
            language: selectedBooking.language,
          }}
          defaultSubject={`Rainbow Surf Retreats - Booking #${selectedBooking.booking_number}`}
          context={{
            bookingId: selectedBooking.id,
            bookingNumber: selectedBooking.booking_number,
          }}
        />
      )}
    </>
  )
}
