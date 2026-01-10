'use client'

import { useDroppable } from '@dnd-kit/core'
import { BedDouble, Euro, Check, MoreVertical, Edit, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { GuestCard } from './guest-card'
import { QuickAssignPopover } from './quick-assign-popover'
import type { RoomWithGuests, UnassignedBooking } from '@/lib/types/database'

interface RoomColumnProps {
  room: RoomWithGuests
  unassignedBookings: UnassignedBooking[]
  onAssignGuest: (bookingId: string, roomId: string) => Promise<void>
  onEditRoom?: () => void
  onDeleteRoom?: () => void
}

export function RoomColumn({
  room,
  unassignedBookings,
  onAssignGuest,
  onEditRoom,
  onDeleteRoom,
}: RoomColumnProps) {
  const { isOver, setNodeRef } = useDroppable({
    id: `room-${room.id}`,
    data: {
      type: 'room',
      roomId: room.id,
      room,
    },
  })

  const occupancyPercent = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0
  const isFull = room.occupied >= room.capacity
  const hasSpace = room.available > 0
  const canDelete = room.guests.length === 0

  const getOccupancyColor = () => {
    if (isFull) return 'bg-green-500'
    if (occupancyPercent >= 80) return 'bg-red-500'
    if (occupancyPercent >= 50) return 'bg-amber-500'
    return 'bg-green-500'
  }

  const handleAssign = async (bookingId: string) => {
    await onAssignGuest(bookingId, room.id)
  }

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col w-72 shrink-0 rounded-lg border bg-card
        ${isOver && hasSpace ? 'ring-2 ring-primary border-primary bg-primary/5' : ''}
        ${isOver && !hasSpace ? 'ring-2 ring-destructive border-destructive' : ''}
        ${isFull ? 'border-green-300 bg-green-50/30' : ''}
        transition-all duration-150
      `}
    >
      {/* Header */}
      <div className="p-3 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <BedDouble className="w-4 h-4 shrink-0 text-muted-foreground" />
            <h3 className="font-semibold text-sm truncate">{room.name}</h3>
            {room.is_published === false && (
              <Badge variant="outline" className="text-xs shrink-0 text-amber-600 border-amber-300">
                Draft
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Badge
              variant={isFull ? 'default' : 'secondary'}
              className={`${isFull ? 'bg-green-600' : ''} shrink-0`}
            >
              {isFull && <Check className="w-3 h-3 mr-1" />}
              {room.occupied}/{room.capacity}
            </Badge>
            {(onEditRoom || onDeleteRoom) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <MoreVertical className="w-3.5 h-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {onEditRoom && (
                    <DropdownMenuItem onClick={onEditRoom}>
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Room
                    </DropdownMenuItem>
                  )}
                  {onDeleteRoom && (
                    <>
                      {onEditRoom && <DropdownMenuSeparator />}
                      <DropdownMenuItem
                        onClick={onDeleteRoom}
                        className="text-destructive focus:text-destructive"
                        disabled={!canDelete}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {canDelete ? 'Delete Room' : 'Has guests'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        <Progress
          value={occupancyPercent}
          className={`h-1.5 [&>div]:${getOccupancyColor()}`}
        />

        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          {room.description && (
            <span className="truncate mr-2">{room.description}</span>
          )}
          <span className="flex items-center gap-0.5 ml-auto shrink-0">
            <Euro className="w-3 h-3" />
            {room.price}
          </span>
        </div>
      </div>

      {/* Guest list */}
      <div className="flex-1 p-2 space-y-2 min-h-[100px] overflow-y-auto">
        {room.guests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            <span className="text-center py-4">Drop guests here</span>
          </div>
        ) : (
          room.guests.map((guest) => (
            <GuestCard
              key={guest.booking_id}
              guest={guest}
              roomId={room.id}
            />
          ))
        )}
      </div>

      {/* Quick assign button */}
      {hasSpace && (
        <div className="p-2 border-t">
          <QuickAssignPopover
            roomId={room.id}
            roomName={room.name}
            unassignedBookings={unassignedBookings}
            availableSpots={room.available}
            onAssign={handleAssign}
          />
        </div>
      )}

      {/* Full indicator */}
      {isFull && (
        <div className="p-2 border-t bg-green-50 text-green-700 text-xs text-center font-medium">
          Room Full
        </div>
      )}
    </div>
  )
}
