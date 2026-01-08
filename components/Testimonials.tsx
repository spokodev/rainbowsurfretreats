'use client'

import { motion } from 'framer-motion'
import { Star, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

interface Testimonial {
  name: string
  location: string
  rating: number
  text: string
}

const testimonials: Testimonial[] = [
  {
    name: 'Michael S.',
    location: 'Berlin, Germany',
    rating: 5,
    text: 'An incredible experience! The instructors were patient and skilled, and the community vibe was amazing. I felt safe and welcomed from day one.',
  },
  {
    name: 'David R.',
    location: 'London, UK',
    rating: 5,
    text: 'Best vacation I\'ve ever had. The combination of surfing, yoga, and meeting like-minded people was exactly what I needed. Can\'t wait to come back!',
  },
  {
    name: 'Carlos M.',
    location: 'Madrid, Spain',
    rating: 5,
    text: 'From beginner to catching my first waves in just a few days. The team made sure everyone felt included and supported. Highly recommend!',
  },
]

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-1">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < rating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  )
}

export default function Testimonials() {
  return (
    <section className="py-16 md:py-24 bg-[var(--sand-light)]">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Our Guests Say
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hear from surfers who have joined our community and experienced the magic of Rainbow Surf Retreats.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 mb-10">
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={testimonial.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Card className="h-full bg-white border-0 shadow-lg hover:shadow-xl transition-shadow">
                <CardContent className="p-6">
                  <StarRating rating={testimonial.rating} />
                  <p className="mt-4 text-gray-700 leading-relaxed">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="font-semibold">{testimonial.name}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.location}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="text-center"
        >
          <Button
            asChild
            variant="outline"
            className="border-[var(--earth-brown)] text-[var(--earth-brown)] hover:bg-[var(--earth-brown)] hover:text-white"
          >
            <a
              href="https://share.google/frEf7KQOd0GHWUvCU"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              See All Reviews on Google
            </a>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
