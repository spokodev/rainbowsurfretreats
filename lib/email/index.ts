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

export const FROM_EMAIL = process.env.FROM_EMAIL || 'Rainbow Surf Retreats <noreply@rainbowsurfretreats.com>'
export const REPLY_TO_EMAIL = process.env.REPLY_TO_EMAIL || 'info@rainbowsurfretreats.com'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export async function sendEmail(options: SendEmailOptions) {
  const resend = getResend()

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
      throw new Error(error.message)
    }

    console.log('Email sent successfully:', data?.id)
    return data
  } catch (error) {
    console.error('Failed to send email:', error)
    throw error
  }
}

// Template rendering
function renderTemplate(template: string, data: Record<string, unknown>): string {
  let result = template

  // Handle {{#if variable}}...{{/if}} conditionals
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_, variable, content) => {
    return data[variable] ? content : ''
  })

  // Handle {{variable}} replacements
  result = result.replace(/\{\{(\w+)\}\}/g, (_, variable) => {
    const value = data[variable]
    if (value === undefined || value === null) return ''
    return String(value)
  })

  return result
}

// Email layout wrapper
function wrapInLayout(content: string): string {
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
    return sendEmail({ to: data.email, subject, html: htmlContent })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
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
    return sendEmail({ to: data.email, subject, html: paymentConfirmationEmail(data) })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
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

  const templateData: Record<string, unknown> = {
    ...data,
    amount: data.amount.toFixed(2),
    dueDate: new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    title,
    message,
    isOverdue: urgency === 'overdue',
    paymentUrl: `${SITE_URL}/booking/pay?booking_id=${data.bookingNumber}`,
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
    return sendEmail({ to: data.email, subject, html: paymentReminderEmail(data, urgency) })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
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
    return sendEmail({ to: data.email, subject, html: paymentFailedEmail(data) })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
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
    return sendEmail({ to: data.email, subject, html: preRetreatReminderEmail(data) })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
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
    return sendEmail({ to: data.email, subject, html: refundConfirmationEmail(data) })
  }

  const fullHtml = wrapInLayout(htmlContent)
  return sendEmail({ to: data.email, subject, html: fullHtml })
}
