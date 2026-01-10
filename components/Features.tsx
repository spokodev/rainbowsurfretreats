'use client';

import {
  Heart,
  Award,
  Users,
  Globe,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useTranslations } from 'next-intl';
import { Card, CardContent } from "@/components/ui/card";
import { SeaShell, Starfish } from '@/components/illustrations';
import { illustrationOpacity } from '@/lib/animations';

const featureIcons = [Heart, Award, Users, Globe, MapPin, Sparkles];
const featureKeys = ['safe', 'instructors', 'community', 'destinations', 'wellness', 'inclusive'];

export default function Features() {
  const t = useTranslations('features');

  return (
    <section className="py-16 md:py-24 bg-muted/50 relative overflow-hidden">
      {/* Decorative Illustrations */}
      <div className="absolute inset-0 pointer-events-none">
        <SeaShell
          animated
          variant={2}
          className="absolute -top-8 -left-8 w-32 h-32 md:w-48 md:h-48 text-[var(--sand-dark)] rotate-12"
          style={{ opacity: illustrationOpacity.featuresShell }}
        />
        <Starfish
          animated
          className="absolute -bottom-8 -right-8 w-32 h-32 md:w-48 md:h-48 text-[var(--primary-teal)] -rotate-12"
          style={{ opacity: illustrationOpacity.featuresStarfish }}
        />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            {t('title')}
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {featureKeys.map((key, index) => {
            const Icon = featureIcons[index];
            return (
              <Card
                key={key}
                className="group hover:shadow-lg transition-shadow duration-300 border-none bg-background"
              >
                <CardContent className="pt-6">
                  <div className="mb-4 inline-flex items-center justify-center size-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                    <Icon className="size-6" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{t(`${key}.title`)}</h3>
                  <p className="text-muted-foreground">{t(`${key}.description`)}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
