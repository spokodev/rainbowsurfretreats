"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar,
  MapPin,
  Users,
  Clock,
  Utensils,
  Waves,
  Tag,
  Bell,
} from "lucide-react";

interface RetreatRoom {
  id: string;
  name: string;
  price: number;
  available: number;
  is_sold_out: boolean;
}

interface Retreat {
  id: string;
  slug: string;
  destination: string;
  location: string;
  image_url: string;
  level: string;
  duration: string;
  participants: string;
  food: string;
  type: string;
  gear: string;
  price: number;
  early_bird_price: number | null;
  start_date: string;
  end_date: string;
  rooms?: RetreatRoom[];
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

export default function NextRetreats() {
  const t = useTranslations('retreats');
  const [retreats, setRetreats] = useState<Retreat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/retreats?published=true")
      .then((res) => res.json())
      .then((data) => setRetreats(data.data || []))
      .catch(() => setRetreats([]))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const options: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
    const yearOptions: Intl.DateTimeFormatOptions = { year: "numeric" };
    return `${start.toLocaleDateString("en-US", options)} - ${end.toLocaleDateString("en-US", options)}, ${end.toLocaleDateString("en-US", yearOptions)}`;
  };

  const formatPrice = (price: number) => `€${price.toLocaleString()}`;

  return (
    <section className="py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Upcoming Retreats
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Join us for an unforgettable surf adventure. Choose from our
            carefully curated retreats around the world.
          </p>
        </motion.div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden h-full flex flex-col">
                <Skeleton className="aspect-[4/3] w-full" />
                <CardContent className="flex-1 pt-4 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-2/3" />
                  <div className="grid grid-cols-2 gap-2">
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                    <Skeleton className="h-4" />
                  </div>
                </CardContent>
                <CardFooter>
                  <Skeleton className="h-10 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {retreats.map((retreat, index) => (
            <motion.div
              key={retreat.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
            >
              <Link href={`/retreats/${retreat.slug}`} className="block h-full">
              <Card className="overflow-hidden h-full flex flex-col group hover:shadow-lg transition-shadow duration-300 cursor-pointer">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <Image
                    src={retreat.image_url}
                    alt={retreat.destination}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-3 left-3 flex gap-2">
                    <Badge variant="secondary" className="bg-white/90 text-foreground">
                      {retreat.level}
                    </Badge>
                    <Badge className="bg-primary/90">
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
                    {formatDate(retreat.start_date, retreat.end_date)}
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
                            Early Bird: {formatPrice(retreat.early_bird_price)}
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
                        <Button className="w-full bg-[var(--primary-teal)] text-white hover:bg-[var(--primary-teal-hover)]">
                          <Bell className="w-4 h-4 mr-2" />
                          {t('joinWaitlist')}
                        </Button>
                      );
                    }
                    return (
                      <Button className="w-full bg-[var(--primary-teal)] text-white hover:bg-[var(--primary-teal-hover)]">
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
        )}
      </div>
    </section>
  );
}
