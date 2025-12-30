import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility
export const stripe = {
  get checkout() {
    return getStripe().checkout
  },
  get paymentIntents() {
    return getStripe().paymentIntents
  },
  get webhooks() {
    return getStripe().webhooks
  },
  get customers() {
    return getStripe().customers
  },
}

// VAT rates for EU countries (as of 2024)
// Standard VAT rates - verify for current year
export const vatRates: Record<string, number> = {
  // Western Europe
  DE: 0.19, // Germany
  FR: 0.20, // France
  NL: 0.21, // Netherlands
  BE: 0.21, // Belgium
  LU: 0.17, // Luxembourg
  AT: 0.20, // Austria
  CH: 0.081, // Switzerland (not EU but common)

  // Southern Europe
  ES: 0.21, // Spain
  IT: 0.22, // Italy
  PT: 0.23, // Portugal
  GR: 0.24, // Greece
  MT: 0.18, // Malta
  CY: 0.19, // Cyprus

  // Northern Europe
  IE: 0.23, // Ireland
  GB: 0.20, // United Kingdom (post-Brexit, for reference)
  DK: 0.25, // Denmark
  SE: 0.25, // Sweden
  FI: 0.255, // Finland (25.5%)
  NO: 0.25, // Norway (not EU but common)

  // Eastern Europe
  PL: 0.23, // Poland
  CZ: 0.21, // Czech Republic
  SK: 0.20, // Slovakia
  HU: 0.27, // Hungary (highest in EU)
  RO: 0.19, // Romania
  BG: 0.20, // Bulgaria
  HR: 0.25, // Croatia
  SI: 0.22, // Slovenia
  EE: 0.22, // Estonia
  LV: 0.21, // Latvia
  LT: 0.21, // Lithuania

  // Non-EU (0% VAT for exports)
  US: 0, // United States
  CA: 0, // Canada
  AU: 0, // Australia
}

export function calculateVat(amount: number, country: string): { vatRate: number; vatAmount: number; total: number } {
  const vatRate = vatRates[country] || 0
  const vatAmount = amount * vatRate
  const total = amount + vatAmount

  return {
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
  }
}
