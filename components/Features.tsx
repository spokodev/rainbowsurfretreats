import {
  Heart,
  Award,
  Users,
  Globe,
  MapPin,
  Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const features = [
  {
    icon: Heart,
    title: "LGBTQ+ Safe Space",
    description:
      "All our retreats are designed to be welcoming, inclusive, and safe for everyone in the LGBTQ+ community.",
  },
  {
    icon: Award,
    title: "Expert Coaching",
    description:
      "Learn from certified surf instructors who tailor lessons to your skill level and goals.",
  },
  {
    icon: Users,
    title: "Small Groups",
    description:
      "Intimate group sizes ensure personalized attention and meaningful connections with fellow travelers.",
  },
  {
    icon: Globe,
    title: "Global Community",
    description:
      "Join a worldwide network of LGBTQ+ surf enthusiasts and make lifelong friends.",
  },
  {
    icon: MapPin,
    title: "Premium Locations",
    description:
      "Surf the best waves at handpicked destinations known for both their breaks and LGBTQ+ friendliness.",
  },
  {
    icon: Sparkles,
    title: "All-Inclusive",
    description:
      "Accommodation, meals, equipment, and coaching included. Just show up and enjoy the ride.",
  },
];

export default function Features() {
  return (
    <section className="py-16 md:py-24 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose Rainbow Surf Retreats
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            We create unforgettable experiences that combine the thrill of
            surfing with the warmth of an inclusive community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="group hover:shadow-lg transition-shadow duration-300 border-none bg-background"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
