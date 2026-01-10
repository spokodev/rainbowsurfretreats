'use client'

import { useState } from 'react'
import { UserPlus, Users, Mail, Check } from 'lucide-react'
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
import { getPaymentStatusConfig } from '@/lib/utils/payment-status'
import type { UnassignedBooking, PaymentStatus } from '@/lib/types/database'

interface SelectBookingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roomName: string
  unassignedBookings: UnassignedBooking[]
  onSelect: (booking: UnassignedBooking) => void
}

export function SelectBookingDialog({
  open,
  onOpenChange,
  roomName,
  unassignedBookings,
  onSelect,
}: SelectBookingDialogProps) {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)

  const handleSelect = () => {
    const booking = unassignedBookings.find(b => b.id === selectedBookingId)
    if (booking) {
      onSelect(booking)
      setSelectedBookingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Select Guest to Assign
          </DialogTitle>
          <DialogDescription>
            Choose a guest to assign to <strong>{roomName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3 max-h-[50vh] md:max-h-[400px] overflow-y-auto">
          {unassignedBookings.map((booking) => {
            const isSelected = selectedBookingId === booking.id

            return (
              <button
                key={booking.id}
                type="button"
                onClick={() => setSelectedBookingId(booking.id)}
                className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {booking.first_name} {booking.last_name}
                    </span>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  {(() => {
                    const paymentConfig = getPaymentStatusConfig(booking.payment_status)
                    const PaymentIcon = paymentConfig.icon
                    return (
                      <Badge variant="outline" className={paymentConfig.className}>
                        <PaymentIcon className="w-3 h-3 mr-1" />
                        {paymentConfig.label}
                      </Badge>
                    )
                  })()}
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-1" title={booking.email}>
                  <Mail className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{booking.email}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="outline" className="text-xs">
                    <Users className="w-3 h-3 mr-1" />
                    {booking.guests_count} guest{booking.guests_count > 1 ? 's' : ''}
                  </Badge>
                  <span className="text-xs text-muted-foreground">#{booking.booking_number}</span>
                </div>
              </button>
            )
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSelect} disabled={!selectedBookingId}>
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default SelectBookingDialog
