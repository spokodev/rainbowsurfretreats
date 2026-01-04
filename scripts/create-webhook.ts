import Stripe from 'stripe'

async function createWebhook() {
  const stripeKey = process.env.STRIPE_SECRET_KEY?.trim()
  if (!stripeKey) {
    console.error('STRIPE_SECRET_KEY not found')
    process.exit(1)
  }

  const stripe = new Stripe(stripeKey)

  const webhookUrl = 'https://rainbowsurfretreats.spoko.dev/api/stripe/webhook'

  // Check existing webhooks
  console.log('Checking existing webhooks...')
  const existingWebhooks = await stripe.webhookEndpoints.list({ limit: 100 })

  const existingWebhook = existingWebhooks.data.find(w => w.url === webhookUrl)

  if (existingWebhook) {
    console.log('Webhook already exists:')
    console.log('  ID:', existingWebhook.id)
    console.log('  URL:', existingWebhook.url)
    console.log('  Status:', existingWebhook.status)
    console.log('  Events:', existingWebhook.enabled_events)

    // Update if needed
    console.log('\nUpdating webhook events...')
    const updated = await stripe.webhookEndpoints.update(existingWebhook.id, {
      enabled_events: [
        'checkout.session.completed',
        'payment_intent.succeeded',
        'payment_intent.payment_failed',
        'charge.refunded',
      ],
    })
    console.log('Updated! Secret starts with:', updated.secret?.substring(0, 10) + '...')
    return
  }

  console.log('Creating new webhook...')
  const webhook = await stripe.webhookEndpoints.create({
    url: webhookUrl,
    enabled_events: [
      'checkout.session.completed',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'charge.refunded',
    ],
    description: 'Rainbow Surf Retreats production webhook',
  })

  console.log('\n✅ Webhook created successfully!')
  console.log('  ID:', webhook.id)
  console.log('  URL:', webhook.url)
  console.log('  Status:', webhook.status)
  console.log('\n⚠️  IMPORTANT: Save this webhook secret!')
  console.log('  STRIPE_WEBHOOK_SECRET=' + webhook.secret)
  console.log('\nAdd this to your Vercel environment variables.')
}

createWebhook().catch(console.error)
