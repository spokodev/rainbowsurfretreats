import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

let resendInstance: Resend | null = null

export function getResend(): Resend {
  if (!resendInstance) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY is not configured')
    }
    resendInstance = new Resend(apiKey)
  }
  return resendInstance
}

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// ==========================================
// EMAIL AUDIT LOGGING
// ==========================================

export interface EmailLogData {
  emailType: string
  recipientEmail: string
  recipientType: 'customer' | 'admin'
  subject: string
  bookingId?: string | null
  paymentId?: string | null
  resendEmailId?: string | null
  status: 'sent' | 'failed'
  errorMessage?: string | null
  metadata?: Record<string, unknown>
  htmlContent?: string | null
}

/**
 * Log an email to the audit log table
 * Called after each email send attempt (success or failure)
 */
export async function logEmailSent(data: EmailLogData): Promise<void> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('email_audit_log').insert({
      email_type: data.emailType,
      recipient_email: data.recipientEmail,
      recipient_type: data.recipientType,
      subject: data.subject,
      booking_id: data.bookingId || null,
      payment_id: data.paymentId || null,
      resend_email_id: data.resendEmailId || null,
      status: data.status,
      error_message: data.errorMessage || null,
      metadata: data.metadata || {},
      html_content: data.htmlContent || null,
    })

    if (error) {
      console.error('Failed to log email to audit table:', error)
    }
  } catch (error) {
    // Don't throw - logging should not break email sending
    console.error('Error logging email:', error)
  }
}

export const FROM_EMAIL = process.env.FROM_EMAIL || 'Rainbow Surf Retreats <noreply@rainbowsurfretreats.spoko.dev>'
export const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'spoko.dev@gmail.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// BUG-020 FIX: Translated email subjects for all email types
// Used as fallback when database templates are not available
type SupportedLanguage = 'en' | 'de' | 'es' | 'fr' | 'nl'

export const emailSubjectTranslations: Record<SupportedLanguage, Record<string, string>> = {
  en: {
    bookingConfirmed: 'Booking Confirmed',
    paymentReceived: 'Payment Received',
    paymentFailed: 'Action Required: Payment Failed',
    paymentReminder: 'Payment Reminder',
    retreatReminder: 'Days Until Your Surf Retreat',
    bookingCancelled: 'Booking Cancelled',
    refundProcessed: 'Refund Processed',
    bookingRestored: 'Your booking has been restored',
    waitlistJoined: "You're on the Waitlist",
    waitlistSpotAvailable: 'A Spot is Available!',
    waitlistBookingReminder: 'Complete Your Booking',
    waitlistCancelled: "We'll Miss You",
    waitlistExpired: 'Waitlist Offer Expired',
    allPaymentsComplete: 'All payments complete',
  },
  de: {
    bookingConfirmed: 'Buchung bestätigt',
    paymentReceived: 'Zahlung erhalten',
    paymentFailed: 'Handlung erforderlich: Zahlung fehlgeschlagen',
    paymentReminder: 'Zahlungserinnerung',
    retreatReminder: 'Tage bis zu Ihrem Surf-Retreat',
    bookingCancelled: 'Buchung storniert',
    refundProcessed: 'Rückerstattung bearbeitet',
    bookingRestored: 'Ihre Buchung wurde wiederhergestellt',
    waitlistJoined: 'Sie sind auf der Warteliste',
    waitlistSpotAvailable: 'Ein Platz ist verfügbar!',
    waitlistBookingReminder: 'Schließen Sie Ihre Buchung ab',
    waitlistCancelled: 'Wir werden Sie vermissen',
    waitlistExpired: 'Wartelisten-Angebot abgelaufen',
    allPaymentsComplete: 'Alle Zahlungen abgeschlossen',
  },
  es: {
    bookingConfirmed: 'Reserva confirmada',
    paymentReceived: 'Pago recibido',
    paymentFailed: 'Acción requerida: Pago fallido',
    paymentReminder: 'Recordatorio de pago',
    retreatReminder: 'Días hasta tu retiro de surf',
    bookingCancelled: 'Reserva cancelada',
    refundProcessed: 'Reembolso procesado',
    bookingRestored: 'Tu reserva ha sido restaurada',
    waitlistJoined: 'Estás en la lista de espera',
    waitlistSpotAvailable: '¡Un lugar está disponible!',
    waitlistBookingReminder: 'Completa tu reserva',
    waitlistCancelled: 'Te echaremos de menos',
    waitlistExpired: 'Oferta de lista de espera expirada',
    allPaymentsComplete: 'Todos los pagos completados',
  },
  fr: {
    bookingConfirmed: 'Réservation confirmée',
    paymentReceived: 'Paiement reçu',
    paymentFailed: 'Action requise: Paiement échoué',
    paymentReminder: 'Rappel de paiement',
    retreatReminder: 'Jours avant votre retraite de surf',
    bookingCancelled: 'Réservation annulée',
    refundProcessed: 'Remboursement traité',
    bookingRestored: 'Votre réservation a été restaurée',
    waitlistJoined: 'Vous êtes sur la liste d\'attente',
    waitlistSpotAvailable: 'Une place est disponible!',
    waitlistBookingReminder: 'Complétez votre réservation',
    waitlistCancelled: 'Vous nous manquerez',
    waitlistExpired: 'Offre de liste d\'attente expirée',
    allPaymentsComplete: 'Tous les paiements effectués',
  },
  nl: {
    bookingConfirmed: 'Boeking bevestigd',
    paymentReceived: 'Betaling ontvangen',
    paymentFailed: 'Actie vereist: Betaling mislukt',
    paymentReminder: 'Betalingsherinnering',
    retreatReminder: 'Dagen tot je surf retreat',
    bookingCancelled: 'Boeking geannuleerd',
    refundProcessed: 'Terugbetaling verwerkt',
    bookingRestored: 'Je boeking is hersteld',
    waitlistJoined: 'Je staat op de wachtlijst',
    waitlistSpotAvailable: 'Er is een plek beschikbaar!',
    waitlistBookingReminder: 'Voltooi je boeking',
    waitlistCancelled: 'We zullen je missen',
    waitlistExpired: 'Wachtlijst-aanbieding verlopen',
    allPaymentsComplete: 'Alle betalingen voltooid',
  },
}

// Helper to get translated subject with fallback to English
export function getTranslatedSubject(key: string, language: string = 'en'): string {
  const lang = (language as SupportedLanguage) in emailSubjectTranslations
    ? (language as SupportedLanguage)
    : 'en'
  return emailSubjectTranslations[lang][key] || emailSubjectTranslations.en[key] || key
}

// XSS Prevention: Escape HTML entities in user-provided data
export function escapeHtml(unsafe: string | null | undefined): string {
  if (unsafe === null || unsafe === undefined) return ''
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
  // Logging context (optional - if provided, email will be logged to audit table)
  logContext?: {
    emailType: string
    recipientType: 'customer' | 'admin'
    bookingId?: string | null
    paymentId?: string | null
    metadata?: Record<string, unknown>
  }
}

export interface SendEmailResult {
  id: string | null
  success: boolean
}

export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const resend = getResend()
  const recipientEmail = Array.isArray(options.to) ? options.to[0] : options.to

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      replyTo: options.replyTo || REPLY_TO_EMAIL,
    })

    if (error) {
      console.error('Email send error:', error)

      // Log failure if context provided
      if (options.logContext) {
        await logEmailSent({
          emailType: options.logContext.emailType,
          recipientEmail,
          recipientType: options.logContext.recipientType,
          subject: options.subject,
          bookingId: options.logContext.bookingId,
          paymentId: options.logContext.paymentId,
          status: 'failed',
          errorMessage: error.message,
          metadata: options.logContext.metadata,
          htmlContent: options.html,
        })
      }

      throw new Error(error.message)
    }

    console.log('Email sent successfully:', data?.id)

    // Log success if context provided
    if (options.logContext) {
      await logEmailSent({
        emailType: options.logContext.emailType,
        recipientEmail,
        recipientType: options.logContext.recipientType,
        subject: options.subject,
        bookingId: options.logContext.bookingId,
        paymentId: options.logContext.paymentId,
        resendEmailId: data?.id || null,
        status: 'sent',
        metadata: options.logContext.metadata,
        htmlContent: options.html,
      })
    }

    return { id: data?.id || null, success: true }
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

// Template rendering with XSS protection
// Variables that should NOT be escaped (contain safe HTML or URLs):
const SAFE_VARIABLES = new Set([
  'content', 'htmlContent', 'unsubscribeLink', 'viewInBrowser',
  'myBookingUrl', 'updatePaymentUrl', 'paymentLinkUrl', 'adminDashboardUrl',
  'payNowUrl', 'paymentScheduleHtml', 'siteUrl',
  // Waitlist URLs
  'acceptUrl', 'declineUrl', 'bookingUrl', 'waitlistUrl'
])

function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template

  // Handle {{#if variable}}...{{/if}} conditionals
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, variable, content) => {
    return data[variable] ? content : ''
  })

  // Handle {{variable}} replacements with XSS protection
  result = result.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
    const value = data[variable]
    if (value === undefined || value === null) return ''

    // Don't escape safe variables (URLs, pre-sanitized HTML)
    if (SAFE_VARIABLES.has(variable)) {
      return String(value)
    }

    // Escape user-provided content to prevent XSS
    return escapeHtml(String(value))
  })

  return result
}

// Email layout wrapper
export function wrapInLayout(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rainbow Surf Retreats</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .content h2 { color: #0ea5e9; margin-top: 0; }
    .highlight-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .amount { font-size: 24px; font-weight: 700; color: #0ea5e9; }
    .button { display: inline-block; background: #0ea5e9; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px; }
    .footer a { color: #0ea5e9; text-decoration: none; }
    .divider { height: 1px; background: #e2e8f0; margin: 30px 0; }
    @media only screen and (max-width: 600px) {
      .content { padding: 20px 15px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rainbow Surf Retreats</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Rainbow Surf Retreats</strong></p>
      <p>Catch the perfect wave, find your inner peace</p>
      <div class="divider" style="background: #374151;"></div>
      <p style="font-size: 12px;">
        <a href="${SITE_URL}/privacy-policy">Privacy Policy</a> |
        <a href="${SITE_URL}/policies">Terms & Conditions</a>
      </p>
      <p style="font-size: 12px; color: #64748b;">
        You received this email because you made a booking with Rainbow Surf Retreats.<br>
        If you have any questions, please contact us at <a href="mailto:info@rainbowsurfretreats.com">info@rainbowsurfretreats.com</a>
      </p>
    </div>
  </div>
</body>
</html>
`
}

// Get template from database with fallback to hardcoded
async function getTemplate(slug: string, language: string = 'en'): Promise<{ subject: string; html_content: string } | null> {
  try {
    const supabase = getSupabase()

    // First try to get template in requested language
    let { data, error } = await supabase
      .from('email_templates')
      .select('subject, html_content, is_active')
      .eq('slug', slug)
      .eq('language', language)
      .eq('is_active', true)
      .single()

    // If not found, fall back to English
    if ((error || !data) && language !== 'en') {
      const result = await supabase
        .from('email_templates')
        .select('subject, html_content, is_active')
        .eq('slug', slug)
        .eq('language', 'en')
        .eq('is_active', true)
        .single()
      data = result.data
      error = result.error
    }

    if (error || !data) {
      console.log(`Template "${slug}" not found in DB for language "${language}", using fallback`)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching template:', error)
    return null
  }
}

// ==========================================
// TYPED EMAIL SENDING FUNCTIONS
// ==========================================

export interface BookingData {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  roomName?: string
  totalAmount: number
  depositAmount: number
  balanceDue: number
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
  language?: string
  myBookingUrl?: string
  paymentSchedule?: {
    number: number
    amount: number
    dueDate: string
    description: string
  }[]
}

export interface PaymentData {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  amount: number
  paymentNumber: number
  paymentDescription: string
  remainingBalance: number
  nextPaymentDate?: string
  nextPaymentAmount?: number
  language?: string
}

export interface ReminderData {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  retreatStartDate: string
  daysUntilRetreat: number
  amount: number
  dueDate: string
  paymentNumber: number
  language?: string
  // Optional: Early payment URL for "Pay Now" button in reminder emails
  payNowUrl?: string
  paymentScheduleId?: string
}

// Send booking confirmation email
export async function sendBookingConfirmation(data: BookingData) {
  const template = await getTemplate('booking_confirmation', data.language || 'en')

  // Build payment schedule HTML
  let paymentScheduleHtml = ''
  if (data.paymentSchedule) {
    paymentScheduleHtml = `
      <div style="background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0;">
        ${data.paymentSchedule.map(p => `
          <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0;">
            <div>
              <strong>Payment ${p.number}</strong> - ${p.description}<br>
              <span style="color: #64748b; font-size: 14px;">Due: ${new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style="text-align: right;"><strong>€${p.amount.toFixed(2)}</strong></div>
          </div>
        `).join('')}
      </div>
    `
  }

  const templateData: Record<string, unknown> = {
    ...data,
    totalAmount: data.totalAmount.toFixed(2),
    depositAmount: data.depositAmount.toFixed(2),
    balanceDue: data.balanceDue.toFixed(2),
    earlyBirdDiscount: data.earlyBirdDiscount?.toFixed(2),
    paymentScheduleHtml,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    // Fallback to hardcoded template
    const { bookingConfirmationEmail } = await import('./templates')
    subject = `Booking Confirmed: ${data.retreatDestination} Surf Retreat - ${data.bookingNumber}`
    htmlContent = bookingConfirmationEmail(data)
    // Extract just the content without the layout since we'll wrap it
    return sendEmail({
      to: data.email,
      subject,
      html: htmlContent,
      logContext: {
        emailType: 'booking_confirmation',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          retreatDestination: data.retreatDestination,
          totalAmount: data.totalAmount,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'booking_confirmation',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        retreatDestination: data.retreatDestination,
        totalAmount: data.totalAmount,
      },
    },
  })
}

// Send payment confirmation email
export async function sendPaymentConfirmation(data: PaymentData) {
  const template = await getTemplate('payment_confirmation', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    remainingBalance: data.remainingBalance.toFixed(2),
    nextPaymentAmount: data.nextPaymentAmount?.toFixed(2),
    nextPaymentDate: data.nextPaymentDate
      ? new Date(data.nextPaymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : undefined,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const { paymentConfirmationEmail } = await import('./templates')
    subject = `Payment Received - ${data.bookingNumber}`
    return sendEmail({
      to: data.email,
      subject,
      html: paymentConfirmationEmail(data),
      logContext: {
        emailType: 'payment_confirmation',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          amount: data.amount,
          paymentNumber: data.paymentNumber,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'payment_confirmation',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
      },
    },
  })
}

// Urgency message translations for payment reminders
const urgencyTranslations = {
  en: {
    week: { title: 'Payment Reminder', message: 'Your payment is due in 7 days.' },
    days: { title: 'Payment Due Soon', message: 'Your payment is due in 3 days.' },
    tomorrow: { title: 'Payment Due Tomorrow', message: 'Your payment is due tomorrow!' },
    today: { title: 'Payment Due Today', message: 'Your payment is due today.' },
    overdue: { title: 'Payment Overdue', message: 'Your payment is overdue. Please pay as soon as possible to secure your booking.' },
  },
  de: {
    week: { title: 'Zahlungserinnerung', message: 'Ihre Zahlung ist in 7 Tagen fällig.' },
    days: { title: 'Zahlung bald fällig', message: 'Ihre Zahlung ist in 3 Tagen fällig.' },
    tomorrow: { title: 'Zahlung morgen fällig', message: 'Ihre Zahlung ist morgen fällig!' },
    today: { title: 'Zahlung heute fällig', message: 'Ihre Zahlung ist heute fällig.' },
    overdue: { title: 'Zahlung überfällig', message: 'Ihre Zahlung ist überfällig. Bitte zahlen Sie so schnell wie möglich, um Ihre Buchung zu sichern.' },
  },
  es: {
    week: { title: 'Recordatorio de pago', message: 'Su pago vence en 7 días.' },
    days: { title: 'Pago próximo', message: 'Su pago vence en 3 días.' },
    tomorrow: { title: 'Pago mañana', message: '¡Su pago vence mañana!' },
    today: { title: 'Pago hoy', message: 'Su pago vence hoy.' },
    overdue: { title: 'Pago vencido', message: 'Su pago está vencido. Por favor pague lo antes posible para asegurar su reserva.' },
  },
  fr: {
    week: { title: 'Rappel de paiement', message: 'Votre paiement est dû dans 7 jours.' },
    days: { title: 'Paiement bientôt dû', message: 'Votre paiement est dû dans 3 jours.' },
    tomorrow: { title: 'Paiement demain', message: 'Votre paiement est dû demain !' },
    today: { title: 'Paiement aujourd\'hui', message: 'Votre paiement est dû aujourd\'hui.' },
    overdue: { title: 'Paiement en retard', message: 'Votre paiement est en retard. Veuillez payer dès que possible pour sécuriser votre réservation.' },
  },
  nl: {
    week: { title: 'Betalingsherinnering', message: 'Uw betaling is over 7 dagen verschuldigd.' },
    days: { title: 'Betaling binnenkort', message: 'Uw betaling is over 3 dagen verschuldigd.' },
    tomorrow: { title: 'Betaling morgen', message: 'Uw betaling is morgen verschuldigd!' },
    today: { title: 'Betaling vandaag', message: 'Uw betaling is vandaag verschuldigd.' },
    overdue: { title: 'Betaling achterstallig', message: 'Uw betaling is achterstallig. Betaal zo snel mogelijk om uw reservering te behouden.' },
  },
}

// Send payment reminder email
export async function sendPaymentReminder(
  data: ReminderData,
  urgency: 'week' | 'days' | 'tomorrow' | 'today' | 'overdue'
) {
  const template = await getTemplate('payment_reminder', data.language || 'en')

  const lang = (data.language as keyof typeof urgencyTranslations) || 'en'
  const t = urgencyTranslations[lang] || urgencyTranslations.en
  const { title, message } = t[urgency]

  // Use payNowUrl if provided (allows early payment), otherwise fallback to legacy URL
  const paymentUrl = data.payNowUrl || `${SITE_URL}/booking/pay?booking_id=${data.bookingNumber}`

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    dueDate: new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    title,
    message,
    isOverdue: urgency === 'overdue',
    paymentUrl,
    payNowUrl: data.payNowUrl, // For templates that use this variable
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const { paymentReminderEmail } = await import('./templates')
    subject = urgency === 'overdue'
      ? `URGENT: Payment Overdue - ${data.bookingNumber}`
      : `Payment Reminder - ${data.bookingNumber}`
    return sendEmail({
      to: data.email,
      subject,
      html: paymentReminderEmail(data, urgency),
      logContext: {
        emailType: 'payment_reminder',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          amount: data.amount,
          paymentNumber: data.paymentNumber,
          urgency,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'payment_reminder',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        urgency,
      },
    },
  })
}

// Send payment failed email
export async function sendPaymentFailed(data: ReminderData & { failureReason?: string }) {
  const template = await getTemplate('payment_failed', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    paymentUrl: `${SITE_URL}/booking/pay?booking_id=${data.bookingNumber}`,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const { paymentFailedEmail } = await import('./templates')
    subject = `Action Required: Payment Failed - ${data.bookingNumber}`
    return sendEmail({
      to: data.email,
      subject,
      html: paymentFailedEmail(data),
      logContext: {
        emailType: 'payment_failed_simple',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          amount: data.amount,
          paymentNumber: data.paymentNumber,
          failureReason: data.failureReason,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'payment_failed_simple',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        failureReason: data.failureReason,
      },
    },
  })
}

// Send pre-retreat reminder email
export async function sendPreRetreatReminder(data: {
  firstName: string
  lastName: string
  email: string
  bookingNumber: string
  retreatDestination: string
  retreatDates: string
  retreatStartDate: string
  daysUntilRetreat: number
  language?: string
}) {
  const template = await getTemplate('pre_retreat_reminder', data.language || 'en')

  const templateData: Record<string, unknown> = { ...data }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const { preRetreatReminderEmail } = await import('./templates')
    subject = `${data.daysUntilRetreat} Days Until Your ${data.retreatDestination} Surf Retreat!`
    return sendEmail({
      to: data.email,
      subject,
      html: preRetreatReminderEmail(data),
      logContext: {
        emailType: 'pre_retreat_reminder',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          retreatDestination: data.retreatDestination,
          daysUntilRetreat: data.daysUntilRetreat,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'pre_retreat_reminder',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        retreatDestination: data.retreatDestination,
        daysUntilRetreat: data.daysUntilRetreat,
      },
    },
  })
}

// Cancellation message translations
const cancellationTranslations = {
  en: {
    subject: 'Booking Cancelled',
    title: 'Your Booking Has Been Cancelled',
    message: 'We\'re sorry to inform you that your booking has been cancelled.',
    refundNote: 'If you have already made a payment, a refund will be processed separately.',
    contactNote: 'If you have any questions about this cancellation, please don\'t hesitate to contact us.',
  },
  de: {
    subject: 'Buchung storniert',
    title: 'Ihre Buchung wurde storniert',
    message: 'Wir bedauern, Ihnen mitteilen zu müssen, dass Ihre Buchung storniert wurde.',
    refundNote: 'Falls Sie bereits eine Zahlung geleistet haben, wird eine Rückerstattung separat bearbeitet.',
    contactNote: 'Bei Fragen zu dieser Stornierung können Sie sich gerne an uns wenden.',
  },
  es: {
    subject: 'Reserva cancelada',
    title: 'Su reserva ha sido cancelada',
    message: 'Lamentamos informarle que su reserva ha sido cancelada.',
    refundNote: 'Si ya ha realizado un pago, se procesará un reembolso por separado.',
    contactNote: 'Si tiene alguna pregunta sobre esta cancelación, no dude en contactarnos.',
  },
  fr: {
    subject: 'Réservation annulée',
    title: 'Votre réservation a été annulée',
    message: 'Nous avons le regret de vous informer que votre réservation a été annulée.',
    refundNote: 'Si vous avez déjà effectué un paiement, un remboursement sera traité séparément.',
    contactNote: 'Si vous avez des questions concernant cette annulation, n\'hésitez pas à nous contacter.',
  },
  nl: {
    subject: 'Boeking geannuleerd',
    title: 'Uw boeking is geannuleerd',
    message: 'Het spijt ons u te moeten meedelen dat uw boeking is geannuleerd.',
    refundNote: 'Als u al een betaling heeft gedaan, wordt een terugbetaling apart verwerkt.',
    contactNote: 'Als u vragen heeft over deze annulering, neem dan gerust contact met ons op.',
  },
}

// Send booking cancellation email
export async function sendBookingCancellation(data: {
  booking: {
    id: string
    booking_number: string
    first_name: string
    last_name: string
    email: string
    total_amount: number
    deposit_amount: number
    payment_status: string
    language: string
    retreat: {
      destination: string
      start_date: string
      end_date: string
    }
  }
  reason?: string
}) {
  const { booking, reason } = data
  const language = booking.language || 'en'
  const template = await getTemplate('booking_cancellation', language)

  const lang = language as keyof typeof cancellationTranslations
  const t = cancellationTranslations[lang] || cancellationTranslations.en

  const dateLocale = language === 'de' ? 'de-DE' :
                     language === 'es' ? 'es-ES' :
                     language === 'fr' ? 'fr-FR' :
                     language === 'nl' ? 'nl-NL' : 'en-US'

  const retreatDates = `${new Date(booking.retreat.start_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric' })} - ${new Date(booking.retreat.end_date).toLocaleDateString(dateLocale, { month: 'long', day: 'numeric', year: 'numeric' })}`

  const hasPaid = booking.payment_status !== 'unpaid'

  const templateData: Record<string, unknown> = {
    firstName: booking.first_name,
    lastName: booking.last_name,
    bookingNumber: booking.booking_number,
    retreatDestination: booking.retreat.destination,
    retreatDates,
    totalAmount: booking.total_amount.toFixed(2),
    depositAmount: booking.deposit_amount.toFixed(2),
    reason: reason || '',
    hasPaid,
    title: t.title,
    message: t.message,
    refundNote: t.refundNote,
    contactNote: t.contactNote,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    // Fallback to hardcoded template
    subject = `${t.subject} - ${booking.booking_number}`
    htmlContent = `
      <h2>${t.title}</h2>
      <p>Hi ${booking.first_name},</p>
      <p>${t.message}</p>

      <div class="highlight-box">
        <p><strong>Booking Number:</strong> ${booking.booking_number}</p>
        <p><strong>Retreat:</strong> ${booking.retreat.destination} Surf Retreat</p>
        <p><strong>Dates:</strong> ${retreatDates}</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      </div>

      ${hasPaid ? `
        <div class="warning-box">
          <p><strong>Payment Information</strong></p>
          <p>${t.refundNote}</p>
        </div>
      ` : ''}

      <p>${t.contactNote}</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: booking.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'booking_cancellation',
      recipientType: 'customer',
      bookingId: booking.id,
      metadata: {
        bookingNumber: booking.booking_number,
        retreatDestination: booking.retreat.destination,
        reason,
      },
    },
  })
}

// Send refund confirmation email
export async function sendRefundConfirmation(data: {
  firstName: string
  lastName: string
  email: string
  bookingNumber: string
  retreatDestination: string
  refundAmount: number
  reason?: string
  language?: string
}) {
  const template = await getTemplate('refund_confirmation', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    refundAmount: data.refundAmount.toFixed(2),
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const { refundConfirmationEmail } = await import('./templates')
    subject = `Refund Processed - ${data.bookingNumber}`
    return sendEmail({
      to: data.email,
      subject,
      html: refundConfirmationEmail(data),
      logContext: {
        emailType: 'refund_confirmation',
        recipientType: 'customer',
        metadata: {
          bookingNumber: data.bookingNumber,
          refundAmount: data.refundAmount,
          reason: data.reason,
        },
      },
    })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'refund_confirmation',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        refundAmount: data.refundAmount,
        reason: data.reason,
      },
    },
  })
}

// ==========================================
// NEW EMAIL FUNCTIONS FOR PAYMENT FLOW
// ==========================================

export interface FailedPaymentData {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  amount: number
  paymentNumber: number
  totalPayments: number
  failureReason?: string
  paymentDeadline: string // Date string
  daysRemaining: number
  updatePaymentUrl: string // Stripe Customer Portal URL
  myBookingUrl: string
  language?: string
  // For audit logging
  bookingId?: string
  paymentId?: string
}

/**
 * Send failed payment email with 14-day deadline info
 * Sent immediately when a scheduled payment fails
 */
export async function sendPaymentFailedWithDeadline(data: FailedPaymentData) {
  const template = await getTemplate('payment_failed_initial', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    paymentDeadline: new Date(data.paymentDeadline).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }),
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    // Fallback hardcoded template
    subject = `Action Required: Payment Failed - ${data.bookingNumber}`
    htmlContent = `
      <h2>Payment Failed</h2>
      <p>Hi ${data.firstName},</p>
      <p>We were unable to process your scheduled payment of <strong>€${data.amount.toFixed(2)}</strong>
      for your ${data.retreatDestination} retreat.</p>

      ${data.failureReason ? `<p><strong>Reason:</strong> ${data.failureReason}</p>` : ''}

      <div class="warning-box">
        <p><strong>Important:</strong> You have <strong>${data.daysRemaining} days</strong> to update your payment method and complete this payment.</p>
        <p>Deadline: <strong>${templateData.paymentDeadline}</strong></p>
        <p>If payment is not received by this date, your booking will be automatically cancelled.</p>
      </div>

      <div class="highlight-box">
        <p><strong>Booking:</strong> ${data.bookingNumber}</p>
        <p><strong>Payment:</strong> ${data.paymentNumber} of ${data.totalPayments}</p>
        <p><strong>Amount Due:</strong> €${data.amount.toFixed(2)}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.updatePaymentUrl}" class="button">Update Payment Method</a>
      </p>

      <p>You can also view your booking details and payment schedule at:</p>
      <p><a href="${data.myBookingUrl}">${data.myBookingUrl}</a></p>

      <p>If you have any questions, please don't hesitate to contact us.</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'payment_failed',
      recipientType: 'customer',
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata: {
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        failureReason: data.failureReason,
        daysRemaining: data.daysRemaining,
      },
    },
  })
}

/**
 * Send deadline reminder for failed payment
 * Used for Day 11 (3 days left) and Day 13 (1 day left) reminders
 */
export async function sendDeadlineReminder(
  data: FailedPaymentData,
  reminderType: '3_days' | '1_day'
) {
  const templateSlug = reminderType === '3_days' ? 'payment_failed_3days' : 'payment_failed_1day'
  const template = await getTemplate(templateSlug, data.language || 'en')

  const urgency = reminderType === '1_day' ? 'URGENT: ' : ''

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    paymentDeadline: new Date(data.paymentDeadline).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }),
    isLastDay: reminderType === '1_day',
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    const daysText = reminderType === '3_days' ? '3 days' : '1 day'
    subject = `${urgency}${daysText} remaining to complete payment - ${data.bookingNumber}`
    htmlContent = `
      <h2>${urgency}Payment Deadline Approaching</h2>
      <p>Hi ${data.firstName},</p>

      <div class="warning-box" style="background: ${reminderType === '1_day' ? '#fee2e2' : '#fef3c7'}; border-color: ${reminderType === '1_day' ? '#ef4444' : '#f59e0b'};">
        <p><strong>You have only ${daysText} left</strong> to complete your payment.</p>
        <p>Deadline: <strong>${templateData.paymentDeadline}</strong></p>
        ${reminderType === '1_day' ? '<p style="color: #dc2626;"><strong>This is your final reminder. If payment is not received, your booking will be cancelled tomorrow.</strong></p>' : ''}
      </div>

      <div class="highlight-box">
        <p><strong>Booking:</strong> ${data.bookingNumber}</p>
        <p><strong>Amount Due:</strong> €${data.amount.toFixed(2)}</p>
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.updatePaymentUrl}" class="button" style="${reminderType === '1_day' ? 'background: #dc2626;' : ''}">
          Update Payment Method Now
        </a>
      </p>

      <p>If you've already updated your payment method, we will automatically retry the charge.</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'deadline_reminder',
      recipientType: 'customer',
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata: {
        reminderType,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        daysRemaining: data.daysRemaining,
      },
    },
  })
}

/**
 * Send booking cancelled due to non-payment email
 * Sent when the 14-day deadline passes without payment
 */
export async function sendBookingCancelledDueToNonPayment(data: {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  unpaidAmount: number
  language?: string
}) {
  const template = await getTemplate('payment_cancelled', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    unpaidAmount: data.unpaidAmount.toFixed(2),
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `Booking Cancelled - ${data.bookingNumber}`
    htmlContent = `
      <h2>Booking Cancelled</h2>
      <p>Hi ${data.firstName},</p>

      <p>We regret to inform you that your booking has been cancelled due to non-payment.</p>

      <div class="highlight-box">
        <p><strong>Booking Number:</strong> ${data.bookingNumber}</p>
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
        <p><strong>Dates:</strong> ${data.retreatDates}</p>
        <p><strong>Unpaid Amount:</strong> €${data.unpaidAmount.toFixed(2)}</p>
      </div>

      <p>Despite multiple reminders, we did not receive the outstanding payment within the 14-day grace period.</p>

      <p>If you believe this was an error or would like to rebook, please contact us as soon as possible.
      Subject to availability, we may be able to reinstate your booking.</p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'booking_cancelled_non_payment',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        retreatDestination: data.retreatDestination,
        unpaidAmount: data.unpaidAmount,
      },
    },
  })
}

export interface PaymentSuccessData {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  checkInDate: string
  checkOutDate: string
  roomName?: string
  paidAmount: number
  paymentNumber: number
  totalPayments: number
  nextPaymentAmount?: number
  nextPaymentDate?: string
  totalPaid: number
  balanceDue: number
  myBookingUrl: string
  language?: string
}

/**
 * Send payment success email with next payment info
 * Sent after each scheduled payment (except the first deposit which uses booking confirmation)
 */
export async function sendPaymentSuccessWithNextInfo(data: PaymentSuccessData) {
  const hasNextPayment = data.nextPaymentAmount && data.nextPaymentDate
  const templateSlug = hasNextPayment ? 'payment_success_with_next' : 'payment_success_final'
  const template = await getTemplate(templateSlug, data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    paidAmount: data.paidAmount.toFixed(2),
    nextPaymentAmount: data.nextPaymentAmount?.toFixed(2),
    nextPaymentDate: data.nextPaymentDate
      ? new Date(data.nextPaymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : undefined,
    totalPaid: data.totalPaid.toFixed(2),
    balanceDue: data.balanceDue.toFixed(2),
    isFullyPaid: data.balanceDue === 0,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    if (hasNextPayment) {
      subject = `Payment ${data.paymentNumber} received - Next payment on ${templateData.nextPaymentDate}`
      htmlContent = `
        <h2>Payment Received - Thank You!</h2>
        <p>Hi ${data.firstName},</p>

        <div class="success-box">
          <p><strong>Payment ${data.paymentNumber} of ${data.totalPayments} received successfully!</strong></p>
          <p class="amount">€${data.paidAmount.toFixed(2)}</p>
        </div>

        <div class="highlight-box">
          <p><strong>Booking:</strong> ${data.bookingNumber}</p>
          <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
          <p><strong>Dates:</strong> ${data.retreatDates}</p>
        </div>

        <h3>Payment Progress</h3>
        <p><strong>Total Paid:</strong> €${data.totalPaid.toFixed(2)}</p>
        <p><strong>Remaining Balance:</strong> €${data.balanceDue.toFixed(2)}</p>

        <div class="highlight-box" style="margin-top: 20px;">
          <h4>Next Payment</h4>
          <p><strong>Payment ${data.paymentNumber + 1} of ${data.totalPayments}:</strong> €${data.nextPaymentAmount?.toFixed(2)}</p>
          <p><strong>Due Date:</strong> ${templateData.nextPaymentDate}</p>
          <p style="font-size: 14px; color: #64748b;">This payment will be automatically charged to your saved card.</p>
        </div>

        <p style="margin-top: 20px;">
          <a href="${data.myBookingUrl}">View your full payment schedule</a>
        </p>

        <p style="margin-top: 30px;">
          Best regards,<br>
          <strong>Rainbow Surf Retreats Team</strong>
        </p>
      `
    } else {
      subject = `All payments complete for your ${data.retreatDestination} retreat!`
      htmlContent = `
        <h2>All Payments Complete!</h2>
        <p>Hi ${data.firstName},</p>

        <div class="success-box">
          <p><strong>Congratulations! Your retreat is fully paid!</strong></p>
          <p class="amount">Total Paid: €${data.totalPaid.toFixed(2)}</p>
        </div>

        <div class="highlight-box">
          <p><strong>Booking:</strong> ${data.bookingNumber}</p>
          <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
          <p><strong>Check-in:</strong> ${new Date(data.checkInDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          <p><strong>Check-out:</strong> ${new Date(data.checkOutDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
          ${data.roomName ? `<p><strong>Room:</strong> ${data.roomName}</p>` : ''}
        </div>

        <p>We're excited to see you at the retreat! You'll receive a pre-retreat information email closer to your arrival date with everything you need to know.</p>

        <p style="margin-top: 20px;">
          <a href="${data.myBookingUrl}">View your booking details</a>
        </p>

        <p style="margin-top: 30px;">
          See you soon!<br>
          <strong>Rainbow Surf Retreats Team</strong>
        </p>
      `
    }
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: hasNextPayment ? 'payment_success' : 'payment_success_final',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        paidAmount: data.paidAmount,
        paymentNumber: data.paymentNumber,
        totalPaid: data.totalPaid,
        balanceDue: data.balanceDue,
      },
    },
  })
}

/**
 * Send admin notification when a payment fails
 */
export async function sendAdminPaymentFailedNotification(data: {
  bookingNumber: string
  customerName: string
  customerEmail: string
  retreatName: string
  amount: number
  paymentNumber: number
  failureReason: string
  adminDashboardUrl?: string
  // For audit logging
  bookingId?: string
  paymentId?: string
}) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnPaymentFailed')) {
    console.log('Admin payment failed notification is disabled')
    return
  }

  // Get admin email from settings with fallback
  const adminEmail = await getAdminNotificationEmail('payments')
  if (!adminEmail) {
    console.log('No admin email configured for payment notifications')
    return
  }

  const dashboardUrl = data.adminDashboardUrl || `${process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'}/admin/payments`

  const subject = `Payment Failed: ${data.bookingNumber}`
  const htmlContent = `
    <h2>Payment Failed Alert</h2>

    <div class="warning-box">
      <p><strong>A scheduled payment has failed.</strong></p>
    </div>

    <div class="highlight-box">
      <p><strong>Booking:</strong> ${data.bookingNumber}</p>
      <p><strong>Customer:</strong> ${data.customerName} (${data.customerEmail})</p>
      <p><strong>Retreat:</strong> ${data.retreatName}</p>
      <p><strong>Payment:</strong> #${data.paymentNumber}</p>
      <p><strong>Amount:</strong> €${data.amount.toFixed(2)}</p>
      <p><strong>Reason:</strong> ${data.failureReason}</p>
    </div>

    <p>The customer has been notified and given 14 days to update their payment method.</p>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${dashboardUrl}" class="button">View in Admin Dashboard</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)

  await sendEmail({
    to: adminEmail,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_payment_failed',
      recipientType: 'admin',
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata: {
        customerEmail: data.customerEmail,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        failureReason: data.failureReason,
      },
    },
  })
}

/**
 * Send booking restored email to customer
 */
export async function sendBookingRestored(data: {
  bookingNumber: string
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  newDueDate: string
  amountDue: number
  paymentLinkUrl?: string
  myBookingUrl: string
  language?: string
}) {
  const template = await getTemplate('booking_restored', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    amountDue: data.amountDue.toFixed(2),
    newDueDate: new Date(data.newDueDate).toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    }),
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `Your booking has been restored - ${data.bookingNumber}`
    htmlContent = `
      <h2>Booking Restored</h2>
      <p>Hi ${data.firstName},</p>

      <p>Great news! Your booking has been restored.</p>

      <div class="highlight-box">
        <p><strong>Booking:</strong> ${data.bookingNumber}</p>
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
        <p><strong>Dates:</strong> ${data.retreatDates}</p>
      </div>

      <div class="warning-box">
        <p><strong>Amount Due:</strong> €${data.amountDue.toFixed(2)}</p>
        <p><strong>New Payment Deadline:</strong> ${templateData.newDueDate}</p>
      </div>

      ${data.paymentLinkUrl ? `
        <p style="text-align: center; margin: 30px 0;">
          <a href="${data.paymentLinkUrl}" class="button">Pay Now</a>
        </p>
      ` : ''}

      <p>
        <a href="${data.myBookingUrl}">View your booking details</a>
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'booking_restored',
      recipientType: 'customer',
      metadata: {
        bookingNumber: data.bookingNumber,
        retreatDestination: data.retreatDestination,
        amountDue: data.amountDue,
      },
    },
  })
}

// ==========================================
// WAITLIST EMAIL FUNCTIONS
// ==========================================

export interface WaitlistConfirmationData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  roomName?: string
  position: number
  language?: string
}

/**
 * Send waitlist confirmation email when user joins waitlist
 */
export async function sendWaitlistConfirmation(data: WaitlistConfirmationData) {
  const template = await getTemplate('waitlist_confirmation', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    siteUrl: SITE_URL,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `You're on the Waitlist - ${data.retreatDestination} Retreat`
    htmlContent = `
      <h2>You're on the Waitlist!</h2>
      <p>Hi ${data.firstName},</p>

      <p>Thank you for joining the waitlist for our ${data.retreatDestination} Surf Retreat.</p>

      <div class="highlight-box">
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
        <p><strong>Dates:</strong> ${data.retreatDates}</p>
        ${data.roomName ? `<p><strong>Room:</strong> ${data.roomName}</p>` : ''}
        <p style="font-size: 24px; font-weight: bold; color: #E97451; margin-top: 15px;">
          Your Position: #${data.position}
        </p>
      </div>

      <h3>What Happens Next?</h3>
      <p>If a spot opens up, we'll send you an email notification immediately. You'll have <strong>72 hours</strong> to confirm and complete your booking.</p>

      <p>We'll keep you informed every step of the way. In the meantime, feel free to browse our other available retreats.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${SITE_URL}/retreats" class="button">Browse Retreats</a>
      </p>

      <p style="margin-top: 30px;">
        Surf's up!<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'waitlist_confirmation',
      recipientType: 'customer',
      metadata: {
        retreatDestination: data.retreatDestination,
        position: data.position,
      },
    },
  })
}

export interface WaitlistSpotAvailableData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  roomName?: string
  roomPrice: number
  depositPercentage: number
  depositAmount: number
  expiresAt: string
  acceptUrl: string
  declineUrl: string
  language?: string
}

/**
 * Send notification when a spot becomes available for a waitlist member
 */
export async function sendWaitlistSpotAvailable(data: WaitlistSpotAvailableData) {
  const template = await getTemplate('waitlist_spot_available', data.language || 'en')

  const expiryDate = new Date(data.expiresAt)
  const formattedExpiry = expiryDate.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  })

  const templateData: Record<string, unknown> = {
    ...data,
    roomPrice: data.roomPrice.toFixed(2),
    depositAmount: data.depositAmount.toFixed(2),
    expiresAt: formattedExpiry,
    siteUrl: SITE_URL,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `A Spot is Available! - ${data.retreatDestination} Retreat`
    htmlContent = `
      <h2>Great News - A Spot Just Opened Up!</h2>
      <p>Hi ${data.firstName},</p>

      <p>A spot has become available for your waitlisted retreat!</p>

      <div class="success-box">
        <p><strong>This is your chance to secure your spot!</strong></p>
      </div>

      <div class="highlight-box">
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
        <p><strong>Dates:</strong> ${data.retreatDates}</p>
        ${data.roomName ? `<p><strong>Room:</strong> ${data.roomName}</p>` : ''}
        <p><strong>Price:</strong> €${data.roomPrice.toFixed(2)}</p>
        <p><strong>Deposit (${data.depositPercentage}%):</strong> €${data.depositAmount.toFixed(2)}</p>
      </div>

      <div class="warning-box">
        <p><strong>⏰ This offer expires in 72 hours</strong></p>
        <p>Deadline: ${formattedExpiry}</p>
        <p style="font-size: 14px;">If you don't respond by this time, the spot will be offered to the next person on the waitlist.</p>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${data.acceptUrl}" class="button" style="margin: 10px;">Accept & Book Now</a>
        <br><br>
        <a href="${data.declineUrl}" class="button button-secondary" style="background: #64748b; margin: 10px;">Decline Offer</a>
      </div>

      <p style="font-size: 14px; color: #64748b; text-align: center;">
        By accepting, you'll be redirected to complete your booking and pay the ${data.depositPercentage}% deposit.
      </p>

      <p style="margin-top: 30px;">
        See you at the beach!<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'waitlist_spot_available',
      recipientType: 'customer',
      metadata: {
        retreatDestination: data.retreatDestination,
        roomPrice: data.roomPrice,
        depositAmount: data.depositAmount,
        expiresAt: data.expiresAt,
      },
    },
  })
}

export interface WaitlistAcceptedData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  bookingUrl: string
  language?: string
}

/**
 * Send confirmation after user accepts waitlist offer
 */
export async function sendWaitlistAccepted(data: WaitlistAcceptedData) {
  const template = await getTemplate('waitlist_accepted', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    siteUrl: SITE_URL,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `Complete Your Booking - ${data.retreatDestination} Retreat`
    htmlContent = `
      <h2>You're Almost There!</h2>
      <p>Hi ${data.firstName},</p>

      <div class="success-box">
        <p><strong>Congratulations!</strong> You've successfully accepted the waitlist offer.</p>
      </div>

      <p>Please complete your booking by paying the deposit to secure your spot.</p>

      <div class="highlight-box">
        <p><strong>Retreat:</strong> ${data.retreatDestination}</p>
        <p><strong>Dates:</strong> ${data.retreatDates}</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.bookingUrl}" class="button">Complete Booking Now</a>
      </p>

      <p style="font-size: 14px; color: #64748b;">
        If you have any questions, please don't hesitate to contact us.
      </p>

      <p style="margin-top: 30px;">
        Best regards,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'waitlist_accepted',
      recipientType: 'customer',
      metadata: {
        retreatDestination: data.retreatDestination,
        retreatDates: data.retreatDates,
      },
    },
  })
}

export interface WaitlistDeclinedData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  language?: string
}

/**
 * Send confirmation after user declines waitlist offer
 */
export async function sendWaitlistDeclined(data: WaitlistDeclinedData) {
  const template = await getTemplate('waitlist_declined', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    siteUrl: SITE_URL,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `We'll Miss You - ${data.retreatDestination} Retreat`
    htmlContent = `
      <h2>We're Sorry to See You Go</h2>
      <p>Hi ${data.firstName},</p>

      <p>We understand that the timing wasn't right for the ${data.retreatDestination} retreat.</p>

      <p>We'd love to host you on a future adventure! Browse our upcoming retreats to find one that works better for your schedule.</p>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${SITE_URL}/retreats" class="button">Browse Other Retreats</a>
      </p>

      <p>You can always join the waitlist again if your plans change.</p>

      <p style="margin-top: 30px;">
        Wishing you great waves,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'waitlist_declined',
      recipientType: 'customer',
      metadata: {
        retreatDestination: data.retreatDestination,
      },
    },
  })
}

export interface WaitlistExpiredData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  waitlistUrl: string
  language?: string
}

/**
 * Send notification when waitlist offer expires without response
 */
export async function sendWaitlistExpired(data: WaitlistExpiredData) {
  const template = await getTemplate('waitlist_expired', data.language || 'en')

  const templateData: Record<string, unknown> = {
    ...data,
    siteUrl: SITE_URL,
  }

  let subject: string
  let htmlContent: string

  if (template) {
    subject = renderTemplate(template.subject, templateData)
    htmlContent = renderTemplate(template.html_content, templateData)
  } else {
    subject = `Waitlist Offer Expired - ${data.retreatDestination} Retreat`
    htmlContent = `
      <h2>Your Waitlist Offer Has Expired</h2>
      <p>Hi ${data.firstName},</p>

      <p>Unfortunately, the 72-hour deadline to respond to your waitlist offer for the ${data.retreatDestination} retreat has passed.</p>

      <p>The spot has been offered to the next person on the waitlist.</p>

      <div class="highlight-box">
        <p><strong>Still Interested?</strong></p>
        <p>You can rejoin the waitlist for this retreat if you'd still like a chance to attend.</p>
      </div>

      <p style="text-align: center; margin: 30px 0;">
        <a href="${data.waitlistUrl}" class="button">Rejoin Waitlist</a>
      </p>

      <p>Or browse our other available retreats:</p>
      <p style="text-align: center;">
        <a href="${SITE_URL}/retreats" class="button button-secondary" style="background: #64748b;">Browse Retreats</a>
      </p>

      <p style="margin-top: 30px;">
        Hope to see you soon,<br>
        <strong>Rainbow Surf Retreats Team</strong>
      </p>
    `
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'waitlist_expired',
      recipientType: 'customer',
      metadata: {
        retreatDestination: data.retreatDestination,
        retreatDates: data.retreatDates,
      },
    },
  })
}

// ==========================================
// ADMIN NOTIFICATION FUNCTIONS
// ==========================================

interface AdminNotificationSettings {
  generalEmail?: string
  bookingsEmail?: string
  paymentsEmail?: string
  waitlistEmail?: string
  supportEmail?: string
  notifyOnNewBooking?: boolean
  notifyOnPaymentReceived?: boolean
  notifyOnPaymentFailed?: boolean
  notifyOnWaitlistJoin?: boolean
  notifyOnWaitlistResponse?: boolean
  notifyOnSupportRequest?: boolean
}

/**
 * Get admin notification settings from database
 */
async function getAdminNotificationSettings(): Promise<AdminNotificationSettings | null> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'admin_notifications')
      .single()

    if (error || !data) {
      return null
    }

    return data.value as AdminNotificationSettings
  } catch (error) {
    console.error('Error fetching admin notification settings:', error)
    return null
  }
}

/**
 * Get admin email for a specific notification type
 * Falls back to generalEmail, then ADMIN_EMAIL env variable
 */
export async function getAdminNotificationEmail(
  type: 'bookings' | 'payments' | 'waitlist' | 'support' | 'general'
): Promise<string | null> {
  const settings = await getAdminNotificationSettings()

  if (settings) {
    const typeEmail = settings[`${type}Email` as keyof AdminNotificationSettings] as string | undefined
    if (typeEmail) return typeEmail
    if (settings.generalEmail) return settings.generalEmail
  }

  return process.env.ADMIN_EMAIL || null
}

/**
 * Check if a specific notification type is enabled
 */
export async function isNotificationEnabled(
  type: 'notifyOnNewBooking' | 'notifyOnPaymentReceived' | 'notifyOnPaymentFailed' | 'notifyOnWaitlistJoin' | 'notifyOnWaitlistResponse' | 'notifyOnSupportRequest'
): Promise<boolean> {
  const settings = await getAdminNotificationSettings()
  if (!settings) return true // Default to enabled if no settings
  return settings[type] !== false // Default to true unless explicitly disabled
}

export interface AdminWaitlistJoinData {
  firstName: string
  lastName: string
  email: string
  phone?: string
  retreatDestination: string
  retreatDates: string
  roomName?: string
  guestsCount: number
  notes?: string
  position: number
}

/**
 * Send notification to admin when someone joins the waitlist
 */
export async function sendAdminWaitlistJoinNotification(data: AdminWaitlistJoinData) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnWaitlistJoin')) {
    console.log('Admin waitlist join notification is disabled')
    return
  }

  const adminEmail = await getAdminNotificationEmail('waitlist')
  if (!adminEmail) {
    console.log('No admin email configured for waitlist notifications')
    return
  }

  const subject = `New Waitlist Entry - ${data.retreatDestination}`
  const htmlContent = `
    <h2>New Waitlist Entry</h2>

    <div class="highlight-box">
      <p><strong>Someone just joined the waitlist for your retreat!</strong></p>
    </div>

    <h3>Guest Information</h3>
    <div class="highlight-box">
      <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      ${data.phone ? `<p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>` : ''}
      <p><strong>Number of Guests:</strong> ${data.guestsCount}</p>
      <p><strong>Position:</strong> #${data.position}</p>
    </div>

    <h3>Retreat Details</h3>
    <div class="highlight-box">
      <p><strong>Retreat:</strong> ${escapeHtml(data.retreatDestination)}</p>
      <p><strong>Dates:</strong> ${escapeHtml(data.retreatDates)}</p>
      ${data.roomName ? `<p><strong>Preferred Room:</strong> ${escapeHtml(data.roomName)}</p>` : '<p><strong>Preferred Room:</strong> Any available</p>'}
    </div>

    ${data.notes ? `
    <h3>Special Requests / Notes</h3>
    <div class="warning-box">
      <p>${escapeHtml(data.notes)}</p>
    </div>
    ` : ''}

    <p style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/admin/waitlist" class="button">View Waitlist</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: adminEmail,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_waitlist_join',
      recipientType: 'admin',
      metadata: {
        guestEmail: data.email,
        guestName: `${data.firstName} ${data.lastName}`,
        retreatDestination: data.retreatDestination,
        position: data.position,
        guestsCount: data.guestsCount,
      },
    },
  })
}

// ==========================================
// NEW ADMIN NOTIFICATION FUNCTIONS
// ==========================================

export interface AdminNewBookingData {
  bookingNumber: string
  customerName: string
  customerEmail: string
  phone?: string
  retreatName: string
  retreatDates: string
  roomName?: string
  totalAmount: number
  depositAmount: number
  guestsCount: number
  paymentType: 'deposit' | 'full'
  isEarlyBird?: boolean
  earlyBirdDiscount?: number
  bookingId?: string
}

/**
 * Send notification to admin when a new booking is created
 */
export async function sendAdminNewBookingNotification(data: AdminNewBookingData) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnNewBooking')) {
    console.log('Admin new booking notification is disabled')
    return
  }

  const adminEmail = await getAdminNotificationEmail('bookings')
  if (!adminEmail) {
    console.log('No admin email configured for booking notifications')
    return
  }

  const subject = `New Booking: ${data.bookingNumber} - ${data.retreatName}`
  const htmlContent = `
    <h2>New Booking Received</h2>

    <div class="success-box">
      <p><strong>A new booking has been made!</strong></p>
    </div>

    <h3>Guest Information</h3>
    <div class="highlight-box">
      <p><strong>Name:</strong> ${escapeHtml(data.customerName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.customerEmail)}</p>
      ${data.phone ? `<p><strong>Phone:</strong> ${escapeHtml(data.phone)}</p>` : ''}
      <p><strong>Guests:</strong> ${data.guestsCount}</p>
    </div>

    <h3>Booking Details</h3>
    <div class="highlight-box">
      <p><strong>Booking Number:</strong> ${escapeHtml(data.bookingNumber)}</p>
      <p><strong>Retreat:</strong> ${escapeHtml(data.retreatName)}</p>
      <p><strong>Dates:</strong> ${escapeHtml(data.retreatDates)}</p>
      ${data.roomName ? `<p><strong>Room:</strong> ${escapeHtml(data.roomName)}</p>` : ''}
    </div>

    <h3>Payment</h3>
    <div class="highlight-box">
      <p><strong>Total Amount:</strong> €${data.totalAmount.toFixed(2)}</p>
      <p><strong>Deposit Paid:</strong> €${data.depositAmount.toFixed(2)}</p>
      <p><strong>Payment Type:</strong> ${data.paymentType === 'full' ? 'Full Payment' : 'Deposit'}</p>
      ${data.isEarlyBird ? `<p><strong>Early Bird Discount:</strong> €${data.earlyBirdDiscount?.toFixed(2)}</p>` : ''}
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/admin/bookings" class="button">View in Admin Dashboard</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: adminEmail,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_new_booking',
      recipientType: 'admin',
      bookingId: data.bookingId,
      metadata: {
        customerEmail: data.customerEmail,
        bookingNumber: data.bookingNumber,
        totalAmount: data.totalAmount,
        depositAmount: data.depositAmount,
      },
    },
  })
}

export interface AdminPaymentReceivedData {
  bookingNumber: string
  customerName: string
  customerEmail: string
  retreatName: string
  amount: number
  paymentNumber: number
  totalPayments: number
  remainingBalance: number
  isFullyPaid: boolean
  bookingId?: string
  paymentId?: string
}

/**
 * Send notification to admin when a payment is received
 */
export async function sendAdminPaymentReceivedNotification(data: AdminPaymentReceivedData) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnPaymentReceived')) {
    console.log('Admin payment received notification is disabled')
    return
  }

  const adminEmail = await getAdminNotificationEmail('payments')
  if (!adminEmail) {
    console.log('No admin email configured for payment notifications')
    return
  }

  const subject = data.isFullyPaid
    ? `Payment Complete: ${data.bookingNumber}`
    : `Payment Received: ${data.bookingNumber} (${data.paymentNumber}/${data.totalPayments})`

  const htmlContent = `
    <h2>Payment Received</h2>

    <div class="success-box">
      <p class="amount">€${data.amount.toFixed(2)}</p>
      <p>Payment ${data.paymentNumber} of ${data.totalPayments}</p>
    </div>

    <div class="highlight-box">
      <p><strong>Booking:</strong> ${escapeHtml(data.bookingNumber)}</p>
      <p><strong>Customer:</strong> ${escapeHtml(data.customerName)} (${escapeHtml(data.customerEmail)})</p>
      <p><strong>Retreat:</strong> ${escapeHtml(data.retreatName)}</p>
      <p><strong>Remaining Balance:</strong> €${data.remainingBalance.toFixed(2)}</p>
    </div>

    ${data.isFullyPaid ? `
      <div class="success-box">
        <p><strong>This booking is now fully paid!</strong></p>
      </div>
    ` : ''}

    <p style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/admin/payments" class="button">View Payments</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: adminEmail,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_payment_received',
      recipientType: 'admin',
      bookingId: data.bookingId,
      paymentId: data.paymentId,
      metadata: {
        customerEmail: data.customerEmail,
        amount: data.amount,
        paymentNumber: data.paymentNumber,
        isFullyPaid: data.isFullyPaid,
      },
    },
  })
}

export interface AdminWaitlistResponseData {
  firstName: string
  lastName: string
  email: string
  retreatDestination: string
  retreatDates: string
  roomName?: string
  action: 'accepted' | 'declined'
}

/**
 * Send notification to admin when someone responds to a waitlist offer
 */
export async function sendAdminWaitlistResponseNotification(data: AdminWaitlistResponseData) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnWaitlistResponse')) {
    console.log('Admin waitlist response notification is disabled')
    return
  }

  const adminEmail = await getAdminNotificationEmail('waitlist')
  if (!adminEmail) {
    console.log('No admin email configured for waitlist notifications')
    return
  }

  const actionText = data.action === 'accepted' ? 'Accepted' : 'Declined'
  const actionColor = data.action === 'accepted' ? '#10b981' : '#ef4444'

  const subject = `Waitlist ${actionText}: ${data.retreatDestination}`
  const htmlContent = `
    <h2>Waitlist Response Received</h2>

    <div style="background: ${actionColor}20; border-left: 4px solid ${actionColor}; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
      <p style="color: ${actionColor}; font-weight: bold; margin: 0;">
        ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)} has ${actionText.toLowerCase()} the waitlist offer
      </p>
    </div>

    <div class="highlight-box">
      <p><strong>Name:</strong> ${escapeHtml(data.firstName)} ${escapeHtml(data.lastName)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Retreat:</strong> ${escapeHtml(data.retreatDestination)}</p>
      <p><strong>Dates:</strong> ${escapeHtml(data.retreatDates)}</p>
      ${data.roomName ? `<p><strong>Room:</strong> ${escapeHtml(data.roomName)}</p>` : ''}
    </div>

    ${data.action === 'declined' ? `
      <p>The spot will be offered to the next person on the waitlist.</p>
    ` : `
      <p>The guest should now complete their booking.</p>
    `}

    <p style="text-align: center; margin: 30px 0;">
      <a href="${SITE_URL}/admin/waitlist" class="button">View Waitlist</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: adminEmail,
    subject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_waitlist_response',
      recipientType: 'admin',
      metadata: {
        guestEmail: data.email,
        guestName: `${data.firstName} ${data.lastName}`,
        action: data.action,
        retreatDestination: data.retreatDestination,
      },
    },
  })
}

export interface AdminSupportRequestData {
  name: string
  email: string
  subject: string
  message: string
}

/**
 * Send notification to admin when a support/contact request is submitted
 */
export async function sendAdminSupportRequestNotification(data: AdminSupportRequestData) {
  // Check if this notification is enabled
  if (!await isNotificationEnabled('notifyOnSupportRequest')) {
    console.log('Admin support request notification is disabled')
    return
  }

  const adminEmail = await getAdminNotificationEmail('support')
  if (!adminEmail) {
    console.log('No admin email configured for support notifications')
    return
  }

  const emailSubject = `Support Request: ${data.subject}`
  const htmlContent = `
    <h2>New Support Request</h2>

    <div class="highlight-box">
      <p><strong>From:</strong> ${escapeHtml(data.name)}</p>
      <p><strong>Email:</strong> ${escapeHtml(data.email)}</p>
      <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
    </div>

    <h3>Message</h3>
    <div class="highlight-box">
      <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
    </div>

    <p style="text-align: center; margin: 30px 0;">
      <a href="mailto:${escapeHtml(data.email)}?subject=Re: ${encodeURIComponent(data.subject)}" class="button">Reply to Customer</a>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: adminEmail,
    subject: emailSubject,
    html: fullHtml,
    logContext: {
      emailType: 'admin_support_request',
      recipientType: 'admin',
      metadata: {
        customerEmail: data.email,
        customerName: data.name,
        subject: data.subject,
      },
    },
  })
}

/**
 * Send confirmation email to customer when they submit a contact form
 */
export async function sendContactFormConfirmation(data: {
  name: string
  email: string
  subject: string
}) {
  const emailSubject = `We received your message: ${data.subject}`
  const htmlContent = `
    <h2>Thank You for Contacting Us!</h2>

    <p>Hi ${escapeHtml(data.name)},</p>

    <p>We have received your message and will get back to you as soon as possible, usually within 24-48 hours.</p>

    <div class="highlight-box">
      <p><strong>Subject:</strong> ${escapeHtml(data.subject)}</p>
    </div>

    <p>In the meantime, feel free to:</p>
    <ul>
      <li>Browse our <a href="${SITE_URL}/retreats">upcoming retreats</a></li>
      <li>Read our <a href="${SITE_URL}/blog">blog</a> for surf tips and stories</li>
      <li>Follow us on social media for the latest updates</li>
    </ul>

    <p>We look forward to helping you catch your perfect wave!</p>

    <p style="margin-top: 30px;">
      Warm regards,<br>
      <strong>Rainbow Surf Retreats Team</strong>
    </p>
  `

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({
    to: data.email,
    subject: emailSubject,
    html: fullHtml,
    logContext: {
      emailType: 'contact_form_confirmation',
      recipientType: 'customer',
      metadata: {
        customerEmail: data.email,
        customerName: data.name,
        subject: data.subject,
      },
    },
  })
}
