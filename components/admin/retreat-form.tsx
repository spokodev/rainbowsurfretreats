'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Save, Loader2, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from 'sonner'
import ImageUpload from './image-upload'
import type { Retreat, RetreatRoom, RetreatLevel, RetreatType } from '@/lib/types/database'

// Validation schema
const roomSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  price: z.coerce.number().min(0, 'Price must be positive'),
  deposit_price: z.coerce.number().min(0, 'Deposit must be positive'),
  capacity: z.coerce.number().min(1, 'Capacity must be at least 1'),
  available: z.coerce.number().min(0, 'Available must be 0 or more'),
  is_sold_out: z.boolean().default(false),
})

const aboutSectionSchema = z.object({
  title: z.string().optional(),
  paragraphs: z.array(z.string()),
})

const retreatSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  location: z.string().min(1, 'Location is required'),
  image_url: z.string().nullable().optional(),
  level: z.enum(['Beginners', 'Intermediate', 'Advanced', 'All Levels']),
  duration: z.string().min(1, 'Duration is required'),
  participants: z.string().min(1, 'Participants info is required'),
  food: z.string().min(1, 'Food info is required'),
  type: z.enum(['Budget', 'Standard', 'Premium']),
  gear: z.string().min(1, 'Gear info is required'),
  price: z.coerce.number().min(0, 'Price must be positive'),
  early_bird_price: z.coerce.number().nullable().optional(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().nullable().optional(),
  intro_text: z.string().nullable().optional(),
  check_in_time: z.string().nullable().optional(),
  check_out_time: z.string().nullable().optional(),
  exact_address: z.string().nullable().optional(),
  address_note: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  highlights: z.array(z.string()),
  included: z.array(z.string()),
  not_included: z.array(z.string()),
  about_sections: z.array(aboutSectionSchema),
  important_info: z.object({
    paymentTerms: z.string().optional(),
    cancellationPolicy: z.string().optional(),
    travelInsurance: z.string().optional(),
    whatToBring: z.string().optional(),
  }),
  is_published: z.boolean().default(false),
  rooms: z.array(roomSchema),
})

type RetreatFormData = z.infer<typeof retreatSchema>

interface RetreatFormProps {
  retreat?: Retreat & { rooms?: RetreatRoom[] }
  isEdit?: boolean
}

const levelOptions: RetreatLevel[] = ['Beginners', 'Intermediate', 'Advanced', 'All Levels']
const typeOptions: RetreatType[] = ['Budget', 'Standard', 'Premium']

export function RetreatForm({ retreat, isEdit = false }: RetreatFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: RetreatFormData = {
    destination: retreat?.destination || '',
    location: retreat?.location || '',
    image_url: retreat?.image_url || null,
    level: retreat?.level || 'All Levels',
    duration: retreat?.duration || '7 nights',
    participants: retreat?.participants || '10-16',
    food: retreat?.food || 'Breakfast & Dinner',
    type: retreat?.type || 'Standard',
    gear: retreat?.gear || 'Included',
    price: retreat?.price || 0,
    early_bird_price: retreat?.early_bird_price || null,
    start_date: retreat?.start_date || '',
    end_date: retreat?.end_date || '',
    description: retreat?.description || null,
    intro_text: retreat?.intro_text || null,
    check_in_time: retreat?.check_in_time || '14:00',
    check_out_time: retreat?.check_out_time || '10:00',
    exact_address: retreat?.exact_address || null,
    address_note: retreat?.address_note || null,
    pricing_note: retreat?.pricing_note || null,
    highlights: retreat?.highlights || [''],
    included: retreat?.included || [''],
    not_included: retreat?.not_included || [''],
    about_sections: retreat?.about_sections || [{ title: '', paragraphs: [''] }],
    important_info: retreat?.important_info || {
      paymentTerms: '',
      cancellationPolicy: '',
      travelInsurance: '',
      whatToBring: '',
    },
    is_published: retreat?.is_published || false,
    rooms: retreat?.rooms?.map(room => ({
      id: room.id,
      name: room.name,
      description: room.description || '',
      price: room.price,
      deposit_price: room.deposit_price,
      capacity: room.capacity,
      available: room.available,
      is_sold_out: room.is_sold_out,
    })) || [],
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(retreatSchema),
    defaultValues,
  })

  // Field arrays for dynamic lists
  const { fields: highlightFields, append: appendHighlight, remove: removeHighlight } = useFieldArray({
    control,
    name: 'highlights' as never,
  })

  const { fields: includedFields, append: appendIncluded, remove: removeIncluded } = useFieldArray({
    control,
    name: 'included' as never,
  })

  const { fields: notIncludedFields, append: appendNotIncluded, remove: removeNotIncluded } = useFieldArray({
    control,
    name: 'not_included' as never,
  })

  const { fields: aboutFields, append: appendAbout, remove: removeAbout } = useFieldArray({
    control,
    name: 'about_sections',
  })

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control,
    name: 'rooms',
  })

  const onSubmit = useCallback(async (data: RetreatFormData) => {
    setIsSubmitting(true)

    try {
      // Filter out empty strings from arrays
      const cleanedData = {
        ...data,
        highlights: data.highlights.filter(h => h.trim() !== ''),
        included: data.included.filter(i => i.trim() !== ''),
        not_included: data.not_included.filter(n => n.trim() !== ''),
        about_sections: data.about_sections.filter(s =>
          s.paragraphs.some(p => p.trim() !== '')
        ).map(s => ({
          ...s,
          paragraphs: s.paragraphs.filter(p => p.trim() !== ''),
        })),
      }

      const url = isEdit ? `/api/retreats/${retreat?.id}` : '/api/retreats'
      const method = isEdit ? 'PUT' : 'POST'

      // First, save the retreat
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanedData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to save retreat')
      }

      const retreatId = result.data.id

      // Handle rooms
      if (data.rooms.length > 0) {
        for (const room of data.rooms) {
          if (room.id) {
            // Update existing room
            await fetch(`/api/retreats/${retreatId}/rooms/${room.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(room),
            })
          } else {
            // Create new room
            await fetch(`/api/retreats/${retreatId}/rooms`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(room),
            })
          }
        }
      }

      toast.success(isEdit ? 'Retreat updated successfully' : 'Retreat created successfully')
      router.push('/admin/retreats')
      router.refresh()
    } catch (error) {
      console.error('Submit error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to save retreat')
    } finally {
      setIsSubmitting(false)
    }
  }, [isEdit, retreat?.id, router])

  const watchedImageUrl = watch('image_url')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="destination">Destination *</Label>
              <Input
                id="destination"
                {...register('destination')}
                placeholder="e.g., Bali, Indonesia"
              />
              {errors.destination && (
                <p className="text-sm text-red-500">{errors.destination.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Location *</Label>
              <Input
                id="location"
                {...register('location')}
                placeholder="e.g., Canggu"
              />
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cover Image</Label>
            <ImageUpload
              value={watchedImageUrl || undefined}
              onChange={(url) => setValue('image_url', url)}
              bucket="retreat-images"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Brief description of the retreat..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intro_text">Intro Text</Label>
            <Textarea
              id="intro_text"
              {...register('intro_text')}
              placeholder="Introductory text shown on the retreat page..."
              rows={4}
            />
          </div>
        </CardContent>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader>
          <CardTitle>Retreat Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Level *</Label>
              <Controller
                name="level"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {levelOptions.map(level => (
                        <SelectItem key={level} value={level}>{level}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Type *</Label>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {typeOptions.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration *</Label>
              <Input
                id="duration"
                {...register('duration')}
                placeholder="e.g., 7 nights"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Participants *</Label>
              <Input
                id="participants"
                {...register('participants')}
                placeholder="e.g., 10-16"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="food">Food *</Label>
              <Input
                id="food"
                {...register('food')}
                placeholder="e.g., Breakfast & Dinner"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gear">Gear *</Label>
              <Input
                id="gear"
                {...register('gear')}
                placeholder="e.g., Included"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dates & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle>Dates & Pricing</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date *</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-red-500">{errors.start_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date *</Label>
              <Input
                id="end_date"
                type="date"
                {...register('end_date')}
              />
              {errors.end_date && (
                <p className="text-sm text-red-500">{errors.end_date.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_in_time">Check-in Time</Label>
              <Input
                id="check_in_time"
                type="time"
                {...register('check_in_time')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="check_out_time">Check-out Time</Label>
              <Input
                id="check_out_time"
                type="time"
                {...register('check_out_time')}
              />
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Base Price (EUR) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price')}
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="early_bird_price">Early Bird Price (EUR)</Label>
              <Input
                id="early_bird_price"
                type="number"
                step="0.01"
                {...register('early_bird_price')}
              />
            </div>

            <div className="space-y-2 md:col-span-1">
              <Label htmlFor="pricing_note">Pricing Note</Label>
              <Input
                id="pricing_note"
                {...register('pricing_note')}
                placeholder="e.g., per person, shared room"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Location Details */}
      <Card>
        <CardHeader>
          <CardTitle>Location Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="exact_address">Exact Address</Label>
            <Input
              id="exact_address"
              {...register('exact_address')}
              placeholder="Full address of the retreat venue"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address_note">Address Note</Label>
            <Textarea
              id="address_note"
              {...register('address_note')}
              placeholder="Additional directions or notes about the location..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Dynamic Lists */}
      <Card>
        <CardHeader>
          <CardTitle>Highlights & Inclusions</CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full" defaultValue={['highlights', 'included', 'not-included']}>
            {/* Highlights */}
            <AccordionItem value="highlights">
              <AccordionTrigger>
                Highlights ({highlightFields.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {highlightFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Input
                      {...register(`highlights.${index}` as const)}
                      placeholder="e.g., Daily surf lessons"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeHighlight(index)}
                      disabled={highlightFields.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendHighlight('')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Highlight
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Included */}
            <AccordionItem value="included">
              <AccordionTrigger>
                What's Included ({includedFields.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {includedFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Input
                      {...register(`included.${index}` as const)}
                      placeholder="e.g., 7 nights accommodation"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeIncluded(index)}
                      disabled={includedFields.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendIncluded('')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </AccordionContent>
            </AccordionItem>

            {/* Not Included */}
            <AccordionItem value="not-included">
              <AccordionTrigger>
                Not Included ({notIncludedFields.length})
              </AccordionTrigger>
              <AccordionContent className="space-y-2 pt-2">
                {notIncludedFields.map((field, index) => (
                  <div key={field.id} className="flex gap-2 items-center">
                    <GripVertical className="w-4 h-4 text-gray-400" />
                    <Input
                      {...register(`not_included.${index}` as const)}
                      placeholder="e.g., Flights"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeNotIncluded(index)}
                      disabled={notIncludedFields.length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendNotIncluded('')}
                  className="mt-2"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Item
                </Button>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* About Sections */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>About Sections</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendAbout({ title: '', paragraphs: [''] })}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Section
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {aboutFields.map((field, sectionIndex) => (
            <div key={field.id} className="border rounded-lg p-4 space-y-3">
              <div className="flex gap-2 items-start">
                <div className="flex-1 space-y-2">
                  <Label>Section Title (optional)</Label>
                  <Input
                    {...register(`about_sections.${sectionIndex}.title`)}
                    placeholder="e.g., The Experience"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAbout(sectionIndex)}
                  disabled={aboutFields.length === 1}
                  className="mt-6"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label>Paragraphs</Label>
                <Controller
                  name={`about_sections.${sectionIndex}.paragraphs`}
                  control={control}
                  render={({ field: paragraphsField }) => (
                    <div className="space-y-2">
                      {(paragraphsField.value || ['']).map((_, pIndex) => (
                        <div key={pIndex} className="flex gap-2">
                          <Textarea
                            value={paragraphsField.value?.[pIndex] || ''}
                            onChange={(e) => {
                              const newParagraphs = [...(paragraphsField.value || [])]
                              newParagraphs[pIndex] = e.target.value
                              paragraphsField.onChange(newParagraphs)
                            }}
                            placeholder="Paragraph content..."
                            rows={2}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newParagraphs = paragraphsField.value.filter((_, i) => i !== pIndex)
                              paragraphsField.onChange(newParagraphs.length ? newParagraphs : [''])
                            }}
                            disabled={(paragraphsField.value?.length || 0) <= 1}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          paragraphsField.onChange([...(paragraphsField.value || []), ''])
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add Paragraph
                      </Button>
                    </div>
                  )}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Important Info */}
      <Card>
        <CardHeader>
          <CardTitle>Important Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms</Label>
            <Textarea
              id="paymentTerms"
              {...register('important_info.paymentTerms')}
              placeholder="Payment terms and conditions..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cancellationPolicy">Cancellation Policy</Label>
            <Textarea
              id="cancellationPolicy"
              {...register('important_info.cancellationPolicy')}
              placeholder="Cancellation policy details..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="travelInsurance">Travel Insurance</Label>
            <Textarea
              id="travelInsurance"
              {...register('important_info.travelInsurance')}
              placeholder="Travel insurance information..."
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="whatToBring">What to Bring</Label>
            <Textarea
              id="whatToBring"
              {...register('important_info.whatToBring')}
              placeholder="List of items guests should bring..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rooms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Room Options ({roomFields.length})</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => appendRoom({
                name: '',
                description: '',
                price: 0,
                deposit_price: 0,
                capacity: 2,
                available: 0,
                is_sold_out: false,
              })}
            >
              <Plus className="w-4 h-4 mr-1" /> Add Room
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {roomFields.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No rooms added yet. Add rooms to offer different accommodation options.
            </p>
          ) : (
            roomFields.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Room {index + 1}</h4>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRoom(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500 mr-1" />
                    Remove
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Room Name *</Label>
                    <Input
                      {...register(`rooms.${index}.name`)}
                      placeholder="e.g., Shared Dorm"
                    />
                    {errors.rooms?.[index]?.name && (
                      <p className="text-sm text-red-500">{errors.rooms[index]?.name?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      {...register(`rooms.${index}.description`)}
                      placeholder="Brief room description"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Price (EUR) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`rooms.${index}.price`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Deposit (EUR) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`rooms.${index}.deposit_price`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Capacity</Label>
                    <Input
                      type="number"
                      {...register(`rooms.${index}.capacity`)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Available</Label>
                    <Input
                      type="number"
                      {...register(`rooms.${index}.available`)}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Controller
                    name={`rooms.${index}.is_sold_out`}
                    control={control}
                    render={({ field }) => (
                      <Switch
                        id={`room-sold-out-${index}`}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    )}
                  />
                  <Label htmlFor={`room-sold-out-${index}`}>Mark as Sold Out</Label>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Publishing */}
      <Card>
        <CardHeader>
          <CardTitle>Publishing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Controller
              name="is_published"
              control={control}
              render={({ field }) => (
                <Switch
                  id="is_published"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
            <Label htmlFor="is_published">Publish retreat (visible on website)</Label>
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              {isEdit ? 'Update Retreat' : 'Create Retreat'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

export default RetreatForm
