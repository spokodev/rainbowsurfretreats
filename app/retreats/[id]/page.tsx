import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getRetreatById, retreats } from '@/lib/data';
import ImageWithFallback from '@/components/ImageWithFallback';
import RetreatDetail from '@/components/RetreatDetail';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Calendar, Users, Clock, Utensils, Waves, Tag } from 'lucide-react';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return retreats.map((retreat) => ({
    id: String(retreat.id),
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const retreat = getRetreatById(Number(id));

  if (!retreat) {
    return {
      title: 'Retreat Not Found',
      description: 'The requested retreat could not be found.',
    };
  }

  return {
    title: `${retreat.destination} Surf Retreat | Rainbow Surf Retreats`,
    description: retreat.description || `Join our ${retreat.duration} ${retreat.level.toLowerCase()} surf retreat in ${retreat.location}, ${retreat.destination}. ${retreat.type} experience starting at ${retreat.price}.`,
    openGraph: {
      title: `${retreat.destination} Surf Retreat`,
      description: retreat.description || `Join our surf retreat in ${retreat.destination}`,
      images: [retreat.image],
    },
  };
}

export default async function RetreatPage({ params }: PageProps) {
  const { id } = await params;
  const retreat = getRetreatById(Number(id));

  if (!retreat) {
    notFound();
  }

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[50vh] md:h-[60vh] w-full">
        <ImageWithFallback
          src={retreat.image}
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
                <span className="font-medium">{retreat.date}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Clock className="size-4 mr-2" />
                <span>{retreat.duration}</span>
              </div>
              <div className="flex items-center text-muted-foreground">
                <Users className="size-4 mr-2" />
                <span>{retreat.participants} people</span>
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
                  <span className="text-2xl font-bold">{retreat.price}</span>
                  <span className="text-muted-foreground text-sm">/ person</span>
                </div>
                <div className="flex items-center text-sm text-green-600">
                  <Tag className="size-3 mr-1" />
                  Early Bird: {retreat.earlyBird}
                </div>
              </div>
              <Button asChild size="lg">
                <Link href={`/booking?retreatId=${retreat.id}`}>Book Now</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <RetreatDetail retreat={retreat} />
    </main>
  );
}
