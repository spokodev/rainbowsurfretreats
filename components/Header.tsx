'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, ChevronDown } from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { Logo } from '@/components/Logo';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n/config';

const languages = [
  { code: 'en' as Locale, label: 'English', flag: '🇺🇸' },
  { code: 'de' as Locale, label: 'Deutsch', flag: '🇩🇪' },
  { code: 'es' as Locale, label: 'Español', flag: '🇪🇸' },
  { code: 'fr' as Locale, label: 'Français', flag: '🇫🇷' },
  { code: 'nl' as Locale, label: 'Nederlands', flag: '🇳🇱' },
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations('nav');
  const currentLocale = useLocale() as Locale;
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: '/', label: t('retreats').split(' ')[0] === 'Retreats' ? 'Home' : 'Startseite' },
    { href: '/retreats', label: t('retreats') },
    { href: '/blog', label: t('blog') },
    { href: '/about', label: t('about') },
    { href: '/contact', label: t('contact') },
    { href: '/policies', label: 'Policies' },
  ];

  const handleLanguageChange = (locale: Locale) => {
    document.cookie = `locale=${locale};path=/;max-age=31536000`;
    router.refresh();
  };

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-md'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="w-32 md:w-40"
            >
              <Logo
                variant={isScrolled ? 'light' : 'dark'}
                className="w-full h-auto"
              />
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 group"
              >
                <span
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? 'text-primary'
                      : isScrolled
                        ? 'text-gray-700 hover:text-primary'
                        : 'text-white hover:text-white/80'
                  }`}
                >
                  {link.label}
                </span>
                {isActive(link.href) && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center space-x-4">
            {/* Language Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`flex items-center gap-1 ${
                    isScrolled
                      ? 'text-gray-700 hover:text-primary'
                      : 'text-white hover:text-white/80'
                  }`}
                >
                  <span className="text-base">{localeFlags[currentLocale]}</span>
                  <span className="uppercase text-xs">{currentLocale}</span>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {languages.map((lang) => (
                  <DropdownMenuItem
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={currentLocale === lang.code ? 'bg-accent' : ''}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Book Now Button */}
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button asChild variant="outline" className="border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-white">
                <Link href="/retreats">Book Now</Link>
              </Button>
            </motion.div>
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden">
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={isScrolled ? 'text-gray-700' : 'text-white'}
                >
                  <Menu className="w-6 h-6" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:w-80">
                <SheetHeader>
                  <SheetTitle>
                    <Logo variant="light" className="w-32 h-auto" />
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col mt-8 space-y-1">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`block px-4 py-3 text-lg font-medium rounded-lg transition-colors ${
                          isActive(link.href)
                            ? 'bg-primary/10 text-primary'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {link.label}
                      </Link>
                    </motion.div>
                  ))}
                </nav>

                {/* Mobile Language Selector */}
                <div className="mt-8 px-4">
                  <p className="text-sm font-medium text-gray-500 mb-2">
                    Language
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {languages.map((lang) => (
                      <Button
                        key={lang.code}
                        variant={
                          currentLocale === lang.code ? 'default' : 'outline'
                        }
                        size="sm"
                        onClick={() => handleLanguageChange(lang.code)}
                      >
                        <span className="mr-1">{lang.flag}</span>
                        {lang.label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Mobile Book Now Button */}
                <div className="mt-8 px-4">
                  <Button asChild className="w-full" size="lg">
                    <Link
                      href="/retreats"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t('bookNow')}
                    </Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
