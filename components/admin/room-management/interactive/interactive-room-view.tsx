'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core'
import { Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRoomManagement } from '../room-management-context'
import { RoomColumn } from './room-column'
import { UnassignedPool } from './unassigned-pool'
import { GuestCardOverlay } from './guest-card'
import type { RoomGuest, UnassignedBooking, RoomWithGuests } from '@/lib/types/database'

interface InteractiveRoomViewProps {
  onAddRoom: () => void
  onEditRoom: (room: RoomWithGuests) => void
  onDeleteRoom: (room: RoomWithGuests) => void
}

interface ActiveDragItem {
  bookingId: string
  roomId: string | null
  guest: RoomGuest | UnassignedBooking
}

export function InteractiveRoomView({
  onAddRoom,
  onEditRoom,
  onDeleteRoom,
}: InteractiveRoomViewProps) {
  const {
    data,
    assignGuest,
    moveGuest,
    optimisticMoveGuest,
    rollbackOptimisticUpdate,
    fetchData,
  } = useRoomManagement()

  const [activeItem, setActiveItem] = useState<ActiveDragItem | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event
    const data = active.data.current as {
      type: string
      bookingId: string
      roomId: string | null
      guest: RoomGuest | UnassignedBooking
    }

    if (data?.type === 'guest') {
      setActiveItem({
        bookingId: data.bookingId,
        roomId: data.roomId,
        guest: data.guest,
      })
    }
  }, [])

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event

    setActiveItem(null)

    if (!over) return

    const activeData = active.data.current as {
      type: string
      bookingId: string
      roomId: string | null
    }

    const overData = over.data.current as {
      type: string
      roomId: string | null
      room?: RoomWithGuests
    }

    if (!activeData || activeData.type !== 'guest') return

    const fromRoomId = activeData.roomId
    const toRoomId = overData?.roomId ?? null

    // No change
    if (fromRoomId === toRoomId) return

    // Check if target room has space
    if (toRoomId && overData?.room) {
      const targetRoom = overData.room
      const guestCount = activeItem?.guest.guests_count || 1
      if (targetRoom.available < guestCount) {
        return // Cannot drop - room is full
      }
    }

    // Apply optimistic update
    optimisticMoveGuest(activeData.bookingId, fromRoomId, toRoomId)

    // Make API call
    const success = await moveGuest(activeData.bookingId, fromRoomId, toRoomId)

    if (!success) {
      // Rollback on failure
      rollbackOptimisticUpdate()
    } else {
      // Refresh data to ensure consistency
      fetchData()
    }
  }, [activeItem, optimisticMoveGuest, moveGuest, rollbackOptimisticUpdate, fetchData])

  const handleAssignGuest = useCallback(async (bookingId: string, roomId: string) => {
    // Apply optimistic update
    optimisticMoveGuest(bookingId, null, roomId)

    // Make API call
    const success = await assignGuest(bookingId, roomId)

    if (!success) {
      rollbackOptimisticUpdate()
    } else {
      fetchData()
    }
  }, [optimisticMoveGuest, assignGuest, rollbackOptimisticUpdate, fetchData])

  if (!data) return null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {/* Unassigned pool */}
        <UnassignedPool bookings={data.unassigned} />

        {/* Room columns */}
        {data.rooms.map((room) => (
          <RoomColumn
            key={room.id}
            room={room}
            unassignedBookings={data.unassigned}
            onAssignGuest={handleAssignGuest}
            onEditRoom={() => onEditRoom(room)}
            onDeleteRoom={() => onDeleteRoom(room)}
          />
        ))}

        {/* Add room button */}
        <div className="w-72 shrink-0">
          <Button
            variant="outline"
            className="w-full h-32 border-2 border-dashed flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
            onClick={onAddRoom}
          >
            <Plus className="w-6 h-6" />
            <span>Add Room</span>
          </Button>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeItem ? (
          <div className="w-64">
            <GuestCardOverlay guest={activeItem.guest} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
