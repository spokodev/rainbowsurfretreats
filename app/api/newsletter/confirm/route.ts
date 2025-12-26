import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendEmail } from '@/lib/email'

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'

// GET /api/newsletter/confirm?token=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/error?reason=missing_token`)
    }

    const supabase = getSupabase()

    // Find token
    const { data: tokenData, error: tokenError } = await supabase
      .from('newsletter_tokens')
      .select('*, subscriber:newsletter_subscribers(*)')
      .eq('token', token)
      .eq('type', 'confirm')
      .single()

    if (tokenError || !tokenData) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/error?reason=invalid_token`)
    }

    // Check if expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/error?reason=expired_token`)
    }

    // Check if already used
    if (tokenData.used_at) {
      return NextResponse.redirect(`${SITE_URL}/newsletter/success?already=true`)
    }

    const subscriber = tokenData.subscriber

    // Activate subscriber
    await supabase
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', subscriber.id)

    // Mark token as used
    await supabase
      .from('newsletter_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('id', tokenData.id)

    // Send welcome email with quiz
    if (!subscriber.welcome_email_sent) {
      await sendWelcomeEmail(subscriber)
      await supabase
        .from('newsletter_subscribers')
        .update({ welcome_email_sent: true })
        .eq('id', subscriber.id)
    }

    return NextResponse.redirect(`${SITE_URL}/newsletter/success`)
  } catch (error) {
    console.error('Confirmation error:', error)
    return NextResponse.redirect(`${SITE_URL}/newsletter/error?reason=server_error`)
  }
}

async function sendWelcomeEmail(subscriber: {
  id: string
  email: string
  first_name?: string
  language: string
}) {
  const quizUrl = `${SITE_URL}/newsletter/quiz?subscriber=${subscriber.id}`

  const translations: Record<string, {
    subject: string
    heading: string
    intro: string
    quizIntro: string
    quizButton: string
    benefits: string[]
    signature: string
  }> = {
    en: {
      subject: 'Welcome to Rainbow Surf Retreats!',
      heading: 'Welcome to the Rainbow Surf Family!',
      intro: 'Thank you for joining our community of surf enthusiasts. We\'re excited to have you with us!',
      quizIntro: 'Help us personalize your experience by telling us a bit about yourself:',
      quizButton: 'Take the Quick Quiz',
      benefits: [
        'Early access to new retreat announcements',
        'Exclusive discounts and offers',
        'Surf tips and destination guides',
        'Community stories and updates',
      ],
      signature: 'See you in the water!',
    },
    de: {
      subject: 'Willkommen bei Rainbow Surf Retreats!',
      heading: 'Willkommen in der Rainbow Surf Familie!',
      intro: 'Vielen Dank, dass du unserer Community von Surf-Enthusiasten beigetreten bist. Wir freuen uns, dich dabei zu haben!',
      quizIntro: 'Hilf uns, dein Erlebnis zu personalisieren, indem du uns ein bisschen über dich erzählst:',
      quizButton: 'Kurzes Quiz machen',
      benefits: [
        'Frühzeitiger Zugang zu neuen Retreat-Ankündigungen',
        'Exklusive Rabatte und Angebote',
        'Surftipps und Reiseführer',
        'Community-Geschichten und Updates',
      ],
      signature: 'Wir sehen uns im Wasser!',
    },
    es: {
      subject: '¡Bienvenido a Rainbow Surf Retreats!',
      heading: '¡Bienvenido a la familia Rainbow Surf!',
      intro: 'Gracias por unirte a nuestra comunidad de entusiastas del surf. ¡Estamos emocionados de tenerte con nosotros!',
      quizIntro: 'Ayúdanos a personalizar tu experiencia contándonos un poco sobre ti:',
      quizButton: 'Hacer el cuestionario rápido',
      benefits: [
        'Acceso anticipado a nuevos anuncios de retiros',
        'Descuentos y ofertas exclusivas',
        'Consejos de surf y guías de destinos',
        'Historias y actualizaciones de la comunidad',
      ],
      signature: '¡Nos vemos en el agua!',
    },
    fr: {
      subject: 'Bienvenue chez Rainbow Surf Retreats!',
      heading: 'Bienvenue dans la famille Rainbow Surf!',
      intro: 'Merci d\'avoir rejoint notre communauté de passionnés de surf. Nous sommes ravis de vous avoir parmi nous!',
      quizIntro: 'Aidez-nous à personnaliser votre expérience en nous parlant un peu de vous:',
      quizButton: 'Faire le quiz rapide',
      benefits: [
        'Accès anticipé aux nouvelles annonces de retraites',
        'Réductions et offres exclusives',
        'Conseils de surf et guides de destinations',
        'Histoires et mises à jour de la communauté',
      ],
      signature: 'À bientôt dans l\'eau!',
    },
    nl: {
      subject: 'Welkom bij Rainbow Surf Retreats!',
      heading: 'Welkom bij de Rainbow Surf Familie!',
      intro: 'Bedankt voor het lid worden van onze community van surfliefhebbers. We zijn blij dat je erbij bent!',
      quizIntro: 'Help ons je ervaring te personaliseren door ons iets over jezelf te vertellen:',
      quizButton: 'Doe de snelle quiz',
      benefits: [
        'Vroege toegang tot nieuwe retreat-aankondigingen',
        'Exclusieve kortingen en aanbiedingen',
        'Surftips en bestemmingsgidsen',
        'Community verhalen en updates',
      ],
      signature: 'Tot ziens in het water!',
    },
  }

  const t = translations[subscriber.language] || translations.en
  const greeting = subscriber.first_name ? `Hi ${subscriber.first_name}!` : 'Hi there!'

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
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #0ea5e9; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 20px 0; }
    .benefits { background: #f0f9ff; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .benefits ul { margin: 0; padding-left: 20px; }
    .benefits li { margin: 8px 0; }
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
      <p>${t.intro}</p>

      <div class="benefits">
        <strong>What you'll receive:</strong>
        <ul>
          ${t.benefits.map(b => `<li>${b}</li>`).join('')}
        </ul>
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <p>${t.quizIntro}</p>
        <a href="${quizUrl}" class="button">${t.quizButton}</a>
      </div>

      <p>${t.signature}<br>The Rainbow Surf Team</p>
    </div>
    <div class="footer">
      <p>Rainbow Surf Retreats</p>
      <p style="font-size: 12px;">
        <a href="${SITE_URL}/api/newsletter/unsubscribe?email=${subscriber.email}" style="color: #94a3b8;">Unsubscribe</a>
      </p>
    </div>
  </div>
</body>
</html>
`

  await sendEmail({
    to: subscriber.email,
    subject: t.subject,
    html,
  })
}
