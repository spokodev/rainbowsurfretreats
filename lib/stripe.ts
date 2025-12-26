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

// VAT rates for EU countries
export const vatRates: Record<string, number> = {
  DE: 0.19, // Germany
  FR: 0.20, // France
  ES: 0.21, // Spain
  IT: 0.22, // Italy
  PT: 0.23, // Portugal
  NL: 0.21, // Netherlands
  BE: 0.21, // Belgium
  AT: 0.20, // Austria
  IE: 0.23, // Ireland
  PL: 0.23, // Poland
  // Add more as needed
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
