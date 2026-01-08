'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  Users,
  Clock,
  Utensils,
  Waves,
  Tag,
  Filter,
  SlidersHorizontal,
  Loader2,
  Bell,
} from 'lucide-react'
import ImageWithFallback from '@/components/ImageWithFallback'
import { RETREAT_IMAGES } from '@/lib/images'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface RetreatRoom {
  id: string
  name: string
  price: number
  capacity: number
  available: number
  is_sold_out: boolean
}

interface Retreat {
  id: string
  slug: string
  destination: string
  location: string
  image_url: string | null
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
  availability_status: 'available' | 'sold_out' | 'few_spots'
  rooms: RetreatRoom[]
}

export default function RetreatsPage() {
  const t = useTranslations('retreats')
  const tCommon = useTranslations('common')

  const [retreats, setRetreats] = useState<Retreat[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRetreats() {
      try {
        const response = await fetch('/api/retreats?published=true')
        const data = await response.json()
        if (data.error) {
          setError(data.error)
        } else {
          setRetreats(data.data || [])
        }
      } catch {
        setError('Failed to load retreats')
      } finally {
        setLoading(false)
      }
    }
    fetchRetreats()
  }, [])

  const sortOptions = [
    { value: 'date-asc', label: t('filters.dateAsc') },
    { value: 'date-desc', label: t('filters.dateDesc') },
    { value: 'price-asc', label: t('filters.priceAsc') },
    { value: 'price-desc', label: t('filters.priceDesc') },
  ]

  const [sortBy, setSortBy] = useState('date-asc')

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }
    const yearOptions: Intl.DateTimeFormatOptions = { year: 'numeric' }
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}, ${end.toLocaleDateString('en-US', yearOptions)}`
  }

  const formatPrice = (price: number) => {
    return `€${price.toLocaleString()}`
  }

  const getLowestAvailablePrice = (retreat: Retreat): { price: number | null; isSoldOut: boolean } => {
    const availableRooms = retreat.rooms?.filter(
      room => room.available > 0 && !room.is_sold_out
    ) || [];

    if (availableRooms.length === 0) {
      return { price: null, isSoldOut: true };
    }

    const lowestPrice = Math.min(...availableRooms.map(room => room.price));
    return { price: lowestPrice, isSoldOut: false };
  };

  const filteredRetreats = useMemo(() => {
    let result = [...retreats]

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          return a.price - b.price
        case 'price-desc':
          return b.price - a.price
        case 'date-desc':
          return new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        case 'date-asc':
        default:
          return new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
      }
    })

    return result
  }, [retreats, sortBy])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--primary-teal)]" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-red-500">{error}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={RETREAT_IMAGES.morocco}
            alt="Our Retreats"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>
        <div className="container relative z-10 mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t('title')}
            </h1>
            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
              {t('subtitle')}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="py-8 bg-white border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Filter className="w-4 h-4" />
              <span>
                {t('showing', { count: filteredRetreats.length })}
              </span>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder={t('filters.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

                          </div>
          </div>
        </div>
      </section>

      {/* Retreats Grid */}
      <section className="py-12 md:py-16 bg-[var(--sand-light)]">
        <div className="container mx-auto px-4">
          {filteredRetreats.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRetreats.map((retreat, index) => (
                <motion.div
                  key={retreat.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Link href={`/retreats/${retreat.slug}`} className="block h-full">
                  <Card className="overflow-hidden h-full flex flex-col group hover:shadow-xl transition-shadow duration-300 bg-white border-0 cursor-pointer">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      {retreat.image_url ? (
                        <Image
                          src={retreat.image_url}
                          alt={retreat.destination}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          unoptimized={retreat.image_url.includes('drive.google.com')}
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/40" />
                      )}
                      {retreat.availability_status === 'sold_out' && (
                        <div className="absolute top-3 right-3">
                          <Badge className="bg-amber-500 text-white">Sold Out</Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="flex-1 pt-4">
                      <div className="mb-3">
                        <h3 className="text-xl font-semibold">
                          {retreat.destination}
                        </h3>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <Calendar className="size-4 mr-1" />
                        {formatDate(retreat.start_date, retreat.end_date)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Users className="size-4 mr-2 shrink-0" />
                          <span>Max {retreat.participants} {tCommon('people')}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="size-4 mr-2 shrink-0" />
                          <span>{retreat.duration}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Utensils className="size-4 mr-2 shrink-0" />
                          <span>{retreat.food}</span>
                        </div>
                        <div className="flex items-center text-muted-foreground">
                          <Waves className="size-4 mr-2 shrink-0" />
                          <span>{retreat.gear}</span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-baseline justify-between">
                          <div>
                            {(() => {
                              const { price, isSoldOut } = getLowestAvailablePrice(retreat);
                              if (isSoldOut) {
                                return (
                                  <span className="text-xl font-bold text-amber-600">{t('soldOut')}</span>
                                );
                              }
                              return (
                                <>
                                  <span className="text-sm text-muted-foreground mr-1">{t('from')}</span>
                                  <span className="text-2xl font-bold">{formatPrice(price!)}</span>
                                  <span className="text-muted-foreground text-sm ml-1">
                                    / {t('person')}
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                          {retreat.early_bird_price && !getLowestAvailablePrice(retreat).isSoldOut && (
                            <div className="flex items-center text-sm">
                              <Tag className="size-4 mr-1 text-green-600" />
                              <span className="text-green-600 font-medium">
                                {t('earlyBird')}: {formatPrice(retreat.early_bird_price)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      {(() => {
                        const { isSoldOut } = getLowestAvailablePrice(retreat);
                        if (isSoldOut) {
                          return (
                            <Button
                              className="w-full bg-[var(--primary-teal)] text-[var(--earth-brown)] hover:bg-[var(--primary-teal-hover)]"
                            >
                              <Bell className="w-4 h-4 mr-2" />
                              {t('joinWaitlist')}
                            </Button>
                          );
                        }
                        return (
                          <Button className="w-full bg-[var(--primary-teal)] text-[var(--earth-brown)] hover:bg-[var(--primary-teal-hover)]">
                            {t('bookNow')}
                          </Button>
                        );
                      })()}
                    </CardFooter>
                  </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">
                {t('noResults')}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            {t('cta.title')}
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[var(--primary-teal)] text-[var(--earth-brown)] hover:bg-[var(--primary-teal-hover)]"
            >
              <Link href="/contact">{t('cta.contact')}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/#newsletter">{t('cta.newsletter')}</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
