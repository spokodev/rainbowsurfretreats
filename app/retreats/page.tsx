'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'motion/react'
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
import { retreats } from '@/lib/data'

const levels = ['All Levels', 'Beginners', 'Intermediate', 'Advanced']
const types = ['All Types', 'Budget', 'Standard', 'Premium']
const sortOptions = [
  { value: 'date-asc', label: 'Date (Earliest)' },
  { value: 'date-desc', label: 'Date (Latest)' },
  { value: 'price-asc', label: 'Price (Low to High)' },
  { value: 'price-desc', label: 'Price (High to Low)' },
]

export default function RetreatsPage() {
  const [levelFilter, setLevelFilter] = useState('All Levels')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [sortBy, setSortBy] = useState('date-asc')

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
      const priceA = parseFloat(a.price.replace(/[^0-9.]/g, ''))
      const priceB = parseFloat(b.price.replace(/[^0-9.]/g, ''))

      switch (sortBy) {
        case 'price-asc':
          return priceA - priceB
        case 'price-desc':
          return priceB - priceA
        case 'date-desc':
          return b.id - a.id
        case 'date-asc':
        default:
          return a.id - b.id
      }
    })

    return result
  }, [levelFilter, typeFilter, sortBy])

  const clearFilters = () => {
    setLevelFilter('All Levels')
    setTypeFilter('All Types')
    setSortBy('date-asc')
  }

  const hasActiveFilters =
    levelFilter !== 'All Levels' || typeFilter !== 'All Types'

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
              Our <span className="text-gradient-rainbow">Retreats</span>
            </h1>
            <p className="text-white/90 text-lg md:text-xl max-w-2xl mx-auto">
              Discover your perfect surf adventure. From beginner-friendly beaches
              to challenging breaks, we have something for everyone.
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
                Showing{' '}
                <strong className="text-gray-900">{filteredRetreats.length}</strong>{' '}
                retreats
              </span>
            </div>

            <div className="flex flex-wrap gap-3 items-center">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  {levels.map((level) => (
                    <SelectItem key={level} value={level}>
                      {level}
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
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[170px]">
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
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
                  Clear filters
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
                        src={retreat.image}
                        alt={retreat.destination}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 left-3 flex gap-2">
                        <Badge
                          variant="secondary"
                          className="bg-white/90 text-foreground"
                        >
                          {retreat.level}
                        </Badge>
                        <Badge className="bg-[var(--primary-teal)]">
                          {retreat.type}
                        </Badge>
                      </div>
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
                        {retreat.date}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center text-muted-foreground">
                          <Users className="size-4 mr-2 shrink-0" />
                          <span>{retreat.participants} people</span>
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
                              {retreat.price}
                            </span>
                            <span className="text-muted-foreground text-sm ml-1">
                              / person
                            </span>
                          </div>
                          <div className="flex items-center text-sm">
                            <Tag className="size-4 mr-1 text-green-600" />
                            <span className="text-green-600 font-medium">
                              Early Bird: {retreat.earlyBird}
                            </span>
                          </div>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-0">
                      <Button
                        asChild
                        className="w-full bg-[var(--primary-teal)] hover:bg-[var(--primary-teal-hover)]"
                      >
                        <Link href={`/retreats/${retreat.id}`}>Book Now</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg mb-4">
                No retreats found matching your criteria.
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Clear filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Can&apos;t Find Your Perfect Retreat?
          </h2>
          <p className="text-gray-600 max-w-xl mx-auto mb-6">
            We&apos;re always planning new adventures. Contact us to discuss
            custom retreat options or join our mailing list to be the first to
            know about new destinations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              className="bg-[var(--primary-teal)] hover:bg-[var(--primary-teal-hover)]"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/#newsletter">Join Newsletter</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
