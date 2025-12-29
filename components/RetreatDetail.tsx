'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'motion/react';
import { Retreat, RetreatRoom } from '@/lib/data';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Utensils,
  Waves,
  Check,
  X,
  Star,
  ArrowLeft,
  CreditCard,
  Shield,
  Plane,
  Backpack,
} from 'lucide-react';

interface RetreatDetailProps {
  retreat: Retreat;
}

const defaultRooms: RetreatRoom[] = [
  {
    id: 'default-shared',
    name: 'Shared Room',
    price: 0,
    depositPrice: 100,
    available: 4,
    soldOut: false,
    description: 'Share a comfortable room with fellow retreat participants.',
  },
  {
    id: 'default-private',
    name: 'Private Room',
    price: 200,
    depositPrice: 150,
    available: 2,
    soldOut: false,
    description: 'Enjoy your own private space with all amenities included.',
  },
];

const defaultItinerary = [
  {
    day: 'Day 1',
    title: 'Arrival & Welcome',
    activities: [
      'Airport pickup and transfer to accommodation',
      'Check-in and room assignment',
      'Welcome meeting and retreat overview',
      'Welcome dinner with the group',
    ],
  },
  {
    day: 'Day 2-6',
    title: 'Surf & Activities',
    activities: [
      'Morning surf session with coaching',
      'Healthy breakfast',
      'Free time or optional activities',
      'Afternoon surf session',
      'Sunset gathering',
      'Group dinner',
    ],
  },
  {
    day: 'Final Day',
    title: 'Departure',
    activities: [
      'Final breakfast together',
      'Check-out from accommodation',
      'Transfer to airport',
      'Farewell and safe travels!',
    ],
  },
];

const defaultFAQs = [
  {
    question: 'What is the cancellation policy?',
    answer:
      'Cancellations made 30 days before the retreat are fully refundable. Cancellations within 30 days receive a 50% refund. No refunds within 7 days of the retreat start date.',
  },
  {
    question: 'Do I need previous surf experience?',
    answer:
      'Our retreats cater to all skill levels. Beginners are welcome and will receive appropriate instruction, while more experienced surfers will be challenged with advanced techniques and surf spots.',
  },
  {
    question: 'What should I bring?',
    answer:
      'Pack light, breathable clothing, swimwear, sunscreen (reef-safe preferred), a hat, sunglasses, and any personal medications. Surfboards and wetsuits (where needed) are provided.',
  },
  {
    question: 'Is travel insurance required?',
    answer:
      'Yes, we require all participants to have valid travel insurance that covers surfing activities and medical emergencies. We recommend purchasing comprehensive coverage.',
  },
  {
    question: 'Are meals included?',
    answer:
      'Yes! All meals are included in the retreat price. We cater to various dietary requirements - please let us know your needs when booking.',
  },
  {
    question: 'What if the weather is bad?',
    answer:
      'Weather conditions vary, but we always find suitable surf spots. In case of flat days, we organize alternative activities like yoga, cultural tours, or beach activities.',
  },
];

export default function RetreatDetail({ retreat }: RetreatDetailProps) {
  const router = useRouter();
  const [selectedRoom, setSelectedRoom] = useState<RetreatRoom | null>(null);

  const rooms = retreat.rooms && retreat.rooms.length > 0 ? retreat.rooms : defaultRooms;

  const handleBookNow = () => {
    if (selectedRoom) {
      router.push(`/booking?retreatId=${retreat.id}&roomId=${selectedRoom.id}`);
    } else {
      router.push(`/booking?retreatId=${retreat.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] overflow-hidden">
        <Image
          src={retreat.image}
          alt={retreat.destination}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <div className="container mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Link
                href="/retreats"
                className="inline-flex items-center text-white/80 hover:text-white mb-4 transition-colors"
              >
                <ArrowLeft className="size-4 mr-2" />
                Back to Retreats
              </Link>
              <div className="flex gap-2 mb-3">
                <Badge variant="secondary" className="bg-white/90 text-foreground">
                  {retreat.level}
                </Badge>
                <Badge className="bg-primary/90">{retreat.type}</Badge>
              </div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">
                {retreat.destination}
              </h1>
              <div className="flex items-center text-white/90">
                <MapPin className="size-5 mr-2" />
                <span className="text-lg">{retreat.location}</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Main Content */}
          <div className="lg:col-span-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start mb-6 overflow-x-auto">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="rooms">Rooms</TabsTrigger>
                  <TabsTrigger value="itinerary">Itinerary</TabsTrigger>
                  <TabsTrigger value="faq">FAQ</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-8">
                  {/* Description */}
                  <div>
                    <h2 className="text-2xl font-semibold mb-4">About This Retreat</h2>
                    {retreat.introText && (
                      <p className="text-muted-foreground mb-4">{retreat.introText}</p>
                    )}
                    <p className="text-muted-foreground">{retreat.description}</p>
                  </div>

                  {/* About Sections */}
                  {retreat.aboutSections && retreat.aboutSections.length > 0 && (
                    <div className="space-y-6">
                      {retreat.aboutSections.map((section, index) => (
                        <div key={index}>
                          {section.title && (
                            <h3 className="text-xl font-semibold mb-3">{section.title}</h3>
                          )}
                          {section.paragraphs.map((paragraph, pIndex) => (
                            <p key={pIndex} className="text-muted-foreground mb-2">
                              {paragraph}
                            </p>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Highlights */}
                  {retreat.highlights && retreat.highlights.length > 0 && (
                    <div>
                      <h3 className="text-xl font-semibold mb-4 flex items-center">
                        <Star className="size-5 mr-2 text-primary" />
                        Highlights
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {retreat.highlights.map((highlight, index) => (
                          <div key={index} className="flex items-start">
                            <Check className="size-5 mr-2 text-green-500 mt-0.5 shrink-0" />
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <Separator />

                  {/* What's Included */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {retreat.included && retreat.included.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">What&apos;s Included</h3>
                        <ul className="space-y-2">
                          {retreat.included.map((item, index) => (
                            <li key={index} className="flex items-start">
                              <Check className="size-5 mr-2 text-green-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {retreat.notIncluded && retreat.notIncluded.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Not Included</h3>
                        <ul className="space-y-2">
                          {retreat.notIncluded.map((item, index) => (
                            <li key={index} className="flex items-start">
                              <X className="size-5 mr-2 text-red-500 mt-0.5 shrink-0" />
                              <span className="text-muted-foreground">{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Important Info */}
                  {retreat.importantInfo && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="text-xl font-semibold mb-4">Important Information</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {retreat.importantInfo.paymentTerms && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <CreditCard className="size-4 mr-2 text-primary" />
                                  Payment Terms
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {retreat.importantInfo.paymentTerms}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {retreat.importantInfo.cancellationPolicy && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Shield className="size-4 mr-2 text-primary" />
                                  Cancellation Policy
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {retreat.importantInfo.cancellationPolicy}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {retreat.importantInfo.travelInsurance && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Plane className="size-4 mr-2 text-primary" />
                                  Travel Insurance
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {retreat.importantInfo.travelInsurance}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                          {retreat.importantInfo.whatToBring && (
                            <Card>
                              <CardHeader className="pb-2">
                                <CardTitle className="text-base flex items-center">
                                  <Backpack className="size-4 mr-2 text-primary" />
                                  What to Bring
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-muted-foreground">
                                  {retreat.importantInfo.whatToBring}
                                </p>
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                {/* Rooms Tab */}
                <TabsContent value="rooms" className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Choose Your Room</h2>
                    <p className="text-muted-foreground mb-6">
                      Select your preferred accommodation type for the retreat.
                    </p>
                  </div>

                  <div className="grid gap-4">
                    {rooms.map((room) => (
                      <Card
                        key={room.id}
                        className={`cursor-pointer transition-all ${
                          selectedRoom?.id === room.id
                            ? 'ring-2 ring-primary border-primary'
                            : 'hover:border-primary/50'
                        } ${room.soldOut ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => !room.soldOut && setSelectedRoom(room)}
                      >
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{room.name}</CardTitle>
                              <CardDescription>{room.description}</CardDescription>
                            </div>
                            <div className="text-right">
                              {room.price > 0 ? (
                                <span className="text-xl font-bold">+${room.price}</span>
                              ) : (
                                <span className="text-xl font-bold text-green-600">Included</span>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Deposit: ${room.depositPrice}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex justify-between items-center">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Users className="size-4 mr-1" />
                              {room.available} spots available
                            </div>
                            {room.soldOut ? (
                              <Badge variant="destructive">Sold Out</Badge>
                            ) : selectedRoom?.id === room.id ? (
                              <Badge>Selected</Badge>
                            ) : null}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {retreat.pricingNote && (
                    <p className="text-sm text-muted-foreground italic">{retreat.pricingNote}</p>
                  )}
                </TabsContent>

                {/* Itinerary Tab */}
                <TabsContent value="itinerary" className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Daily Schedule</h2>
                    <p className="text-muted-foreground mb-6">
                      Here&apos;s what a typical day looks like during the retreat.
                    </p>
                  </div>

                  <div className="space-y-6">
                    {defaultItinerary.map((day, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                      >
                        <Card>
                          <CardHeader>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="text-sm">
                                {day.day}
                              </Badge>
                              <CardTitle className="text-lg">{day.title}</CardTitle>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {day.activities.map((activity, actIndex) => (
                                <li key={actIndex} className="flex items-center">
                                  <div className="size-2 bg-primary rounded-full mr-3 shrink-0" />
                                  <span className="text-muted-foreground">{activity}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                  </div>

                </TabsContent>

                {/* FAQ Tab */}
                <TabsContent value="faq" className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-semibold mb-2">Frequently Asked Questions</h2>
                    <p className="text-muted-foreground mb-6">
                      Find answers to common questions about the retreat.
                    </p>
                  </div>

                  <Accordion type="single" collapsible className="w-full">
                    {defaultFAQs.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="sticky top-24"
            >
              <Card className="shadow-lg">
                <CardHeader>
                  <CardTitle className="text-2xl">
                    {retreat.price}
                    <span className="text-base font-normal text-muted-foreground ml-1">
                      / person
                    </span>
                  </CardTitle>
                  <CardDescription className="flex items-center text-green-600">
                    Early Bird: {retreat.earlyBird}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Retreat Details */}
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Calendar className="size-4 mr-3 text-muted-foreground" />
                      <span>{retreat.date}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Clock className="size-4 mr-3 text-muted-foreground" />
                      <span>{retreat.duration}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Users className="size-4 mr-3 text-muted-foreground" />
                      <span>{retreat.participants} participants</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Utensils className="size-4 mr-3 text-muted-foreground" />
                      <span>{retreat.food}</span>
                    </div>
                    <div className="flex items-center text-sm">
                      <Waves className="size-4 mr-3 text-muted-foreground" />
                      <span>{retreat.gear}</span>
                    </div>
                  </div>

                  <Separator />

                  {/* Location */}
                  {retreat.exactAddress && (
                    <div>
                      <p className="text-sm font-medium mb-1">Location</p>
                      <p className="text-sm text-muted-foreground">{retreat.exactAddress}</p>
                      {retreat.addressNote && (
                        <p className="text-xs text-muted-foreground mt-1">{retreat.addressNote}</p>
                      )}
                    </div>
                  )}

                  {/* Selected Room */}
                  {selectedRoom && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-sm font-medium mb-1">Selected Room</p>
                      <p className="text-sm text-muted-foreground">{selectedRoom.name}</p>
                      {selectedRoom.price > 0 && (
                        <p className="text-sm text-muted-foreground">+${selectedRoom.price}</p>
                      )}
                    </div>
                  )}

                  <Button size="lg" className="w-full" onClick={handleBookNow}>
                    Book Now
                  </Button>

                  <p className="text-xs text-center text-muted-foreground">
                    Reserve your spot with a deposit. Full payment due 30 days before the retreat.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
