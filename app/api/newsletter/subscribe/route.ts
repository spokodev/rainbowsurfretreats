import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail, FROM_EMAIL } from '@/lib/email'
import { escapeHtml } from '@/lib/utils/html-escape'
import { newsletterSubscribeSchema } from '@/lib/validations/booking'
import { checkRateLimit, getClientIp, rateLimitPresets, rateLimitHeaders } from '@/lib/utils/rate-limit'
import crypto from 'crypto'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// Generate secure token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// POST /api/newsletter/subscribe
export async function POST(request: NextRequest) {
  // Rate limiting - 3 requests per minute per IP
  const clientIp = getClientIp(request)
  const rateLimitResult = checkRateLimit(clientIp, rateLimitPresets.newsletter)

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429, headers: rateLimitHeaders(rateLimitResult) }
    )
  }

  try {
    const body = await request.json()

    // Validate input with Zod schema
    const validation = newsletterSubscribeSchema.safeParse(body)
    if (!validation.success) {
      const firstError = validation.error.issues[0]
      return NextResponse.json({ error: firstError.message }, { status: 400 })
    }

    const { email, firstName, source, language } = validation.data

    const supabase = getSupabase()

    // Check if already subscribed
    const { data: existing } = await supabase
      .from('newsletter_subscribers')
      .select('id, status')
      .eq('email', email.toLowerCase())
      .single()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({
          message: 'Already subscribed',
          status: 'already_subscribed'
        })
      }

      // Reactivate if unsubscribed
      if (existing.status === 'unsubscribed') {
        const token = generateToken()

        await supabase
          .from('newsletter_subscribers')
          .update({
            status: 'pending',
            unsubscribed_at: null,
            language,
          })
          .eq('id', existing.id)

        // Create confirmation token
        await supabase.from('newsletter_tokens').insert({
          subscriber_id: existing.id,
          token,
          type: 'confirm',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })

        // Send confirmation email
        await sendConfirmationEmail(email, token, language, firstName)

        return NextResponse.json({
          message: 'Please check your email to confirm subscription',
          status: 'confirmation_sent'
        })
      }
    }

    // Create new subscriber
    const { data: subscriber, error: subError } = await supabase
      .from('newsletter_subscribers')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName || null,
        source,
        language,
        status: 'pending',
      })
      .select()
      .single()

    if (subError) {
      console.error('Subscriber creation error:', subError)
      return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }

    // Create confirmation token
    const token = generateToken()
    await supabase.from('newsletter_tokens').insert({
      subscriber_id: subscriber.id,
      token,
      type: 'confirm',
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    })

    // Send confirmation email
    await sendConfirmationEmail(email, token, language, firstName)

    return NextResponse.json({
      message: 'Please check your email to confirm subscription',
      status: 'confirmation_sent'
    })
  } catch (error) {
    console.error('Newsletter subscribe error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendConfirmationEmail(email: string, token: string, language: string, firstName?: string) {
  const confirmUrl = `${SITE_URL}/api/newsletter/confirm?token=${token}`

  const translations: Record<string, { subject: string; heading: string; text: string; button: string }> = {
    en: {
      subject: 'Confirm your subscription - Rainbow Surf Retreats',
      heading: 'Welcome to our community!',
      text: 'Please click the button below to confirm your subscription and receive our updates about retreats, surf tips, and exclusive offers.',
      button: 'Confirm Subscription',
    },
    de: {
      subject: 'Bestätigen Sie Ihr Abonnement - Rainbow Surf Retreats',
      heading: 'Willkommen in unserer Community!',
      text: 'Bitte klicken Sie auf die Schaltfläche unten, um Ihr Abonnement zu bestätigen und Updates über Retreats, Surftipps und exklusive Angebote zu erhalten.',
      button: 'Abonnement bestätigen',
    },
    es: {
      subject: 'Confirma tu suscripción - Rainbow Surf Retreats',
      heading: '¡Bienvenido a nuestra comunidad!',
      text: 'Haz clic en el botón de abajo para confirmar tu suscripción y recibir nuestras actualizaciones sobre retiros, consejos de surf y ofertas exclusivas.',
      button: 'Confirmar suscripción',
    },
    fr: {
      subject: 'Confirmez votre inscription - Rainbow Surf Retreats',
      heading: 'Bienvenue dans notre communauté!',
      text: 'Veuillez cliquer sur le bouton ci-dessous pour confirmer votre inscription et recevoir nos mises à jour sur les retraites, conseils de surf et offres exclusives.',
      button: 'Confirmer l\'inscription',
    },
    nl: {
      subject: 'Bevestig je inschrijving - Rainbow Surf Retreats',
      heading: 'Welkom in onze community!',
      text: 'Klik op de onderstaande knop om je inschrijving te bevestigen en updates te ontvangen over retreats, surftips en exclusieve aanbiedingen.',
      button: 'Inschrijving bevestigen',
    },
  }

  const t = translations[language] || translations.en
  // Escape user input to prevent XSS in email clients
  const safeFirstName = escapeHtml(firstName)
  const greeting = safeFirstName ? `Hi ${safeFirstName}!` : 'Hi there!'

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; text-align: center; }
    .button { display: inline-block; background: #0ea5e9; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rainbow Surf Retreats</h1>
    </div>
    <div class="content">
      <h2>${t.heading}</h2>
      <p>${greeting}</p>
      <p>${t.text}</p>
      <a href="${confirmUrl}" class="button">${t.button}</a>
      <p style="font-size: 12px; color: #666; margin-top: 30px;">
        If the button doesn't work, copy and paste this link:<br>
        <a href="${confirmUrl}" style="color: #0ea5e9;">${confirmUrl}</a>
      </p>
    </div>
    <div class="footer">
      <p>Rainbow Surf Retreats</p>
    </div>
  </div>
</body>
</html>
`

  await sendEmail({
    to: email,
    subject: t.subject,
    html,
  })
}
