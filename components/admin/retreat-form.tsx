'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, Trash2, Save, Loader2, GripVertical, MapPin, Bed, Info, Image as ImageIcon, FileText, Calendar, AlertCircle, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
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
import { TranslateButton, TranslateMultipleButton } from './translate-button'
import type { Retreat, RetreatRoom, RetreatLevel } from '@/lib/types/database'

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
  early_bird_enabled: z.boolean().default(false), // 10% discount when enabled
  early_bird_deadline: z.string().nullable().optional(), // Date until which early bird is valid
})

const aboutSectionSchema = z.object({
  title: z.string().optional(),
  paragraphs: z.array(z.string()),
})

const retreatSchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  image_url: z.string().nullable().optional(),
  level: z.enum(['Beginners', 'Intermediate', 'Advanced', 'All Levels']),
  duration: z.string().optional(), // Auto-calculated from dates
  participants: z.string().min(1, 'Participants info is required'),
  food: z.string().min(1, 'Food info is required'),
  gear: z.string().min(1, 'Gear info is required'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  description: z.string().nullable().optional(),
  intro_text: z.string().nullable().optional(),
  exact_address: z.string().nullable().optional(),
  pricing_note: z.string().nullable().optional(),
  highlights: z.array(z.string()),
  included: z.array(z.string()),
  not_included: z.array(z.string()),
  about_sections: z.array(aboutSectionSchema),
  is_published: z.boolean().default(false),
  rooms: z.array(roomSchema),
}).refine((data) => {
  // Validate end date is after start date
  if (data.start_date && data.end_date) {
    const start = new Date(data.start_date)
    const end = new Date(data.end_date)
    return end > start
  }
  return true
}, {
  message: 'End date must be after start date',
  path: ['end_date'],
})

type RetreatFormData = z.infer<typeof retreatSchema>

interface RetreatFormProps {
  retreat?: Retreat & { rooms?: RetreatRoom[] }
  isEdit?: boolean
}

const levelOptions: RetreatLevel[] = ['Beginners', 'Intermediate', 'Advanced', 'All Levels']

export function RetreatForm({ retreat, isEdit = false }: RetreatFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues: RetreatFormData = {
    destination: retreat?.destination || '',
    image_url: retreat?.image_url || null,
    level: retreat?.level || 'All Levels',
    duration: retreat?.duration || '', // Auto-calculated
    participants: retreat?.participants || '10-16',
    food: retreat?.food || 'Breakfast & Dinner',
    gear: retreat?.gear || 'Included',
    start_date: retreat?.start_date || '',
    end_date: retreat?.end_date || '',
    description: retreat?.description || null,
    intro_text: retreat?.intro_text || null,
    exact_address: retreat?.exact_address || null,
    pricing_note: retreat?.pricing_note || null,
    highlights: retreat?.highlights?.length ? retreat.highlights : [''],
    included: retreat?.included?.length ? retreat.included : [''],
    not_included: retreat?.not_included?.length ? retreat.not_included : [''],
    about_sections: retreat?.about_sections?.length ? retreat.about_sections : [{ title: '', paragraphs: [''] }],
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
      early_bird_enabled: room.early_bird_enabled || false,
      early_bird_deadline: room.early_bird_deadline || null,
    })) || [],
  }

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    getValues,
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

  // Watch dates to auto-calculate duration
  const startDate = watch('start_date')
  const endDate = watch('end_date')

  // Calculate duration from dates
  const calculatedDuration = useMemo(() => {
    if (!startDate || !endDate) return null
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null
    const diffTime = end.getTime() - start.getTime()
    const nights = Math.round(diffTime / (1000 * 60 * 60 * 24))
    if (nights <= 0) return null
    return `${nights} ${nights === 1 ? 'night' : 'nights'}`
  }, [startDate, endDate])

  const { fields: roomFields, append: appendRoom, remove: removeRoom } = useFieldArray({
    control,
    name: 'rooms',
  })

  const watchedImageUrl = watch('image_url')
  const watchedAddress = watch('exact_address')

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

      const dataToSave = cleanedData

      const url = isEdit ? `/api/retreats/${retreat?.id}` : '/api/retreats'
      const method = isEdit ? 'PUT' : 'POST'

      // First, save the retreat
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dataToSave),
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

  // Get all form errors for summary display
  const errorMessages = Object.entries(errors).flatMap(([key, value]) => {
    if (key === 'rooms' && Array.isArray(value)) {
      return value.flatMap((roomError, index) =>
        roomError ? Object.entries(roomError).map(([field, err]) =>
          `Room ${index + 1}: ${(err as { message?: string })?.message || field}`
        ) : []
      )
    }
    return (value as { message?: string })?.message ? [`${key}: ${(value as { message?: string }).message}`] : []
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Error Summary - Show all validation errors at top */}
      {errorMessages.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div className="font-medium mb-2">Please fix the following errors:</div>
            <ul className="list-disc list-inside space-y-1">
              {errorMessages.map((msg, i) => (
                <li key={i}>{msg}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Publishing Status - Always visible at top */}
      <Card className="border-2 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
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
              <div>
                <Label htmlFor="is_published" className="text-base font-medium">
                  Publish Retreat
                </Label>
                <p className="text-sm text-muted-foreground">
                  {watch('is_published') ? 'Visible on website' : 'Hidden from website'}
                </p>
              </div>
            </div>
            <Badge variant={watch('is_published') ? 'default' : 'secondary'}>
              {watch('is_published') ? 'Published' : 'Draft'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Accordion
        type="multiple"
        defaultValue={['basic-info', 'rooms-pricing']}
        className="space-y-4"
      >
        {/* 1. Basic Information */}
        <AccordionItem value="basic-info" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <span className="font-semibold">Basic Information</span>
              <Badge variant="outline" className="ml-2">Required</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
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

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <div className="flex items-center h-10 px-3 rounded-md border bg-orange-100 text-orange-700 border-orange-200">
                  {calculatedDuration || 'Select start and end dates'}
                </div>
                <p className="text-xs text-muted-foreground">Auto-calculated from dates</p>
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
          </AccordionContent>
        </AccordionItem>

        {/* 2. Rooms & Pricing */}
        <AccordionItem value="rooms-pricing" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Bed className="w-5 h-5 text-primary" />
              <span className="font-semibold">Rooms & Pricing</span>
              <Badge variant="secondary" className="ml-2">{roomFields.length} rooms</Badge>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            {/* Rooms */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Room Options</h4>
                  <p className="text-sm text-muted-foreground">
                    Add different accommodation types with their prices
                  </p>
                </div>
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
                    available: 5,
                    is_sold_out: false,
                    early_bird_enabled: false,
                    early_bird_deadline: null,
                  })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Room
                </Button>
              </div>

              {roomFields.length === 0 ? (
                <div className="border-2 border-dashed rounded-lg p-8 text-center">
                  <Bed className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground mb-3">
                    No rooms added yet. Add rooms to offer different accommodation options.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => appendRoom({
                      name: 'Shared Room',
                      description: '4-6 beds per room',
                      price: 1200,
                      deposit_price: 120,
                      capacity: 6,
                      available: 10,
                      is_sold_out: false,
                      early_bird_enabled: false,
                      early_bird_deadline: null,
                    })}
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add First Room
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {roomFields.map((field, index) => (
                    <div key={field.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium">Room {index + 1}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRoom(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Remove
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Room Name *</Label>
                          <Input
                            {...register(`rooms.${index}.name`)}
                            placeholder="e.g., Shared Dorm"
                          />
                          {errors.rooms?.[index]?.name && (
                            <p className="text-xs text-red-500">{errors.rooms[index]?.name?.message}</p>
                          )}
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Description</Label>
                          <Input
                            {...register(`rooms.${index}.description`)}
                            placeholder="e.g., 4-6 beds per room"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="space-y-1">
                          <Label className="text-sm">Price (EUR) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`rooms.${index}.price`)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Deposit (EUR) *</Label>
                          <Input
                            type="number"
                            step="0.01"
                            {...register(`rooms.${index}.deposit_price`)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Capacity</Label>
                          <Input
                            type="number"
                            {...register(`rooms.${index}.capacity`)}
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-sm">Available Spots</Label>
                          <Input
                            type="number"
                            {...register(`rooms.${index}.available`)}
                          />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 pt-1">
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
                        <Label htmlFor={`room-sold-out-${index}`} className="text-sm">Mark as Sold Out</Label>
                      </div>

                      {/* Early Bird Section for Room */}
                      <div className="bg-green-50 rounded-lg p-3 mt-3">
                        <div className="flex items-center gap-3">
                          <Controller
                            name={`rooms.${index}.early_bird_enabled`}
                            control={control}
                            render={({ field }) => (
                              <Switch
                                id={`room-early-bird-${index}`}
                                checked={field.value}
                                onCheckedChange={(checked) => {
                                  field.onChange(checked)
                                  // Set default deadline to 3 months before retreat start when enabling
                                  if (checked && startDate) {
                                    const retreatStart = new Date(startDate)
                                    const defaultDeadline = new Date(retreatStart)
                                    defaultDeadline.setMonth(defaultDeadline.getMonth() - 3)
                                    const deadlineStr = defaultDeadline.toISOString().split('T')[0]
                                    setValue(`rooms.${index}.early_bird_deadline`, deadlineStr)
                                  }
                                }}
                              />
                            )}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`room-early-bird-${index}`} className="text-sm font-medium text-green-800">
                              Enable Early Bird (10% discount)
                            </Label>
                            <p className="text-xs text-green-600">
                              Guests booking before the deadline get 10% off this room
                            </p>
                          </div>
                        </div>

                        {/* Early Bird Deadline Date Picker */}
                        <Controller
                          name={`rooms.${index}.early_bird_enabled`}
                          control={control}
                          render={({ field: enabledField }) => enabledField.value ? (
                            <div className="mt-3 pt-3 border-t border-green-200">
                              <div className="flex items-center gap-3">
                                <Calendar className="w-4 h-4 text-green-600" />
                                <div className="flex-1">
                                  <Label htmlFor={`room-early-bird-deadline-${index}`} className="text-sm font-medium text-green-700">
                                    Early Bird Deadline
                                  </Label>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Input
                                      id={`room-early-bird-deadline-${index}`}
                                      type="date"
                                      {...register(`rooms.${index}.early_bird_deadline`)}
                                      className="w-48 bg-white"
                                    />
                                    <p className="text-xs text-green-600">
                                      (Default: 3 months before retreat)
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : <></>}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 3. Media & Description */}
        <AccordionItem value="media" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-primary" />
              <span className="font-semibold">Media & Description</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <div className="space-y-2">
              <Label>Cover Image</Label>
              <ImageUpload
                value={watchedImageUrl || undefined}
                onChange={(url) => setValue('image_url', url)}
                bucket="retreat-images"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="intro_text">Intro Text</Label>
                <TranslateButton
                  text={watch('intro_text') || ''}
                  onTranslated={(text) => setValue('intro_text', text)}
                />
              </div>
              <Textarea
                id="intro_text"
                {...register('intro_text')}
                placeholder="Short introductory text shown at the top of the retreat page..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="description">Full Description</Label>
                <TranslateButton
                  text={watch('description') || ''}
                  onTranslated={(text) => setValue('description', text)}
                />
              </div>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Detailed description of the retreat experience..."
                rows={5}
              />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 4. Retreat Details */}
        <AccordionItem value="details" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <span className="font-semibold">Retreat Details</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="food">Food</Label>
                <Input
                  id="food"
                  {...register('food')}
                  placeholder="e.g., Breakfast & Dinner"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gear">Gear</Label>
                <Input
                  id="gear"
                  {...register('gear')}
                  placeholder="e.g., Included"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricing_note">Pricing Note</Label>
                <Input
                  id="pricing_note"
                  {...register('pricing_note')}
                  placeholder="e.g., per person"
                />
              </div>
            </div>

            <Separator />

            {/* Highlights */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Highlights</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendHighlight('')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
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
            </div>

            <Separator />

            {/* Included */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>What's Included</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendIncluded('')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
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
            </div>

            <Separator />

            {/* Not Included */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Not Included</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendNotIncluded('')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add
                </Button>
              </div>
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
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* 5. Location & Map */}
        <AccordionItem value="location" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              <span className="font-semibold">Location & Map</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="exact_address">Address</Label>
              <Input
                id="exact_address"
                {...register('exact_address')}
                placeholder="Full address of the retreat venue"
              />
              <p className="text-xs text-muted-foreground">
                Google Maps will show the location based on this address
              </p>
            </div>

            {/* Map Preview */}
            {watchedAddress && (
              <div className="space-y-2">
                <Label>Map Preview</Label>
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={`https://www.google.com/maps?q=${encodeURIComponent(watchedAddress)}&output=embed&z=14`}
                    width="100%"
                    height="250"
                    style={{ border: 0 }}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              </div>
            )}
          </AccordionContent>
        </AccordionItem>

        {/* 6. Additional Information */}
        <AccordionItem value="additional" className="border rounded-lg px-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              <span className="font-semibold">Additional Information</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="pt-4 pb-6 space-y-4">
            {/* About Sections */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label>About Sections</Label>
                  <p className="text-sm text-muted-foreground">Additional content sections for the retreat page</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => appendAbout({ title: '', paragraphs: [''] })}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Section
                </Button>
              </div>

              {aboutFields.map((field, sectionIndex) => (
                <div key={field.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm">Section Title (optional)</Label>
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
                    <Label className="text-sm">Paragraphs</Label>
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
            </div>

          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Submit Buttons - Sticky at bottom */}
      <div className="sticky bottom-0 bg-background border-t pt-4 pb-4 -mx-4 px-4 flex justify-end gap-4">
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
