import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { checkAdminAuth } from '@/lib/settings'
import { countries } from '@/lib/stripe'

interface VatReportRow {
  booking_number: string
  booking_date: string
  customer_name: string
  customer_email: string
  country: string
  country_name: string
  customer_type: 'private' | 'business'
  company_name: string | null
  vat_id: string | null
  vat_id_valid: boolean
  subtotal: number
  vat_rate: number
  vat_amount: number
  total_amount: number
  is_reverse_charge: boolean
  payment_status: string
}

interface VatSummaryByCountry {
  country: string
  country_name: string
  total_sales: number
  total_vat: number
  booking_count: number
  private_customers: number
  business_customers: number
  reverse_charge_count: number
}

// GET /api/admin/reports/vat - Get VAT report data
export async function GET(request: NextRequest) {
  // Check admin auth
  const { isAdmin } = await checkAdminAuth()
  if (!isAdmin) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  const { searchParams } = new URL(request.url)
  const fromDate = searchParams.get('from')
  const toDate = searchParams.get('to')
  const format = searchParams.get('format') || 'json' // json or csv

  try {
    const supabase = await createClient()

    // Build query
    let query = supabase
      .from('bookings')
      .select(`
        booking_number,
        created_at,
        first_name,
        last_name,
        email,
        country,
        customer_type,
        company_name,
        vat_id,
        vat_id_valid,
        subtotal,
        vat_rate,
        vat_amount,
        total_amount,
        payment_status,
        status
      `)
      .in('status', ['confirmed', 'completed'])
      .order('created_at', { ascending: false })

    // Apply date filters
    if (fromDate) {
      query = query.gte('created_at', fromDate)
    }
    if (toDate) {
      query = query.lte('created_at', `${toDate}T23:59:59.999Z`)
    }

    const { data: bookings, error } = await query

    if (error) {
      console.error('Error fetching VAT report:', error)
      return NextResponse.json(
        { error: 'Failed to fetch VAT report data' },
        { status: 500 }
      )
    }

    // Get country names map
    const countryMap = new Map(countries.map(c => [c.code, c.name]))

    // Transform data
    const reportRows: VatReportRow[] = (bookings || []).map(booking => {
      const isReverseCharge =
        booking.customer_type === 'business' &&
        booking.vat_id_valid &&
        booking.vat_rate === 0

      return {
        booking_number: booking.booking_number,
        booking_date: booking.created_at.split('T')[0],
        customer_name: `${booking.first_name} ${booking.last_name}`,
        customer_email: booking.email,
        country: booking.country,
        country_name: countryMap.get(booking.country) || booking.country,
        customer_type: booking.customer_type || 'private',
        company_name: booking.company_name,
        vat_id: booking.vat_id,
        vat_id_valid: booking.vat_id_valid || false,
        subtotal: booking.subtotal,
        vat_rate: booking.vat_rate,
        vat_amount: booking.vat_amount,
        total_amount: booking.total_amount,
        is_reverse_charge: isReverseCharge,
        payment_status: booking.payment_status,
      }
    })

    // Calculate summary by country
    const summaryMap = new Map<string, VatSummaryByCountry>()

    for (const row of reportRows) {
      const existing = summaryMap.get(row.country) || {
        country: row.country,
        country_name: row.country_name,
        total_sales: 0,
        total_vat: 0,
        booking_count: 0,
        private_customers: 0,
        business_customers: 0,
        reverse_charge_count: 0,
      }

      existing.total_sales += row.subtotal
      existing.total_vat += row.vat_amount
      existing.booking_count += 1
      if (row.customer_type === 'private') {
        existing.private_customers += 1
      } else {
        existing.business_customers += 1
      }
      if (row.is_reverse_charge) {
        existing.reverse_charge_count += 1
      }

      summaryMap.set(row.country, existing)
    }

    const summaryByCountry = Array.from(summaryMap.values())
      .sort((a, b) => b.total_sales - a.total_sales)

    // Calculate totals
    const totals = {
      total_sales: reportRows.reduce((sum, r) => sum + r.subtotal, 0),
      total_vat: reportRows.reduce((sum, r) => sum + r.vat_amount, 0),
      total_revenue: reportRows.reduce((sum, r) => sum + r.total_amount, 0),
      total_bookings: reportRows.length,
      private_customers: reportRows.filter(r => r.customer_type === 'private').length,
      business_customers: reportRows.filter(r => r.customer_type === 'business').length,
      reverse_charge_transactions: reportRows.filter(r => r.is_reverse_charge).length,
    }

    if (format === 'csv') {
      // Generate CSV
      const csvHeaders = [
        'Booking Number',
        'Date',
        'Customer Name',
        'Email',
        'Country',
        'Customer Type',
        'Company Name',
        'VAT ID',
        'VAT ID Valid',
        'Subtotal (EUR)',
        'VAT Rate (%)',
        'VAT Amount (EUR)',
        'Total (EUR)',
        'Reverse Charge',
        'Payment Status',
      ].join(',')

      const csvRows = reportRows.map(row => [
        row.booking_number,
        row.booking_date,
        `"${row.customer_name}"`,
        row.customer_email,
        row.country_name,
        row.customer_type,
        row.company_name ? `"${row.company_name}"` : '',
        row.vat_id || '',
        row.vat_id_valid ? 'Yes' : 'No',
        row.subtotal.toFixed(2),
        (row.vat_rate * 100).toFixed(1),
        row.vat_amount.toFixed(2),
        row.total_amount.toFixed(2),
        row.is_reverse_charge ? 'Yes' : 'No',
        row.payment_status,
      ].join(','))

      const csv = [csvHeaders, ...csvRows].join('\n')

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="vat-report-${fromDate || 'all'}-to-${toDate || 'now'}.csv"`,
        },
      })
    }

    // Return JSON
    return NextResponse.json({
      period: {
        from: fromDate || 'all time',
        to: toDate || 'now',
      },
      totals,
      summaryByCountry,
      transactions: reportRows,
    })
  } catch (error) {
    console.error('VAT report error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
