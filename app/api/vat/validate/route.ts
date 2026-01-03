import { NextRequest, NextResponse } from 'next/server'
import { isEUCountry, EU_COUNTRIES } from '@/lib/stripe'

// VAT ID format patterns for EU countries
const vatPatterns: Record<string, RegExp> = {
  AT: /^ATU\d{8}$/,
  BE: /^BE[01]\d{9}$/,
  BG: /^BG\d{9,10}$/,
  HR: /^HR\d{11}$/,
  CY: /^CY\d{8}[A-Z]$/,
  CZ: /^CZ\d{8,10}$/,
  DK: /^DK\d{8}$/,
  EE: /^EE\d{9}$/,
  FI: /^FI\d{8}$/,
  FR: /^FR[A-HJ-NP-Z0-9]{2}\d{9}$/,
  DE: /^DE\d{9}$/,
  GR: /^EL\d{9}$/,  // Greece uses EL prefix
  HU: /^HU\d{8}$/,
  IE: /^IE\d{7}[A-W][A-IW]?$|^IE\d[A-Z+*]\d{5}[A-W]$/,
  IT: /^IT\d{11}$/,
  LV: /^LV\d{11}$/,
  LT: /^LT(\d{9}|\d{12})$/,
  LU: /^LU\d{8}$/,
  MT: /^MT\d{8}$/,
  NL: /^NL\d{9}B\d{2}$/,
  PL: /^PL\d{10}$/,
  PT: /^PT\d{9}$/,
  RO: /^RO\d{2,10}$/,
  SK: /^SK\d{10}$/,
  SI: /^SI\d{8}$/,
  ES: /^ES[A-Z0-9]\d{7}[A-Z0-9]$/,
  SE: /^SE\d{12}$/,
}

interface VatValidationRequest {
  vatId: string
  country: string
}

interface ViesResponse {
  valid: boolean
  name?: string
  address?: string
  countryCode?: string
  vatNumber?: string
  requestDate?: string
}

/**
 * Validate VAT ID format (local validation)
 */
function validateVatFormat(vatId: string, country: string): { valid: boolean; error?: string } {
  // Normalize VAT ID
  const normalizedVatId = vatId.replace(/\s/g, '').toUpperCase()

  // Check if country is EU
  if (!isEUCountry(country)) {
    return { valid: false, error: 'VAT ID validation is only available for EU countries' }
  }

  // Get the expected prefix (Greece uses EL instead of GR)
  const expectedPrefix = country === 'GR' ? 'EL' : country

  // Check if VAT ID starts with correct country code
  if (!normalizedVatId.startsWith(expectedPrefix)) {
    return { valid: false, error: `VAT ID should start with ${expectedPrefix}` }
  }

  // Check pattern
  const pattern = vatPatterns[country]
  if (pattern && !pattern.test(normalizedVatId)) {
    return { valid: false, error: `Invalid VAT ID format for ${country}` }
  }

  return { valid: true }
}

/**
 * Validate VAT ID against EU VIES service
 * https://ec.europa.eu/taxation_customs/vies/
 */
async function validateVatWithVies(vatId: string, country: string): Promise<ViesResponse> {
  const normalizedVatId = vatId.replace(/\s/g, '').toUpperCase()

  // Extract country code and number
  const countryCode = country === 'GR' ? 'EL' : country
  const vatNumber = normalizedVatId.startsWith(countryCode)
    ? normalizedVatId.slice(countryCode.length)
    : normalizedVatId

  try {
    // Use the VIES SOAP API
    // Note: In production, you might want to use a library like 'vies-validate' or make proper SOAP calls
    // For now, we'll use a simplified approach with the REST-like endpoint

    const soapEnvelope = `
      <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
        <soapenv:Header/>
        <soapenv:Body>
          <urn:checkVat>
            <urn:countryCode>${countryCode}</urn:countryCode>
            <urn:vatNumber>${vatNumber}</urn:vatNumber>
          </urn:checkVat>
        </soapenv:Body>
      </soapenv:Envelope>
    `

    const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
        'SOAPAction': '',
      },
      body: soapEnvelope,
    })

    if (!response.ok) {
      console.error('VIES API error:', response.status, response.statusText)
      // If VIES is unavailable, fall back to format validation only
      return { valid: true } // Be permissive if VIES is down
    }

    const xmlText = await response.text()

    // Parse the XML response (handle namespace prefixes like ns2:valid)
    const validMatch = xmlText.match(/<(?:\w+:)?valid>(\w+)<\/(?:\w+:)?valid>/i)
    const nameMatch = xmlText.match(/<(?:\w+:)?name>([^<]*)<\/(?:\w+:)?name>/i)
    const addressMatch = xmlText.match(/<(?:\w+:)?address>([^<]*)<\/(?:\w+:)?address>/i)

    const isValid = validMatch ? validMatch[1].toLowerCase() === 'true' : false

    return {
      valid: isValid,
      name: nameMatch ? nameMatch[1] : undefined,
      address: addressMatch ? addressMatch[1] : undefined,
      countryCode,
      vatNumber,
      requestDate: new Date().toISOString(),
    }
  } catch (error) {
    console.error('VIES validation error:', error)
    // If VIES is unavailable, fall back to format validation only
    // In production, you might want to queue this for retry
    return { valid: true }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VatValidationRequest = await request.json()
    const { vatId, country } = body

    // Validate required fields
    if (!vatId || !country) {
      return NextResponse.json(
        { valid: false, error: 'VAT ID and country are required' },
        { status: 400 }
      )
    }

    // Normalize inputs
    const normalizedVatId = vatId.trim().toUpperCase()
    const normalizedCountry = country.toUpperCase()

    // Check if country is in EU
    if (!EU_COUNTRIES.includes(normalizedCountry as typeof EU_COUNTRIES[number])) {
      return NextResponse.json(
        { valid: false, error: 'VAT ID validation is only available for EU countries' },
        { status: 400 }
      )
    }

    // First, validate format locally (faster)
    const formatValidation = validateVatFormat(normalizedVatId, normalizedCountry)
    if (!formatValidation.valid) {
      return NextResponse.json({
        valid: false,
        error: formatValidation.error,
        formatValid: false,
      })
    }

    // Then, validate with VIES API
    const viesResult = await validateVatWithVies(normalizedVatId, normalizedCountry)

    if (viesResult.valid) {
      return NextResponse.json({
        valid: true,
        vatId: normalizedVatId,
        country: normalizedCountry,
        companyName: viesResult.name || undefined,
        companyAddress: viesResult.address || undefined,
        validatedAt: new Date().toISOString(),
      })
    } else {
      return NextResponse.json({
        valid: false,
        error: 'VAT ID not found in EU VIES database. Please check the number and try again.',
        formatValid: true,
      })
    }
  } catch (error) {
    console.error('VAT validation error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to validate VAT ID' },
      { status: 500 }
    )
  }
}
