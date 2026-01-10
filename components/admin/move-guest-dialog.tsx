'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ArrowRightLeft, BedDouble, Users, Loader2, Check, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import type { RoomWithGuests } from '@/lib/types/database'

interface MoveGuestDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  guestName: string
  currentRoomId?: string
  currentRoomName?: string
  rooms: RoomWithGuests[]
  onSuccess: () => void
}

export function MoveGuestDialog({
  open,
  onOpenChange,
  bookingId,
  guestName,
  currentRoomId,
  currentRoomName,
  rooms,
  onSuccess,
}: MoveGuestDialogProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleMove = async () => {
    if (!selectedRoomId) return

    setLoading(true)
    try {
      const response = await fetch(`/api/admin/bookings/${bookingId}/room`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ room_id: selectedRoomId }),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to move guest')
        return
      }

      const targetRoom = rooms.find(r => r.id === selectedRoomId)
      toast.success(`${guestName} moved to ${targetRoom?.name || 'new room'}`)
      setSelectedRoomId(null)
      onSuccess()
    } catch {
      toast.error('Failed to move guest')
    } finally {
      setLoading(false)
    }
  }

  // Filter out current room and rooms without space
  const availableRooms = rooms.filter(
    (room) => room.id !== currentRoomId && room.available > 0
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5" />
            Move Guest
          </DialogTitle>
          <DialogDescription>
            Move <strong>{guestName}</strong> from <strong>{currentRoomName}</strong> to a different room.
          </DialogDescription>
        </DialogHeader>

        {/* Current Room Indicator */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">Current Room</div>
            <div className="font-medium flex items-center gap-2">
              <BedDouble className="w-4 h-4" />
              {currentRoomName}
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground" />
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">New Room</div>
            <div className="font-medium flex items-center gap-2">
              {selectedRoomId ? (
                <>
                  <BedDouble className="w-4 h-4" />
                  {rooms.find((r) => r.id === selectedRoomId)?.name}
                </>
              ) : (
                <span className="text-muted-foreground">Select below</span>
              )}
            </div>
          </div>
        </div>

        <div className="py-2 space-y-3 max-h-[50vh] md:max-h-[350px] overflow-y-auto">
          {availableRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BedDouble className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No other rooms with available space</p>
            </div>
          ) : (
            availableRooms.map((room) => {
              const occupancyPercent = room.capacity > 0 ? (room.occupied / room.capacity) * 100 : 0
              const isSelected = selectedRoomId === room.id

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <BedDouble className="w-4 h-4" />
                      <span className="font-medium">{room.name}</span>
                      {isSelected && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <Badge variant="secondary">
                      <Users className="w-3 h-3 mr-1" />
                      {room.occupied}/{room.capacity}
                    </Badge>
                  </div>
                  <Progress value={occupancyPercent} className="h-1.5 mb-2" />
                  <div className="text-sm text-muted-foreground">
                    {room.available} spot{room.available > 1 ? 's' : ''} available
                  </div>
                  {room.description && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {room.description}
                    </div>
                  )}
                </button>
              )
            })
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleMove}
            disabled={!selectedRoomId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Moving...
              </>
            ) : (
              <>
                <ArrowRightLeft className="w-4 h-4 mr-2" />
                Move Guest
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default MoveGuestDialog
