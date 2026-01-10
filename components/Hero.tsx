'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Users, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HOME_SLIDER } from '@/lib/images';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import ImageWithFallback from '@/components/ImageWithFallback';
import { Logo } from '@/components/Logo';
import { SunBurst, Bird, WavePattern, Palm } from '@/components/illustrations';
import { illustrationOpacity } from '@/lib/animations';

// Default slider images (fallback)
const defaultSliderImages = [
  { src: HOME_SLIDER.silhouetteSunset, alt: 'Surfer silhouette at sunset' },
  { src: HOME_SLIDER.surfersSunset, alt: 'Surfers enjoying sunset' },
  { src: HOME_SLIDER.surfersWaves, alt: 'Surfers riding waves' },
];

interface SliderImage {
  url: string;
  alt: string;
  sort_order: number;
}

interface HeroProps {
  sliderImages?: SliderImage[];
}

export default function Hero({ sliderImages: propImages }: HeroProps) {
  // Convert prop images to the format used by the component, or use defaults
  const sliderImages = propImages && propImages.length > 0
    ? propImages.map(img => ({ src: img.url, alt: img.alt }))
    : defaultSliderImages;
  const t = useTranslations('hero');

  const stats = [
    { value: 500, suffix: '+', labelKey: 'stats.surfers' },
    { value: 7, suffix: '', labelKey: 'stats.destinations' },
    { value: 5, suffix: '+', labelKey: 'stats.experience' },
  ];
  const [currentSlide, setCurrentSlide] = useState(0);

  // Auto-advance slider
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % sliderImages.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const scrollToRetreats = () => {
    const retreatsSection = document.getElementById('retreats');
    if (retreatsSection) {
      retreatsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="relative h-screen w-full overflow-hidden">
      {/* Image Slider */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <ImageWithFallback
            src={sliderImages[currentSlide].src}
            alt={sliderImages[currentSlide].alt}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-black/60" />
        </motion.div>
      </AnimatePresence>

      {/* Decorative Illustrations */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-[5]">
        {/* Sun - Top Left */}
        <SunBurst
          animated
          className="absolute -top-16 -left-16 w-48 h-48 md:w-64 md:h-64 text-white"
          style={{ opacity: illustrationOpacity.heroSun }}
        />
        {/* Bird - Top Right */}
        <Bird
          animated
          className="absolute top-20 right-8 md:right-16 w-16 h-16 md:w-24 md:h-24 text-white"
          style={{ opacity: illustrationOpacity.heroBird }}
        />
        {/* Wave - Bottom */}
        <WavePattern
          variant={2}
          animated
          className="absolute -bottom-4 left-0 right-0 h-24 md:h-32 text-white"
          style={{ opacity: illustrationOpacity.heroWave }}
        />
        {/* Palm - Bottom Right */}
        <Palm
          animated
          className="absolute -bottom-8 -right-8 h-48 md:h-64 text-white hidden lg:block"
          style={{ opacity: illustrationOpacity.palm }}
        />
      </div>

      {/* Slide Indicators */}
      <div className="absolute bottom-32 left-1/2 z-10 flex -translate-x-1/2 gap-2">
        {sliderImages.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentSlide(index)}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 bg-white'
                : 'w-2 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-full flex-col items-center justify-center px-4 text-center text-white">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="max-w-4xl"
        >
          {/* Logo with visually hidden h1 for SEO/accessibility */}
          <div className="mb-8 mx-auto w-full max-w-md">
            <h1 className="sr-only">Rainbow Surf Retreats - LGBTQ+ Surf Adventures</h1>
            <Logo variant="light" className="w-full h-auto" />
          </div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-white/90 sm:text-xl leading-relaxed"
          >
            {t('subtitle')} 🌈
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Button
              asChild
              size="lg"
              className="bg-[var(--primary-teal)] px-8 py-6 text-base font-semibold text-white hover:bg-[var(--primary-teal-hover)]"
            >
              <Link href="/about" className="flex items-center">
                <Users className="mr-2 h-5 w-5" />
                {t('cta')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/50 bg-white/10 px-8 py-6 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Link href="/retreats" className="flex items-center">
                <Compass className="mr-2 h-5 w-5" />
                {t('explore')}
              </Link>
            </Button>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-16"
        >
          {stats.map((stat) => (
            <div key={stat.labelKey} className="text-center">
              <div className="text-3xl font-bold sm:text-4xl md:text-5xl">
                <AnimatedCounter
                  value={stat.value}
                  suffix={stat.suffix}
                  duration={2}
                />
              </div>
              <div className="mt-1 text-sm text-white/80 sm:text-base">
                {t(stat.labelKey)}
              </div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.2 }}
        onClick={scrollToRetreats}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/80 transition-colors hover:text-white"
        aria-label="Scroll to retreats"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <ChevronDown className="h-8 w-8" />
        </motion.div>
      </motion.button>
    </section>
  );
}
