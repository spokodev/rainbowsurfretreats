'use client'

import { useDroppable } from '@dnd-kit/core'
import { Users, Search } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { GuestCard } from './guest-card'
import type { UnassignedBooking } from '@/lib/types/database'

interface UnassignedPoolProps {
  bookings: UnassignedBooking[]
}

export function UnassignedPool({ bookings }: UnassignedPoolProps) {
  const [search, setSearch] = useState('')

  const { isOver, setNodeRef } = useDroppable({
    id: 'unassigned-pool',
    data: {
      type: 'unassigned',
      roomId: null,
    },
  })

  const filteredBookings = bookings.filter(booking => {
    if (!search.trim()) return true
    const searchLower = search.toLowerCase()
    return (
      booking.first_name.toLowerCase().includes(searchLower) ||
      booking.last_name.toLowerCase().includes(searchLower) ||
      booking.email.toLowerCase().includes(searchLower)
    )
  })

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col w-72 shrink-0 rounded-lg border bg-muted/30
        ${isOver ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="p-3 border-b bg-muted/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Unassigned</h3>
          </div>
          <Badge variant="secondary">{bookings.length}</Badge>
        </div>

        {bookings.length > 3 && (
          <div className="relative mt-2">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm bg-background"
            />
          </div>
        )}
      </div>

      {/* Booking list */}
      <div className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto">
        {filteredBookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
            {bookings.length === 0 ? (
              <>
                <Users className="w-8 h-8 mb-2 opacity-50" />
                <span>All guests assigned!</span>
              </>
            ) : (
              <span>No matching guests</span>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <GuestCard
              key={booking.id}
              guest={booking}
              roomId={null}
            />
          ))
        )}
      </div>

      {/* Drop hint */}
      {bookings.length > 0 && (
        <div className="p-2 border-t text-xs text-muted-foreground text-center">
          Drag guests here to unassign
        </div>
      )}
    </div>
  )
}
