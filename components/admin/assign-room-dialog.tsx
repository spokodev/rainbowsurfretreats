'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { BedDouble, Users, Loader2, Check } from 'lucide-react'
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

interface AssignRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  bookingId: string
  guestName: string
  rooms: RoomWithGuests[]
  onSuccess: () => void
}

export function AssignRoomDialog({
  open,
  onOpenChange,
  bookingId,
  guestName,
  rooms,
  onSuccess,
}: AssignRoomDialogProps) {
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleAssign = async () => {
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
        toast.error(result.error || 'Failed to assign room')
        return
      }

      const selectedRoom = rooms.find(r => r.id === selectedRoomId)
      toast.success(`${guestName} assigned to ${selectedRoom?.name || 'room'}`)
      setSelectedRoomId(null)
      onSuccess()
    } catch {
      toast.error('Failed to assign room')
    } finally {
      setLoading(false)
    }
  }

  const availableRooms = rooms.filter((room) => room.available > 0)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="w-5 h-5" />
            Assign Room
          </DialogTitle>
          <DialogDescription>
            Select a room to assign <strong>{guestName}</strong> to.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[50vh] md:max-h-[400px] overflow-y-auto">
          {availableRooms.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <BedDouble className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No rooms with available space</p>
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
            onClick={handleAssign}
            disabled={!selectedRoomId || loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              'Assign Room'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default AssignRoomDialog
