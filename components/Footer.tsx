'use client';

import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/Logo';

const destinationKeys = ['bali', 'morocco', 'portugal', 'sriLanka', 'panama'] as const;

const socialLinks = [
  {
    href: 'https://instagram.com/rainbowsurfretreats',
    icon: Instagram,
    label: 'Instagram',
  },
  {
    href: 'https://facebook.com/rainbowsurfretreats',
    icon: Facebook,
    label: 'Facebook',
  },
  {
    href: 'https://youtube.com/@rainbowsurfretreats',
    icon: Youtube,
    label: 'YouTube',
  },
];

export default function Footer() {
  const t = useTranslations('footer');
  const tDestinations = useTranslations('destinations');
  const currentYear = new Date().getFullYear();

  const companyLinks = [
    { href: '/about', labelKey: 'aboutUs' },
    { href: '/blog', labelKey: 'blog' },
    { href: '/contact', labelKey: 'contact' },
  ];

  const legalLinks = [
    { href: '/policies', labelKey: 'policies' },
    { href: '/privacy', labelKey: 'privacyPolicy' },
    { href: '/terms', labelKey: 'termsOfService' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo and Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Logo variant="dark" className="w-40 h-auto" />
            </Link>
            <p className="text-sm text-gray-400 mb-6 max-w-xs">
              {t('tagline')}
            </p>
            {/* Social Links */}
            <div className="flex items-center space-x-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 hover:bg-primary hover:text-white transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Destinations */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('destinations')}</h3>
            <ul className="space-y-2">
              {destinationKeys.map((key) => (
                <li key={key}>
                  <Link
                    href={`/retreats/${key.toLowerCase().replace('lanka', '-lanka')}`}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {tDestinations(key)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('company')}</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('legal')}</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {t(link.labelKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              {t('copyright', { year: currentYear })}
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                {t('privacy')}
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                {t('terms')}
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                {t('cookies')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
