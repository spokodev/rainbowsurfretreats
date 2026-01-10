'use client'

import { BedDouble, Users, UserPlus, ArrowRightLeft, UserMinus, Mail, Phone, Trash2, Edit, Euro } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { MoreVertical } from 'lucide-react'
import { getPaymentStatusConfig } from '@/lib/utils/payment-status'
import type { RoomWithGuests, RoomGuest, PaymentStatus } from '@/lib/types/database'

interface RoomOccupancyCardProps {
  room: RoomWithGuests
  onMoveGuest: (bookingId: string, guestName: string) => void
  onRemoveGuest: (bookingId: string, guestName: string) => void
  onAssignGuest: () => void
  onEditRoom?: () => void
  onDeleteRoom?: () => void
  hasUnassigned: boolean
}

export function RoomOccupancyCard({
  room,
  onMoveGuest,
  onRemoveGuest,
  onAssignGuest,
  onEditRoom,
  onDeleteRoom,
  hasUnassigned,
}: RoomOccupancyCardProps) {
  const occupancyPercent = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0
  const isFull = room.occupied >= room.capacity
  const hasSpace = room.available > 0
  const canDelete = room.guests.length === 0

  return (
    <Card className={`${isFull ? 'border-green-300 bg-green-50/30' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <BedDouble className="w-5 h-5" />
            {room.name}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              variant={isFull ? 'default' : 'secondary'}
              className={isFull ? 'bg-green-600' : ''}
            >
              {room.occupied}/{room.capacity}
            </Badge>
            {(onEditRoom || onDeleteRoom) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="w-4 h-4" />
                    <span className="sr-only">Room options</span>
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
                        {canDelete ? 'Delete Room' : 'Has guests - cannot delete'}
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
        <Progress value={occupancyPercent} className="h-2 mt-2" />
        <div className="flex items-center justify-between mt-1">
          {room.description && (
            <p className="text-sm text-muted-foreground">{room.description}</p>
          )}
          <p className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
            <Euro className="w-3 h-3" />
            {room.price}
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {/* Guest List */}
        {room.guests.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No guests assigned</p>
          </div>
        ) : (
          <div className="space-y-3">
            {room.guests.map((guest) => (
              <GuestItem
                key={guest.booking_id}
                guest={guest}
                onMove={() => onMoveGuest(guest.booking_id, `${guest.first_name} ${guest.last_name}`)}
                onRemove={() => onRemoveGuest(guest.booking_id, `${guest.first_name} ${guest.last_name}`)}
              />
            ))}
          </div>
        )}

        {/* Assign Guest Button */}
        {hasSpace && hasUnassigned && (
          <Button
            variant="outline"
            className="w-full mt-4 border-dashed"
            onClick={onAssignGuest}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Assign Guest
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

interface GuestItemProps {
  guest: RoomGuest
  onMove: () => void
  onRemove: () => void
}

function GuestItem({ guest, onMove, onRemove }: GuestItemProps) {
  const paymentConfig = getPaymentStatusConfig(guest.payment_status)
  const PaymentIcon = paymentConfig.icon

  return (
    <div className="p-3 bg-white rounded-lg border shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="font-medium flex items-center gap-2">
            {guest.first_name} {guest.last_name}
            {guest.guests_count > 1 && (
              <Badge variant="outline" className="text-xs">
                +{guest.guests_count - 1} guest{guest.guests_count > 2 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div
            className="text-sm text-muted-foreground truncate flex items-center gap-1 mt-0.5"
            title={guest.email}
          >
            <Mail className="w-3 h-3 flex-shrink-0" />
            {guest.email}
          </div>
          {guest.phone && (
            <div
              className="text-sm text-muted-foreground truncate flex items-center gap-1"
              title={guest.phone}
            >
              <Phone className="w-3 h-3 flex-shrink-0" />
              {guest.phone}
            </div>
          )}
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className={paymentConfig.className}>
              <PaymentIcon className="w-3 h-3 mr-1" />
              {paymentConfig.label}
            </Badge>
            <span className="text-xs text-muted-foreground">#{guest.booking_number}</span>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2"
            onClick={onMove}
            title="Move to another room"
            aria-label={`Move ${guest.first_name} ${guest.last_name} to another room`}
          >
            <ArrowRightLeft className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 px-2 text-destructive hover:text-destructive"
            onClick={onRemove}
            title="Remove from room"
            aria-label={`Remove ${guest.first_name} ${guest.last_name} from room`}
          >
            <UserMinus className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default RoomOccupancyCard
