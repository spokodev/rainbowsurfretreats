'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2, CheckCircle, Clock, AlertCircle, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { waitlistJoinSchema, type WaitlistJoinRequest } from '@/lib/validations/booking'

interface WaitlistFormProps {
  retreatId: string
  roomId?: string
  retreatName: string
  roomName?: string
}

interface WaitlistResponse {
  position: number
  status?: string
}

export function WaitlistForm({ retreatId, roomId, retreatName, roomName }: WaitlistFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<WaitlistResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WaitlistJoinRequest>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(waitlistJoinSchema) as any,
    defaultValues: {
      retreatId,
      roomId: roomId || undefined,
      guestsCount: 1,
    },
  })

  const onSubmit = async (data: WaitlistJoinRequest) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to join waitlist')
      }

      setSuccess(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-green-800 mb-2">
          You&apos;re on the Waitlist!
        </h3>
        <p className="text-green-700 mb-4">
          Your position: <span className="font-bold text-2xl">#{success.position}</span>
        </p>
        <div className="bg-white rounded-lg p-4 max-w-md mx-auto">
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-2">
            <Clock className="w-5 h-5" />
            <span className="font-medium">What happens next?</span>
          </div>
          <p className="text-sm text-gray-600">
            If a spot opens up, we&apos;ll email you immediately. You&apos;ll have 72 hours to confirm and complete your booking.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-3">
          <Users className="w-6 h-6 text-amber-600" />
        </div>
        <h3 className="text-xl font-bold text-amber-900 mb-1">
          This {roomName ? 'Room' : 'Retreat'} is Fully Booked
        </h3>
        <p className="text-amber-700">
          Join our waitlist and we&apos;ll notify you if a spot opens up!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Hidden fields */}
        <input type="hidden" {...register('retreatId')} />
        {roomId && <input type="hidden" {...register('roomId')} />}

        {/* Name fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="firstName" className="text-amber-900">
              First Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="firstName"
              {...register('firstName')}
              placeholder="John"
              className="mt-1 bg-white border-amber-300 focus:border-amber-500"
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="lastName" className="text-amber-900">
              Last Name <span className="text-red-500">*</span>
            </Label>
            <Input
              id="lastName"
              {...register('lastName')}
              placeholder="Doe"
              className="mt-1 bg-white border-amber-300 focus:border-amber-500"
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-amber-900">
            Email Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="john@example.com"
            className="mt-1 bg-white border-amber-300 focus:border-amber-500"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-amber-900">
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            {...register('phone')}
            placeholder="+1 234 567 8900"
            className="mt-1 bg-white border-amber-300 focus:border-amber-500"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        {/* Guests count */}
        <div>
          <Label htmlFor="guestsCount" className="text-amber-900">
            Number of Guests
          </Label>
          <Input
            id="guestsCount"
            type="number"
            min={1}
            max={10}
            {...register('guestsCount', { valueAsNumber: true })}
            className="mt-1 bg-white border-amber-300 focus:border-amber-500 w-24"
          />
          {errors.guestsCount && (
            <p className="text-sm text-red-600 mt-1">{errors.guestsCount.message}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <Label htmlFor="notes" className="text-amber-900">
            Notes (optional)
          </Label>
          <Textarea
            id="notes"
            {...register('notes')}
            placeholder="Any special requests or preferences..."
            rows={3}
            className="mt-1 bg-white border-amber-300 focus:border-amber-500"
          />
          {errors.notes && (
            <p className="text-sm text-red-600 mt-1">{errors.notes.message}</p>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Submit button */}
        <Button
          type="submit"
          className="w-full bg-amber-600 hover:bg-amber-700 text-white py-3"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Joining Waitlist...
            </>
          ) : (
            'Join Waitlist'
          )}
        </Button>

        <p className="text-xs text-center text-amber-700">
          You&apos;ll receive an email confirmation. No payment required now.
        </p>
      </form>
    </div>
  )
}

export default WaitlistForm
