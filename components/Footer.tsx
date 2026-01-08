'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Logo } from '@/components/Logo';

interface FooterRetreat {
  id: string;
  slug: string;
  destination: string;
  start_date: string;
  availability_status: 'available' | 'sold_out' | 'few_spots';
}

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
  const currentYear = new Date().getFullYear();
  const [upcomingRetreats, setUpcomingRetreats] = useState<FooterRetreat[]>([]);

  useEffect(() => {
    async function fetchUpcomingRetreats() {
      try {
        const response = await fetch('/api/retreats?published=true');
        const data = await response.json();
        if (data.data) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);

          // Filter: future retreats, not sold out, limit 5
          const filtered = data.data
            .filter((retreat: FooterRetreat) => {
              const startDate = new Date(retreat.start_date);
              return startDate >= now && retreat.availability_status !== 'sold_out';
            })
            .slice(0, 5);

          setUpcomingRetreats(filtered);
        }
      } catch (error) {
        console.error('Failed to fetch retreats for footer:', error);
      }
    }
    fetchUpcomingRetreats();
  }, []);

  const companyLinks = [
    { href: '/about', labelKey: 'aboutUs' },
    { href: '/blog', labelKey: 'blog' },
    { href: '/contact', labelKey: 'contact' },
  ];

  const legalLinks = [
    { href: '/policies', labelKey: 'policies' },
    { href: '/privacy-policy', labelKey: 'privacyPolicy' },
    { href: '/terms', labelKey: 'termsOfService' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Logo and Description */}
          <div className="lg:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <Logo variant="light" className="w-40 h-auto" />
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

          {/* Upcoming Retreats */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('upcomingRetreats')}</h3>
            <ul className="space-y-2">
              {upcomingRetreats.length > 0 ? (
                upcomingRetreats.map((retreat) => (
                  <li key={retreat.id}>
                    <Link
                      href={`/retreats/${retreat.slug}`}
                      className="text-sm text-gray-400 hover:text-white transition-colors"
                    >
                      {retreat.destination}
                    </Link>
                  </li>
                ))
              ) : (
                <li className="text-sm text-gray-500">{t('noUpcomingRetreats')}</li>
              )}
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
                href="/privacy-policy"
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
