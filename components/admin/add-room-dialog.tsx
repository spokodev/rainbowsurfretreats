'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { BedDouble, Loader2, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const roomSchema = z.object({
  name: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  price: z.number().min(1, 'Price must be positive'),
  deposit_price: z.number().min(0, 'Deposit must be 0 or more'),
  capacity: z.number().min(1, 'Capacity must be at least 1'),
  available: z.number().min(0, 'Available must be 0 or more'),
  is_sold_out: z.boolean(),
  is_published: z.boolean(),
  early_bird_enabled: z.boolean(),
  early_bird_deadline: z.string().nullable().optional(),
})

type RoomFormData = z.infer<typeof roomSchema>

interface AddRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  retreatId: string
  retreatStartDate?: string
  onSuccess: () => void
}

export function AddRoomDialog({
  open,
  onOpenChange,
  retreatId,
  retreatStartDate,
  onSuccess,
}: AddRoomDialogProps) {
  const [loading, setLoading] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      deposit_price: 0,
      capacity: 2,
      available: 5,
      is_sold_out: false,
      is_published: true,
      early_bird_enabled: false,
      early_bird_deadline: null,
    },
  })

  const earlyBirdEnabled = watch('early_bird_enabled')

  const onSubmit = async (data: RoomFormData) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/retreats/${retreatId}/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        toast.error(result.error || 'Failed to create room')
        return
      }

      toast.success(`Room "${data.name}" created successfully`)
      reset()
      onOpenChange(false)
      onSuccess()
    } catch {
      toast.error('Failed to create room')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset()
    }
    onOpenChange(isOpen)
  }

  const handleEnableEarlyBird = (enabled: boolean) => {
    setValue('early_bird_enabled', enabled)
    if (enabled && retreatStartDate) {
      const retreatStart = new Date(retreatStartDate)
      const defaultDeadline = new Date(retreatStart)
      defaultDeadline.setMonth(defaultDeadline.getMonth() - 3)
      setValue('early_bird_deadline', defaultDeadline.toISOString().split('T')[0])
    } else if (!enabled) {
      setValue('early_bird_deadline', null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BedDouble className="w-5 h-5" />
            Add New Room
          </DialogTitle>
          <DialogDescription>
            Create a new room option for this retreat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2">
              <Label htmlFor="name">Room Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Shared Dorm"
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2 col-span-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register('description')}
                placeholder="e.g., 4-6 beds per room"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price (EUR) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-xs text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deposit_price">Deposit (EUR) *</Label>
              <Input
                id="deposit_price"
                type="number"
                step="0.01"
                {...register('deposit_price', { valueAsNumber: true })}
              />
              {errors.deposit_price && (
                <p className="text-xs text-red-500">{errors.deposit_price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity</Label>
              <Input
                id="capacity"
                type="number"
                {...register('capacity', { valueAsNumber: true })}
              />
              {errors.capacity && (
                <p className="text-xs text-red-500">{errors.capacity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="available">Available Spots</Label>
              <Input
                id="available"
                type="number"
                {...register('available', { valueAsNumber: true })}
              />
              {errors.available && (
                <p className="text-xs text-red-500">{errors.available.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center space-x-2">
              <Switch
                id="is_sold_out"
                checked={watch('is_sold_out')}
                onCheckedChange={(checked) => setValue('is_sold_out', checked)}
              />
              <Label htmlFor="is_sold_out" className="text-sm">Mark as Sold Out</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_published"
                checked={watch('is_published')}
                onCheckedChange={(checked) => setValue('is_published', checked)}
              />
              <Label htmlFor="is_published" className="text-sm">Published</Label>
            </div>
          </div>

          {/* Early Bird Section */}
          <div className="bg-green-50 rounded-lg p-3 space-y-3">
            <div className="flex items-center gap-3">
              <Switch
                id="early_bird_enabled"
                checked={earlyBirdEnabled}
                onCheckedChange={handleEnableEarlyBird}
              />
              <div className="flex-1">
                <Label htmlFor="early_bird_enabled" className="text-sm font-medium text-green-800">
                  Enable Early Bird (10% discount)
                </Label>
                <p className="text-xs text-green-600">
                  Guests booking before the deadline get 10% off
                </p>
              </div>
            </div>

            {earlyBirdEnabled && (
              <div className="pt-3 border-t border-green-200">
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <Label htmlFor="early_bird_deadline" className="text-sm font-medium text-green-700">
                      Early Bird Deadline
                    </Label>
                    <Input
                      id="early_bird_deadline"
                      type="date"
                      {...register('early_bird_deadline')}
                      className="w-full mt-1 bg-white"
                    />
                    <p className="text-xs text-green-600 mt-1">
                      Default: 3 months before retreat
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Room'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default AddRoomDialog
