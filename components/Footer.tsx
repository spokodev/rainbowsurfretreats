import Link from 'next/link';
import { Instagram, Facebook, Youtube } from 'lucide-react';
import { Logo } from '@/components/Logo';

const destinations = [
  { href: '/retreats/bali', label: 'Bali' },
  { href: '/retreats/morocco', label: 'Morocco' },
  { href: '/retreats/portugal', label: 'Portugal' },
  { href: '/retreats/sri-lanka', label: 'Sri Lanka' },
  { href: '/retreats/costa-rica', label: 'Costa Rica' },
];

const companyLinks = [
  { href: '/about', label: 'About Us' },
  { href: '/blog', label: 'Blog' },
  { href: '/contact', label: 'Contact' },
];

const legalLinks = [
  { href: '/policies', label: 'Policies' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/terms', label: 'Terms of Service' },
];

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
  const currentYear = new Date().getFullYear();

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
              Transformative surf and wellness retreats in the world&apos;s most
              beautiful destinations. Find your wave, find yourself.
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
            <h3 className="text-white font-semibold mb-4">Destinations</h3>
            <ul className="space-y-2">
              {destinations.map((destination) => (
                <li key={destination.href}>
                  <Link
                    href={destination.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {destination.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-white font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              {companyLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-white font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {link.label}
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
              &copy; {currentYear} Rainbow Surf Retreats. All rights reserved.
            </p>
            <div className="flex items-center space-x-6">
              <Link
                href="/privacy"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Terms
              </Link>
              <Link
                href="/cookies"
                className="text-sm text-gray-500 hover:text-white transition-colors"
              >
                Cookies
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
