'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { getPaymentStatusConfig } from '@/lib/utils/payment-status'
import type { RoomGuest, UnassignedBooking, PaymentStatus } from '@/lib/types/database'

interface GuestCardProps {
  guest: RoomGuest | UnassignedBooking
  roomId: string | null // null for unassigned
  isDragOverlay?: boolean
}

// Type guard to check if it's a RoomGuest
function isRoomGuest(guest: RoomGuest | UnassignedBooking): guest is RoomGuest {
  return 'booking_id' in guest
}

export function GuestCard({ guest, roomId, isDragOverlay = false }: GuestCardProps) {
  const bookingId = isRoomGuest(guest) ? guest.booking_id : guest.id
  const dragId = `guest-${bookingId}-${roomId || 'unassigned'}`

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: dragId,
    data: {
      type: 'guest',
      bookingId,
      roomId,
      guest,
    },
  })

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined

  const paymentConfig = getPaymentStatusConfig(guest.payment_status as PaymentStatus)
  const fullName = `${guest.first_name} ${guest.last_name}`

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        group flex items-center gap-2 p-2 rounded-md border bg-card
        ${isDragging && !isDragOverlay ? 'opacity-50' : ''}
        ${isDragOverlay ? 'shadow-lg ring-2 ring-primary' : 'hover:shadow-sm'}
        transition-all duration-150
      `}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="touch-none p-1 -ml-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
        aria-label="Drag to move guest"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Guest info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{fullName}</span>
          {guest.guests_count > 1 && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs">
              <Users className="w-3 h-3 mr-1" />
              {guest.guests_count}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
      </div>

      {/* Payment status */}
      <Badge
        variant="outline"
        className={`h-5 text-xs shrink-0 ${paymentConfig.className}`}
      >
        {paymentConfig.label}
      </Badge>
    </div>
  )
}

// Static version for DragOverlay
export function GuestCardOverlay({ guest }: { guest: RoomGuest | UnassignedBooking }) {
  const paymentConfig = getPaymentStatusConfig(guest.payment_status as PaymentStatus)
  const fullName = `${guest.first_name} ${guest.last_name}`

  return (
    <div className="flex items-center gap-2 p-2 rounded-md border bg-card shadow-lg ring-2 ring-primary">
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">{fullName}</span>
          {guest.guests_count > 1 && (
            <Badge variant="outline" className="h-5 px-1.5 text-xs">
              <Users className="w-3 h-3 mr-1" />
              {guest.guests_count}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{guest.email}</p>
      </div>
      <Badge
        variant="outline"
        className={`h-5 text-xs shrink-0 ${paymentConfig.className}`}
      >
        {paymentConfig.label}
      </Badge>
    </div>
  )
}
