import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Award, Heart, Camera, Users, MapPin, Mail, Phone } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ABOUT_IMAGES } from '@/lib/images'

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'About Us - Rainbow Surf Retreats',
    description: 'Learn about Rainbow Surf Retreats, our mission to create inclusive LGBTQ+ surf experiences, and the team behind our welcoming community.',
    openGraph: {
      title: 'About Us - Rainbow Surf Retreats',
      description: 'Learn about Rainbow Surf Retreats, our mission to create inclusive LGBTQ+ surf experiences, and the team behind our welcoming community.',
      images: [ABOUT_IMAGES.ogImage],
    },
  }
}

const features = [
  {
    icon: Award,
    title: 'Professional Coaching',
    description: 'Expert surf instructors providing personalized lessons for all skill levels.',
  },
  {
    icon: Heart,
    title: 'Yoga & Meditation',
    description: 'Daily wellness sessions to enhance your mind-body connection.',
  },
  {
    icon: Camera,
    title: 'Photos & Videos',
    description: 'Professional surf photography to capture your memorable moments.',
  },
  {
    icon: Users,
    title: 'LGBTQ+ Safe Space',
    description: 'A welcoming community where everyone can be their authentic self.',
  },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[60vh] min-h-[400px] flex items-center justify-center overflow-hidden">
        <Image
          src={ABOUT_IMAGES.surfersPosing}
          alt="Rainbow Surf Retreats group on the beach"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/40" />
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-4">
            About Us
          </h1>
          <p className="text-xl md:text-2xl text-white/90 max-w-2xl mx-auto">
            Creating safe, inclusive spaces for LGBTQ+ surfers worldwide
          </p>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 md:py-24 bg-[var(--sand-light)]">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center gap-3 mb-8">
            <Heart className="w-8 h-8 text-[var(--primary-teal)]" />
            <span className="w-8 h-8 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-8 h-8 text-[var(--primary-teal)]" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </span>
            <Users className="w-8 h-8 text-[var(--primary-teal)]" />
          </div>

          <div className="max-w-4xl mx-auto text-center">
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
              We bring together{' '}
              <span className="font-bold text-[var(--primary-teal)]">
                LGBTQ+ folks from all over the world
              </span>{' '}
              for surfing adventures and retreats. From Morocco to Panama, our retreats feature
              daily professional coaching or beginner lessons, board rentals, accommodations,
              yoga and meditation classes, surf theory, photos to take home, and video analysis.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-20 bg-[var(--sand-light)]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon
              return (
                <Card
                  key={feature.title}
                  className="bg-white/80 backdrop-blur-sm border-0 shadow-lg hover:shadow-xl transition-shadow"
                >
                  <CardContent className="p-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-4 bg-[var(--sand-medium)] rounded-full flex items-center justify-center">
                      <Icon className="w-8 h-8 text-[var(--primary-teal)]" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2 text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 text-sm">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Story Section */}
      <section className="py-16 md:py-24 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative h-[400px] md:h-[500px] rounded-2xl overflow-hidden shadow-2xl">
              <Image
                src={ABOUT_IMAGES.aerialView}
                alt="Aerial view of surfers"
                fill
                className="object-cover"
              />
            </div>
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Our Story
              </h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  Rainbow Surf Retreats was born from a simple idea: everyone deserves to
                  experience the joy of surfing in a safe, welcoming environment.
                </p>
                <p>
                  Founded by passionate surfers and allies, we&apos;ve been creating
                  unforgettable LGBTQ+ surf experiences since 2015. What started as small
                  gatherings has grown into a global community of wave riders who share
                  more than just a love for the ocean.
                </p>
                <p>
                  We believe that surfing is for everyone, and our retreats are designed
                  to be inclusive spaces where you can learn, grow, and connect with
                  like-minded individuals from around the world.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Team Section */}
      <section className="py-16 md:py-24 bg-[var(--sand-light)]">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Meet the Team
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Rich */}
            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <div className="relative h-64">
                <Image
                  src={ABOUT_IMAGES.rich}
                  alt="Rich - Co-founder"
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-1">Rich</h3>
                <p className="text-[var(--primary-teal)] font-medium mb-3">Co-founder & Lead Instructor</p>
                <p className="text-gray-600 text-sm">
                  With over 15 years of surfing experience, Rich brings passion and expertise
                  to every retreat. His patient teaching style helps surfers of all levels
                  catch their best waves.
                </p>
              </CardContent>
            </Card>

            {/* Steven */}
            <Card className="bg-white border-0 shadow-lg overflow-hidden">
              <div className="relative h-64">
                <Image
                  src={ABOUT_IMAGES.steven}
                  alt="Steven - Co-founder"
                  fill
                  className="object-cover"
                />
              </div>
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-1">Steven</h3>
                <p className="text-[var(--primary-teal)] font-medium mb-3">Co-founder & Operations</p>
                <p className="text-gray-600 text-sm">
                  Steven handles the logistics that make our retreats run smoothly.
                  From accommodation to local experiences, he ensures every detail
                  is perfect for our guests.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 bg-[var(--earth-brown)]">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to Join Our Community?
          </h2>
          <p className="text-white/90 text-lg max-w-2xl mx-auto mb-8">
            Discover our upcoming retreats and find your perfect surf adventure.
            Whether you&apos;re a beginner or experienced surfer, there&apos;s a place for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              className="bg-white text-[var(--earth-brown)] hover:bg-white/90 px-8"
            >
              <Link href="/retreats">View Retreats</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-white text-white hover:bg-white/10 px-8"
            >
              <Link href="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer Links Section */}
      <section className="py-8 bg-[var(--soft-gold)]">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-6 text-white/80 text-sm">
            <Link href="/privacy-policy" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <span className="text-white/40">•</span>
            <Link href="/policies" className="hover:text-white transition-colors">
              Terms & Conditions
            </Link>
            <span className="text-white/40">•</span>
            <Link href="/policies" className="hover:text-white transition-colors">
              Accessibility Statement
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
