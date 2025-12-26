'use client'

import { useEffect, useState } from 'react'
import { useParams, notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MapPin, Calendar, Users, Clock, Utensils, Waves, Tag, Check, X, Loader2 } from 'lucide-react'

interface RetreatRoom {
  id: string
  name: string
  description: string
  price: number
  deposit_price: number
  capacity: number
  available: number
  is_sold_out: boolean
  sort_order: number
}

interface Retreat {
  id: string
  slug: string
  destination: string
  location: string
  image_url: string
  level: string
  duration: string
  participants: string
  food: string
  type: string
  gear: string
  price: number
  early_bird_price: number | null
  start_date: string
  end_date: string
  description: string
  intro_text: string
  highlights: string[]
  included: string[]
  not_included: string[]
  exact_address: string
  check_in_time: string
  check_out_time: string
  availability_status: 'available' | 'sold_out' | 'few_spots'
  rooms: RetreatRoom[]
}

export default function RetreatPage() {
  const params = useParams()
  const slug = params.id as string
  const t = useTranslations('retreatDetail')
  const tCommon = useTranslations('common')

  const [retreat, setRetreat] = useState<Retreat | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRetreat() {
      try {
        const response = await fetch(`/api/retreats?slug=${slug}`)
        const data = await response.json()

        if (data.error) {
          if (response.status === 404) {
            setError('not_found')
          } else {
            setError(data.error)
          }
        } else {
          setRetreat(data.data)
        }
      } catch {
        setError('Failed to load retreat')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchRetreat()
    }
  }, [slug])

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.toLocaleDateString('en-US', yearOptions)}`
  }

  const formatPrice = (price: number) => {
    return `€${price.toLocaleString()}`
  }

  const formatTime = (time: string) => {
    if (!time) return ''
    // Handle both "15:00:00" and "15:00" formats
    const [hours, minutes] = time.split(':')
    return `${hours}:${minutes}`
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-teal)]" />
      </div>
    )
  }

  if (error === 'not_found' || !retreat) {
    notFound()
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  const sortedRooms = [...retreat.rooms].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] w-full">
        <Image
          src={retreat.image_url}
          alt={retreat.destination}
          fill
          priority
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            <div className="flex flex-wrap gap-2 mb-4">
              <Badge variant="secondary" className="bg-white/90 text-foreground">
                {retreat.level}
              </Badge>
              <Badge className="bg-primary/90">
                {retreat.type}
              </Badge>
              {retreat.availability_status === 'sold_out' && (
                <Badge variant="destructive">Sold Out</Badge>
              )}
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
              {retreat.destination}
            </h1>
            <div className="flex items-center text-white/90 text-lg">
              <MapPin className="size-5 mr-2" />
              {retreat.location}
            </div>
          </div>
        </div>
      </section>

      {/* Quick Info Bar */}
      <section className="bg-muted border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-6 text-sm">
              <div className="flex items-center text-muted-foreground">
                <Calendar className="size-4 mr-2" />
                <span className="font-medium">{formatDate(retreat.start_date, retreat.end_date)}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="size-4 mr-2" />
                <span>{retreat.duration}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Users className="size-4 mr-2" />
                <span>{retreat.participants} {tCommon('people')}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Utensils className="size-4 mr-2" />
                <span>{retreat.food}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Waves className="size-4 mr-2" />
                <span>{retreat.gear}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold">{formatPrice(retreat.price)}</span>
                  <span className="text-muted-foreground text-sm">/ {tCommon('perPerson')}</span>
                </div>
                {retreat.early_bird_price && (
                  <div className="flex items-center text-sm text-green-600">
                    <Tag className="size-3 mr-1" />
                    {t('earlyBird')}: {formatPrice(retreat.early_bird_price)}
                  </div>
                )}
              </div>
              <Button asChild size="lg" disabled={retreat.availability_status === 'sold_out'}>
                <Link href={`/booking?slug=${retreat.slug}`}>
                  {retreat.availability_status === 'sold_out' ? 'Sold Out' : t('bookNow')}
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Intro */}
            {retreat.intro_text && (
              <section>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  {retreat.intro_text}
                </p>
              </section>
            )}

            {/* Description */}
            {retreat.description && (
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('aboutRetreat')}</h2>
                <div className="prose prose-gray max-w-none">
                  {retreat.description.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 text-muted-foreground">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            )}

            {/* Highlights */}
            {retreat.highlights && retreat.highlights.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('highlights')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {retreat.highlights.map((highlight, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="size-5 text-green-600 shrink-0 mt-0.5" />
                      <span>{highlight}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* What's Included */}
            {retreat.included && retreat.included.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('whatsIncluded')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {retreat.included.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <Check className="size-5 text-green-600 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* What's Not Included */}
            {retreat.not_included && retreat.not_included.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-4">{t('notIncluded')}</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {retreat.not_included.map((item, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <X className="size-5 text-red-500 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Room Options */}
            {sortedRooms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('roomOptions')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-4 border rounded-lg ${room.is_sold_out ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{room.name}</h4>
                          {room.description && (
                            <p className="text-sm text-muted-foreground">{room.description}</p>
                          )}
                        </div>
                        {room.is_sold_out && (
                          <Badge variant="destructive" className="text-xs">Sold Out</Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          <span className="text-lg font-bold">{formatPrice(room.price)}</span>
                          <span className="text-sm text-muted-foreground ml-1">/ {tCommon('perPerson')}</span>
                        </div>
                        {!room.is_sold_out && room.available > 0 && (
                          <span className="text-sm text-green-600">
                            {room.available} {room.available === 1 ? 'spot' : 'spots'} left
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Location Info */}
            <Card>
              <CardHeader>
                <CardTitle>{t('location')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {retreat.exact_address && (
                  <div>
                    <p className="text-sm text-muted-foreground">{retreat.exact_address}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {retreat.check_in_time && (
                    <div>
                      <span className="text-muted-foreground">{t('checkIn')}:</span>
                      <p className="font-medium">{formatTime(retreat.check_in_time)}</p>
                    </div>
                  )}
                  {retreat.check_out_time && (
                    <div>
                      <span className="text-muted-foreground">{t('checkOut')}:</span>
                      <p className="font-medium">{formatTime(retreat.check_out_time)}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Book Now Card */}
            <Card className="bg-[var(--primary-teal)] text-white">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">{t('readyToJoin')}</h3>
                <p className="text-white/90 mb-4">{t('secureSpot')}</p>
                <Button
                  asChild
                  className="w-full bg-white text-[var(--primary-teal)] hover:bg-white/90"
                  disabled={retreat.availability_status === 'sold_out'}
                >
                  <Link href={`/booking?slug=${retreat.slug}`}>
                    {retreat.availability_status === 'sold_out' ? 'Sold Out' : t('bookNow')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
