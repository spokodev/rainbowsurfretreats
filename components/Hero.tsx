'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, Calendar, Compass } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { HOME_SLIDER } from '@/lib/images';
import { Button } from '@/components/ui/button';
import { AnimatedCounter } from '@/components/AnimatedCounter';
import ImageWithFallback from '@/components/ImageWithFallback';

const sliderImages = [
  { src: HOME_SLIDER.silhouetteSunset, alt: 'Surfer silhouette at sunset' },
  { src: HOME_SLIDER.surfersSunset, alt: 'Surfers enjoying sunset' },
  { src: HOME_SLIDER.surfersWaves, alt: 'Surfers riding waves' },
];

export default function Hero() {
  const t = useTranslations('hero');

  const stats = [
    { value: 500, suffix: '+', labelKey: 'stats.surfers' },
    { value: 5, suffix: '', labelKey: 'stats.countries' },
    { value: 10, suffix: '+', labelKey: 'stats.retreats' },
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
          {/* Main Heading */}
          <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            {t('title').split(',')[0]},{' '}
            <span className="bg-gradient-to-r from-red-500 via-yellow-400 via-green-500 to-blue-500 bg-clip-text text-transparent italic">
              {t('title').split(',')[1]?.trim() || t('title')}
            </span>
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="mx-auto mb-8 max-w-2xl text-lg text-white/90 sm:text-xl"
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
              className="bg-teal-600 px-8 py-6 text-lg font-semibold hover:bg-teal-700"
            >
              <Link href="/retreats" className="flex items-center">
                <Calendar className="mr-2 h-5 w-5" />
                {t('cta')}
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-white/50 bg-white/10 px-8 py-6 text-lg font-semibold text-white backdrop-blur-sm hover:bg-white/20"
            >
              <Link href="/destinations" className="flex items-center">
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
          className="mt-16 grid grid-cols-3 gap-8 sm:gap-16"
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
