'use client'

import { useState } from 'react'
import { Plus, Loader2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { getPaymentStatusConfig } from '@/lib/utils/payment-status'
import type { UnassignedBooking, PaymentStatus } from '@/lib/types/database'

interface QuickAssignPopoverProps {
  roomId: string
  roomName: string
  unassignedBookings: UnassignedBooking[]
  availableSpots: number
  onAssign: (bookingId: string) => Promise<void>
}

export function QuickAssignPopover({
  roomId,
  roomName,
  unassignedBookings,
  availableSpots,
  onAssign,
}: QuickAssignPopoverProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  // Filter guests that can fit in available spots
  const availableGuests = unassignedBookings.filter(booking => {
    const matchesSearch = search.trim() === '' ||
      booking.first_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.last_name.toLowerCase().includes(search.toLowerCase()) ||
      booking.email.toLowerCase().includes(search.toLowerCase())

    // Check if guest count fits in available spots
    const fitsInRoom = booking.guests_count <= availableSpots

    return matchesSearch && fitsInRoom
  })

  const handleAssign = async (bookingId: string) => {
    setLoading(bookingId)
    try {
      await onAssign(bookingId)
      setOpen(false)
      setSearch('')
    } finally {
      setLoading(null)
    }
  }

  if (unassignedBookings.length === 0 || availableSpots <= 0) {
    return null
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 text-muted-foreground hover:text-primary"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add Guest
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <p className="font-medium text-sm">Add guest to {roomName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {availableSpots} spot{availableSpots !== 1 ? 's' : ''} available
          </p>
        </div>

        {unassignedBookings.length > 3 && (
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search guests..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-sm"
              />
            </div>
          </div>
        )}

        <ScrollArea className="max-h-64">
          <div className="p-1">
            {availableGuests.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search ? 'No matching guests found' : 'No guests can fit in available spots'}
              </div>
            ) : (
              availableGuests.map((booking) => {
                const paymentConfig = getPaymentStatusConfig(booking.payment_status as PaymentStatus)
                const isLoading = loading === booking.id

                return (
                  <button
                    key={booking.id}
                    onClick={() => handleAssign(booking.id)}
                    disabled={isLoading}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent text-left transition-colors disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    ) : (
                      <div className="w-4 h-4 shrink-0" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">
                          {booking.first_name} {booking.last_name}
                        </span>
                        {booking.guests_count > 1 && (
                          <span className="text-xs text-muted-foreground">
                            ({booking.guests_count} guests)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {booking.email}
                      </p>
                    </div>

                    <Badge
                      variant="outline"
                      className={`h-5 text-xs shrink-0 ${paymentConfig.className}`}
                    >
                      {paymentConfig.label}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
