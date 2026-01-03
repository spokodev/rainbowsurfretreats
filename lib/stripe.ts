import Stripe from 'stripe'

let stripeInstance: Stripe | null = null

export function getStripe(): Stripe {
  if (!stripeInstance) {
    const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
    if (!stripeKey) {
      throw new Error('Missing STRIPE_SECRET_KEY environment variable')
    }
    stripeInstance = new Stripe(stripeKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    })
  }
  return stripeInstance
}

// For backwards compatibility and easy access
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
  get billingPortal() {
    return getStripe().billingPortal
  },
  get paymentLinks() {
    return getStripe().paymentLinks
  },
  get refunds() {
    return getStripe().refunds
  },
}

// Company's country of registration (Cyprus)
// Used for reverse charge logic: if customer is from same country, VAT still applies
export const COMPANY_COUNTRY = 'CY'

// EU member states (for VAT purposes)
export const EU_COUNTRIES = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
] as const

export type EUCountryCode = typeof EU_COUNTRIES[number]

// Check if a country is in the EU
export function isEUCountry(countryCode: string): boolean {
  return EU_COUNTRIES.includes(countryCode as EUCountryCode)
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

  // Southern Europe
  ES: 0.21, // Spain
  IT: 0.22, // Italy
  PT: 0.23, // Portugal
  GR: 0.24, // Greece
  MT: 0.18, // Malta
  CY: 0.19, // Cyprus

  // Northern Europe
  IE: 0.23, // Ireland
  DK: 0.25, // Denmark
  SE: 0.25, // Sweden
  FI: 0.255, // Finland (25.5%)

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

  // Non-EU countries (0% VAT for exports)
  // Note: GB is post-Brexit, treated as non-EU
  GB: 0, // United Kingdom
  CH: 0, // Switzerland
  NO: 0, // Norway
  US: 0, // United States
  CA: 0, // Canada
  AU: 0, // Australia
  NZ: 0, // New Zealand
  UA: 0, // Ukraine
  IL: 0, // Israel
  BR: 0, // Brazil
  MX: 0, // Mexico
  JP: 0, // Japan
  KR: 0, // South Korea
  SG: 0, // Singapore
  AE: 0, // United Arab Emirates
  ZA: 0, // South Africa
}

// Full country list with names for UI
export const countries: { code: string; name: string; isEU: boolean }[] = [
  // EU Countries (alphabetical)
  { code: 'AT', name: 'Austria', isEU: true },
  { code: 'BE', name: 'Belgium', isEU: true },
  { code: 'BG', name: 'Bulgaria', isEU: true },
  { code: 'HR', name: 'Croatia', isEU: true },
  { code: 'CY', name: 'Cyprus', isEU: true },
  { code: 'CZ', name: 'Czech Republic', isEU: true },
  { code: 'DK', name: 'Denmark', isEU: true },
  { code: 'EE', name: 'Estonia', isEU: true },
  { code: 'FI', name: 'Finland', isEU: true },
  { code: 'FR', name: 'France', isEU: true },
  { code: 'DE', name: 'Germany', isEU: true },
  { code: 'GR', name: 'Greece', isEU: true },
  { code: 'HU', name: 'Hungary', isEU: true },
  { code: 'IE', name: 'Ireland', isEU: true },
  { code: 'IT', name: 'Italy', isEU: true },
  { code: 'LV', name: 'Latvia', isEU: true },
  { code: 'LT', name: 'Lithuania', isEU: true },
  { code: 'LU', name: 'Luxembourg', isEU: true },
  { code: 'MT', name: 'Malta', isEU: true },
  { code: 'NL', name: 'Netherlands', isEU: true },
  { code: 'PL', name: 'Poland', isEU: true },
  { code: 'PT', name: 'Portugal', isEU: true },
  { code: 'RO', name: 'Romania', isEU: true },
  { code: 'SK', name: 'Slovakia', isEU: true },
  { code: 'SI', name: 'Slovenia', isEU: true },
  { code: 'ES', name: 'Spain', isEU: true },
  { code: 'SE', name: 'Sweden', isEU: true },
  // Non-EU Countries (popular destinations)
  { code: 'GB', name: 'United Kingdom', isEU: false },
  { code: 'CH', name: 'Switzerland', isEU: false },
  { code: 'NO', name: 'Norway', isEU: false },
  { code: 'US', name: 'United States', isEU: false },
  { code: 'CA', name: 'Canada', isEU: false },
  { code: 'AU', name: 'Australia', isEU: false },
  { code: 'NZ', name: 'New Zealand', isEU: false },
  { code: 'UA', name: 'Ukraine', isEU: false },
  { code: 'IL', name: 'Israel', isEU: false },
  { code: 'BR', name: 'Brazil', isEU: false },
  { code: 'MX', name: 'Mexico', isEU: false },
  { code: 'JP', name: 'Japan', isEU: false },
  { code: 'KR', name: 'South Korea', isEU: false },
  { code: 'SG', name: 'Singapore', isEU: false },
  { code: 'AE', name: 'United Arab Emirates', isEU: false },
  { code: 'ZA', name: 'South Africa', isEU: false },
]

export interface VatCalculationResult {
  vatRate: number
  vatAmount: number
  total: number
  isReverseCharge: boolean
}

export interface VatCalculationOptions {
  amount: number
  country: string
  customerType?: 'private' | 'business'
  vatIdValid?: boolean
}

/**
 * Calculate VAT for a transaction
 *
 * Logic:
 * - EU private customers: standard VAT rate for their country
 * - EU business with valid VAT ID from different country: 0% (reverse charge)
 * - EU business with valid VAT ID from Cyprus (same country): standard rate
 * - Non-EU customers: 0%
 */
export function calculateVat(
  amountOrOptions: number | VatCalculationOptions,
  countryArg?: string
): VatCalculationResult {
  // Support both old signature (amount, country) and new signature (options)
  let amount: number
  let country: string
  let customerType: 'private' | 'business' = 'private'
  let vatIdValid = false

  if (typeof amountOrOptions === 'object') {
    amount = amountOrOptions.amount
    country = amountOrOptions.country
    customerType = amountOrOptions.customerType || 'private'
    vatIdValid = amountOrOptions.vatIdValid || false
  } else {
    amount = amountOrOptions
    country = countryArg || ''
  }

  let vatRate = vatRates[country] || 0
  let isReverseCharge = false

  // B2B reverse charge logic:
  // If customer is a business with valid VAT ID and from a different EU country,
  // apply 0% VAT (reverse charge mechanism)
  if (customerType === 'business' && vatIdValid && isEUCountry(country)) {
    // Same country = normal VAT (Cyprus business selling to Cyprus business)
    // Different EU country = reverse charge (0%)
    if (country !== COMPANY_COUNTRY) {
      vatRate = 0
      isReverseCharge = true
    }
  }

  const vatAmount = amount * vatRate
  const total = amount + vatAmount

  return {
    vatRate,
    vatAmount: Math.round(vatAmount * 100) / 100,
    total: Math.round(total * 100) / 100,
    isReverseCharge,
  }
}

/**
 * Get VAT rate for display purposes (before B2B validation)
 * Used in checkout form to show expected VAT
 */
export function getDisplayVatRate(country: string): number {
  return vatRates[country] || 0
}
