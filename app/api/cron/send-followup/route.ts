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

// Translations for follow-up email
const translations = {
  en: {
    subject: (destination: string) => `How was your ${destination} retreat? Share your experience!`,
    title: (destination: string) => `How was your ${destination} adventure?`,
    greeting: (firstName: string) => `Hi ${firstName},`,
    intro: (destination: string) => `We hope you had an amazing time at our ${destination} Surf Retreat! We'd love to hear about your experience.`,
    helpText: 'Your feedback helps us improve and helps others discover our community:',
    feedbackButton: 'Share Your Feedback',
    googleReviewText: 'Or leave us a Google Review:',
    googleButton: 'Leave Google Review',
    onlyTakes: 'It only takes 2 minutes and means the world to us!',
    thankYou: 'Thank you for being part of the Rainbow Surf family. We hope to see you again soon!',
    signature: 'With gratitude,<br>The Rainbow Surf Team',
    unsubscribe: 'Unsubscribe',
  },
  de: {
    subject: (destination: string) => `Wie war dein ${destination} Retreat? Teile deine Erfahrung!`,
    title: (destination: string) => `Wie war dein ${destination} Abenteuer?`,
    greeting: (firstName: string) => `Hallo ${firstName},`,
    intro: (destination: string) => `Wir hoffen, du hattest eine tolle Zeit bei unserem ${destination} Surf Retreat! Wir würden gerne von deiner Erfahrung hören.`,
    helpText: 'Dein Feedback hilft uns, besser zu werden und anderen dabei, unsere Community zu entdecken:',
    feedbackButton: 'Feedback teilen',
    googleReviewText: 'Oder hinterlasse uns eine Google-Bewertung:',
    googleButton: 'Google Bewertung',
    onlyTakes: 'Es dauert nur 2 Minuten und bedeutet uns sehr viel!',
    thankYou: 'Danke, dass du Teil der Rainbow Surf Familie bist. Wir hoffen, dich bald wiederzusehen!',
    signature: 'Mit Dankbarkeit,<br>Das Rainbow Surf Team',
    unsubscribe: 'Abmelden',
  },
  es: {
    subject: (destination: string) => `¿Cómo fue tu retiro en ${destination}? ¡Comparte tu experiencia!`,
    title: (destination: string) => `¿Cómo fue tu aventura en ${destination}?`,
    greeting: (firstName: string) => `Hola ${firstName},`,
    intro: (destination: string) => `¡Esperamos que hayas pasado un tiempo increíble en nuestro Retiro de Surf ${destination}! Nos encantaría conocer tu experiencia.`,
    helpText: 'Tus comentarios nos ayudan a mejorar y a otros a descubrir nuestra comunidad:',
    feedbackButton: 'Comparte tu opinión',
    googleReviewText: 'O déjanos una reseña en Google:',
    googleButton: 'Reseña en Google',
    onlyTakes: '¡Solo toma 2 minutos y significa mucho para nosotros!',
    thankYou: 'Gracias por ser parte de la familia Rainbow Surf. ¡Esperamos verte pronto!',
    signature: 'Con gratitud,<br>El equipo de Rainbow Surf',
    unsubscribe: 'Darse de baja',
  },
  fr: {
    subject: (destination: string) => `Comment était votre retraite à ${destination} ? Partagez votre expérience !`,
    title: (destination: string) => `Comment était votre aventure à ${destination} ?`,
    greeting: (firstName: string) => `Bonjour ${firstName},`,
    intro: (destination: string) => `Nous espérons que vous avez passé un moment incroyable lors de notre retraite de surf à ${destination} ! Nous aimerions connaître votre expérience.`,
    helpText: 'Vos retours nous aident à nous améliorer et aident les autres à découvrir notre communauté :',
    feedbackButton: 'Partagez votre avis',
    googleReviewText: 'Ou laissez-nous un avis Google :',
    googleButton: 'Avis Google',
    onlyTakes: 'Cela ne prend que 2 minutes et compte énormément pour nous !',
    thankYou: 'Merci de faire partie de la famille Rainbow Surf. Nous espérons vous revoir bientôt !',
    signature: 'Avec gratitude,<br>L\'équipe Rainbow Surf',
    unsubscribe: 'Se désabonner',
  },
  nl: {
    subject: (destination: string) => `Hoe was je ${destination} retreat? Deel je ervaring!`,
    title: (destination: string) => `Hoe was je ${destination} avontuur?`,
    greeting: (firstName: string) => `Hoi ${firstName},`,
    intro: (destination: string) => `We hopen dat je een geweldige tijd hebt gehad bij onze ${destination} Surf Retreat! We horen graag over je ervaring.`,
    helpText: 'Je feedback helpt ons verbeteren en helpt anderen onze community te ontdekken:',
    feedbackButton: 'Deel je feedback',
    googleReviewText: 'Of laat een Google Review achter:',
    googleButton: 'Google Review',
    onlyTakes: 'Het duurt maar 2 minuten en betekent heel veel voor ons!',
    thankYou: 'Bedankt dat je deel uitmaakt van de Rainbow Surf familie. We hopen je snel weer te zien!',
    signature: 'Met dank,<br>Het Rainbow Surf Team',
    unsubscribe: 'Uitschrijven',
  },
}

// POST /api/cron/send-followup - Send follow-up emails after retreats
export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error('CRON_SECRET not configured - rejecting request')
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 })
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabase()

  try {
    // Find bookings where retreat ended 2 days ago and no feedback yet
    const twoDaysAgo = new Date()
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
    const twoDaysAgoDate = twoDaysAgo.toISOString().split('T')[0]

    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select(`
        id,
        booking_number,
        first_name,
        last_name,
        email,
        language,
        retreat_id,
        retreat:retreats(destination, end_date)
      `)
      .eq('status', 'confirmed')
      .eq('payment_status', 'paid')

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    let sentCount = 0

    for (const booking of bookings || []) {
      const retreat = Array.isArray(booking.retreat) ? booking.retreat[0] : booking.retreat
      if (!retreat?.end_date) continue

      // Check if retreat ended exactly 2 days ago
      if (retreat.end_date !== twoDaysAgoDate) continue

      // Check if feedback already exists
      const { data: existingFeedback } = await supabase
        .from('retreat_feedback')
        .select('id')
        .eq('booking_id', booking.id)
        .single()

      if (existingFeedback) continue

      // Send follow-up email
      try {
        await sendFollowUpEmail({
          email: booking.email,
          firstName: booking.first_name,
          bookingId: booking.id,
          retreatDestination: retreat.destination,
          language: booking.language || 'en',
        })
        console.log(`[Followup] Sent follow-up to ${booking.email} in ${booking.language || 'en'}`)
        sentCount++
      } catch (err) {
        console.error(`Failed to send follow-up to ${booking.email}:`, err)
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${sentCount} follow-up emails`,
    })
  } catch (error) {
    console.error('Follow-up cron error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function sendFollowUpEmail(data: {
  email: string
  firstName: string
  bookingId: string
  retreatDestination: string
  language: string
}) {
  const lang = (data.language as keyof typeof translations) || 'en'
  const t = translations[lang] || translations.en

  const feedbackUrl = `${SITE_URL}/feedback?booking=${data.bookingId}`
  const googleReviewUrl = 'https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review' // TODO: Replace with actual Google review link

  const html = `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: linear-gradient(135deg, #0ea5e9 0%, #06b6d4 100%); padding: 30px 20px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; }
    .content { padding: 40px 30px; }
    .button { display: inline-block; background: #0ea5e9; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 5px; }
    .button-google { background: #ea4335; }
    .star-rating { font-size: 32px; margin: 20px 0; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px; }
    .footer a { color: #0ea5e9; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Rainbow Surf Retreats</h1>
    </div>
    <div class="content">
      <h2>${t.title(data.retreatDestination)}</h2>

      <p>${t.greeting(data.firstName)}</p>

      <p>${t.intro(data.retreatDestination)}</p>

      <p>${t.helpText}</p>

      <div style="text-align: center; margin: 30px 0;">
        <div class="star-rating">⭐⭐⭐⭐⭐</div>

        <a href="${feedbackUrl}" class="button">${t.feedbackButton}</a>

        <p style="margin-top: 20px;">${t.googleReviewText}</p>

        <a href="${googleReviewUrl}" class="button button-google">${t.googleButton}</a>
      </div>

      <p style="font-size: 14px; color: #666;">
        ${t.onlyTakes}
      </p>

      <p>${t.thankYou}</p>

      <p>${t.signature}</p>
    </div>
    <div class="footer">
      <p>Rainbow Surf Retreats</p>
      <p style="font-size: 12px;">
        <a href="${SITE_URL}/api/newsletter/unsubscribe?email=${data.email}">${t.unsubscribe}</a>
      </p>
    </div>
  </div>
</body>
</html>
`

  await sendEmail({
    to: data.email,
    subject: t.subject(data.retreatDestination),
    html,
  })
}

// GET for manual trigger or testing
export async function GET(request: NextRequest) {
  return POST(request)
}
