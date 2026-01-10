'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslations, useLocale } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RetreatMap } from '@/components/retreat-map'
import { WaitlistForm } from '@/components/waitlist-form'
import RetreatGallery from '@/components/RetreatGallery'
import { Calendar, Users, Clock, Utensils, Waves, Check, X, Bell } from 'lucide-react'

interface RetreatRoom {
  id: string
  name: string
  description: string
  image_url?: string | null
  price: number
  deposit_price: number
  capacity: number
  available: number
  is_sold_out: boolean
  is_published?: boolean
  sort_order: number
  early_bird_enabled: boolean
  early_bird_deadline: string | null
}

interface AboutSection {
  title?: string
  paragraphs: string[]
}

interface Retreat {
  id: string
  slug: string
  destination: string
  image_url: string | null
  level: string
  duration: string
  participants: string
  food: string
  gear: string
  price: number
  start_date: string
  end_date: string
  description: string
  intro_text: string
  highlights: string[]
  included: string[]
  not_included: string[]
  exact_address: string
  pricing_note: string | null
  availability_status: 'available' | 'sold_out' | 'few_spots'
  about_sections: AboutSection[]
  rooms: RetreatRoom[]
}

interface RetreatDetailClientProps {
  retreat: Retreat
}

export default function RetreatDetailClient({ retreat }: RetreatDetailClientProps) {
  const locale = useLocale()
  const t = useTranslations('retreatDetail')
  const tCommon = useTranslations('common')

  const [waitlistRoom, setWaitlistRoom] = useState<RetreatRoom | null>(null)

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }
    return `${start.toLocaleDateString(locale, options)} - ${end.toLocaleDateString(locale, options)}, ${end.toLocaleDateString(locale, yearOptions)}`
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price)
  }

  const isEligibleForEarlyBird = () => {
    const now = new Date()
    const retreatStart = new Date(retreat.start_date)
    const monthsUntil = (retreatStart.getFullYear() - now.getFullYear()) * 12 +
                         (retreatStart.getMonth() - now.getMonth())
    return monthsUntil >= 3
  }

  const sortedRooms = [...retreat.rooms]
    .filter(room => room.is_published !== false) // Show only published rooms
    .sort((a, b) => a.sort_order - b.sort_order)
  const eligible = isEligibleForEarlyBird()

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] w-full">
        {retreat.image_url ? (
          <Image
            src={retreat.image_url}
            alt={retreat.destination}
            fill
            priority
            className="object-cover"
            unoptimized={retreat.image_url.includes('drive.google.com')}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-12">
          <div className="container mx-auto">
            {retreat.availability_status === 'sold_out' && (
              <div className="mb-4">
                <Badge className="bg-amber-500 text-white text-lg px-4 py-1">Sold Out</Badge>
              </div>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-white">
              {retreat.destination}
            </h1>
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
                <span>Max {retreat.participants} {tCommon('people')}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Utensils className="size-4 mr-2" />
                <span>{retreat.food}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Waves className="size-4 mr-2" />
                <span>Gear: {retreat.gear}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] lg:grid-cols-3 gap-8">
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

            {/* About Sections */}
            {retreat.about_sections && retreat.about_sections.length > 0 && (
              <section>
                {retreat.about_sections.map((section, idx) => (
                  <div key={idx} className="mb-6">
                    {section.title && (
                      <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
                    )}
                    <div className="prose prose-gray max-w-none">
                      {section.paragraphs.map((paragraph, pIdx) => (
                        <p key={pIdx} className="mb-4 text-muted-foreground">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}

            {/* Photo Gallery */}
            <RetreatGallery retreatId={retreat.id} />

          </div>

          {/* Right Column - Sidebar */}
          <div className="space-y-6">
            {/* Pricing Note */}
            {retreat.pricing_note && (
              <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                <p className="text-sm text-amber-800">{retreat.pricing_note}</p>
              </div>
            )}

            {/* Room Options */}
            {sortedRooms.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('roomOptions')}</CardTitle>
                  <p className="text-sm text-muted-foreground">{t('pricesExcludeVat')}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {sortedRooms.map((room) => (
                    <div
                      key={room.id}
                      className={`p-4 border rounded-lg ${room.is_sold_out ? 'opacity-60' : ''}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-lg font-semibold">{room.name}</h4>
                          {room.description && (
                            <p className="text-sm text-muted-foreground">{room.description}</p>
                          )}
                          {room.capacity > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Capacity: {room.capacity} {room.capacity === 1 ? 'person' : 'people'}
                            </p>
                          )}
                        </div>
                        {room.is_sold_out && (
                          <Badge className="bg-amber-500 text-white text-xs">Sold Out</Badge>
                        )}
                      </div>
                      <div className="flex justify-between items-center mt-3">
                        <div>
                          {eligible && room.early_bird_enabled ? (
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="text-sm line-through text-muted-foreground">
                                  {formatPrice(room.price)}
                                </span>
                                <span className="text-lg font-bold text-green-600">
                                  {formatPrice(Math.round(room.price * 0.9))}
                                </span>
                              </div>
                              <span className="text-xs text-green-600">{t('earlyBird')} (-10%)</span>
                            </div>
                          ) : (
                            <>
                              <span className="text-lg font-bold">{formatPrice(room.price)}</span>
                              <span className="text-sm text-muted-foreground ml-1">/ {tCommon('perPerson')}</span>
                            </>
                          )}
                        </div>
                        {!room.is_sold_out && room.available > 0 ? (
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-green-600">
                              {room.available} {room.available === 1 ? 'spot' : 'spots'} left
                            </span>
                            <Button asChild size="sm">
                              <Link href={`/booking?slug=${retreat.slug}&roomId=${room.id}`}>
                                {t('book')}
                              </Link>
                            </Button>
                          </div>
                        ) : !room.is_sold_out ? (
                          <Button asChild size="sm">
                            <Link href={`/booking?slug=${retreat.slug}&roomId=${room.id}`}>
                              {t('book')}
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-[var(--primary-teal)] text-[var(--primary-teal)] hover:bg-[var(--primary-teal-light)]"
                            onClick={() => setWaitlistRoom(room)}
                          >
                            <Bell className="w-4 h-4 mr-1" />
                            {t('joinWaitlist')}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Location Info */}
            {retreat.exact_address && (
              <Card>
                <CardHeader>
                  <CardTitle>{t('location')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <RetreatMap address={retreat.exact_address} />
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Waitlist Dialog */}
      <Dialog open={!!waitlistRoom} onOpenChange={(open) => !open && setWaitlistRoom(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Join Waitlist</DialogTitle>
          </DialogHeader>
          {waitlistRoom && (
            <WaitlistForm
              retreatId={retreat.id}
              roomId={waitlistRoom.id}
              retreatName={retreat.destination}
              roomName={waitlistRoom.name}
            />
          )}
        </DialogContent>
      </Dialog>
    </main>
  )
}
