'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
import { useTranslations } from 'next-intl'
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Utensils,
  Waves,
  Tag,
  Filter,
  SlidersHorizontal,
  Loader2,
} from 'lucide-react'
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

  const levels = [
    { value: 'All Levels', label: t('filters.allLevels') },
    { value: 'Beginners', label: t('filters.beginners') },
    { value: 'Intermediate', label: t('filters.intermediate') },
    { value: 'Advanced', label: t('filters.advanced') },
  ]

  const types = [
    { value: 'All Types', label: t('filters.allTypes') },
    { value: 'Budget', label: t('filters.budget') },
    { value: 'Standard', label: t('filters.standard') },
    { value: 'Premium', label: t('filters.premium') },
  ]

  const sortOptions = [
    { value: 'date-asc', label: t('filters.dateAsc') },
    { value: 'date-desc', label: t('filters.dateDesc') },
    { value: 'price-asc', label: t('filters.priceAsc') },
    { value: 'price-desc', label: t('filters.priceDesc') },
  ]

  const [levelFilter, setLevelFilter] = useState('All Levels')
  const [typeFilter, setTypeFilter] = useState('All Types')
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

  const filteredRetreats = useMemo(() => {
    let result = [...retreats]

    // Filter by level
    if (levelFilter !== 'All Levels') {
      result = result.filter((r) => r.level === levelFilter)
    }

    // Filter by type
    if (typeFilter !== 'All Types') {
      result = result.filter((r) => r.type === typeFilter)
    }

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
  }, [retreats, levelFilter, typeFilter, sortBy])

  const clearFilters = () => {
    setLevelFilter('All Levels')
    setTypeFilter('All Types')
    setSortBy('date-asc')
  }

  const hasActiveFilters =
    levelFilter !== 'All Levels' || typeFilter !== 'All Types'

  const getLevelLabel = (value: string) => {
    const level = levels.find(l => l.value === value)
    return level ? level.label : value
  }

  const getTypeLabel = (value: string) => {
    const type = types.find(t => t.value === value)
    return type ? type.label : value
  }

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
      <section className="bg-gradient-teal py-16 md:py-24">
        <div className="container mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-4">
              {t('title').split(' ')[0]}{' '}
              <span className="text-gradient-rainbow">{t('title').split(' ').slice(1).join(' ') || 'Retreats'}</span>
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
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder={tCommon('level')} />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

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

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-[var(--primary-teal)]"
                >
                  {tCommon('clearFilters')}
                </Button>
              )}
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
                  <Card className="overflow-hidden h-full flex flex-col group hover:shadow-xl transition-shadow duration-300 bg-white border-0">
                    <div className="relative aspect-[4/3] overflow-hidden">
                      <Image
                        src={retreat.image_url}
                        alt={retreat.destination}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-foreground"
                        >
                          {getLevelLabel(retreat.level)}
                        </Badge>
                        <Badge className="bg-[var(--primary-teal)]">
                          {getTypeLabel(retreat.type)}
                        </Badge>
                      </div>
                      {retreat.availability_status === 'sold_out' && (
                        <div className="absolute top-3 right-3">
                          <Badge variant="destructive">Sold Out</Badge>
                        </div>
                      )}
                    </div>

                    <CardContent className="flex-1 pt-4">
                      <div className="mb-3">
                        <h3 className="text-xl font-semibold mb-1">
                          {retreat.destination}
                        </h3>
                        <div className="flex items-center text-muted-foreground text-sm">
                          <MapPin className="size-4 mr-1" />
                          {retreat.location}
                        </div>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground mb-4">
                        <Calendar className="size-4 mr-1" />
                        {formatDate(retreat.start_date, retreat.end_date)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Users className="size-4 mr-2 shrink-0" />
                          <span>{retreat.participants} {tCommon('people')}</span>
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
                            <span className="text-2xl font-bold">
                              {formatPrice(retreat.price)}
                            </span>
                            <span className="text-muted-foreground text-sm ml-1">
                              / {tCommon('perPerson')}
                            </span>
                          </div>
                          {retreat.early_bird_price && (
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
                      <Button
                        asChild
                        className="w-full bg-[var(--primary-teal)] hover:bg-[var(--primary-teal-hover)]"
                        disabled={retreat.availability_status === 'sold_out'}
                      >
                        <Link href={`/retreats/${retreat.slug}`}>
                          {retreat.availability_status === 'sold_out' ? 'Sold Out' : t('bookNow')}
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                {t('noResults')}
              </p>
              <Button variant="outline" onClick={clearFilters}>
                {tCommon('clearFilters')}
              </Button>
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
              className="bg-[var(--primary-teal)] hover:bg-[var(--primary-teal-hover)]"
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
