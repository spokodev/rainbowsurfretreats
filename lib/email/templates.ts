import type { BookingData, PaymentData, ReminderData } from './index'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://rainbowsurfretreats.com'
const LOGO_URL = `${SITE_URL}/images/logo.png`

// Base email layout
function emailLayout(content: string, preheader: string = ''): string {
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
    .header img { max-width: 180px; height: auto; }
    .header h1 { color: #ffffff; margin: 15px 0 0; font-size: 24px; font-weight: 600; }
    .content { padding: 40px 30px; }
    .content h2 { color: #0ea5e9; margin-top: 0; }
    .highlight-box { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .payment-schedule { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .payment-item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
    .payment-item:last-child { border-bottom: none; }
    .amount { font-size: 24px; font-weight: 700; color: #0ea5e9; }
    .button { display: inline-block; background: #0ea5e9; color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 10px 0; }
    .button:hover { background: #0284c7; }
    .button-secondary { background: #64748b; }
    .footer { background: #1e293b; color: #94a3b8; padding: 30px; text-align: center; font-size: 14px; }
    .footer a { color: #0ea5e9; text-decoration: none; }
    .social-links { margin: 20px 0; }
    .social-links a { display: inline-block; margin: 0 10px; }
    .divider { height: 1px; background: #e2e8f0; margin: 30px 0; }
    .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 20px 0; }
    .info-item { padding: 10px; background: #f8fafc; border-radius: 6px; }
    .info-label { font-size: 12px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
    .info-value { font-weight: 600; color: #1e293b; margin-top: 4px; }
    .warning-box { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    .success-box { background: #d1fae5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0; border-radius: 0 8px 8px 0; }
    @media only screen and (max-width: 600px) {
      .content { padding: 20px 15px; }
      .info-grid { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden;">
    ${preheader}
  </div>
  <div class="container">
    <div class="header">
      <img src="${LOGO_URL}" alt="Rainbow Surf Retreats" />
      <h1>Rainbow Surf Retreats</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Rainbow Surf Retreats</strong></p>
      <p>Catch the perfect wave, find your inner peace</p>
      <div class="social-links">
        <a href="https://instagram.com/rainbowsurfretreats">Instagram</a> |
        <a href="https://facebook.com/rainbowsurfretreats">Facebook</a>
      </div>
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

// Booking Confirmation Email
export function bookingConfirmationEmail(data: BookingData): string {
  const paymentScheduleHtml = data.paymentSchedule
    ? `
      <div class="payment-schedule">
        <h3 style="margin-top: 0;">Payment Schedule</h3>
        ${data.paymentSchedule
          .map(
            (p) => `
          <div class="payment-item">
            <div>
              <strong>Payment ${p.number}</strong><br>
              <span style="color: #64748b; font-size: 14px;">${p.description}</span><br>
              <span style="color: #64748b; font-size: 14px;">Due: ${new Date(p.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div style="text-align: right;">
              <strong style="font-size: 18px;">€${p.amount.toFixed(2)}</strong>
            </div>
          </div>
        `
          )
          .join('')}
      </div>
    `
    : ''

  const earlyBirdHtml = data.isEarlyBird
    ? `
      <div class="success-box">
        <strong>Early Bird Discount Applied!</strong><br>
        You saved €${data.earlyBirdDiscount?.toFixed(2)} on your booking.
      </div>
    `
    : ''

  const content = `
    <h2>Booking Confirmed!</h2>
    <p>Dear ${data.firstName},</p>
    <p>Thank you for booking your surf retreat adventure with us! We're thrilled to have you join our community of wave riders.</p>

    <div class="highlight-box">
      <div style="font-size: 14px; color: #64748b;">Booking Reference</div>
      <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">${data.bookingNumber}</div>
    </div>

    ${earlyBirdHtml}

    <h3>Retreat Details</h3>
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Destination</div>
        <div class="info-value">${data.retreatDestination}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dates</div>
        <div class="info-value">${data.retreatDates}</div>
      </div>
      ${data.roomName ? `
      <div class="info-item">
        <div class="info-label">Room Type</div>
        <div class="info-value">${data.roomName}</div>
      </div>
      ` : ''}
      <div class="info-item">
        <div class="info-label">Total Amount</div>
        <div class="info-value">€${data.totalAmount.toFixed(2)}</div>
      </div>
    </div>

    ${paymentScheduleHtml}

    <div class="divider"></div>

    <h3>What's Next?</h3>
    <ol>
      <li><strong>Check your email</strong> - We'll send payment reminders before each due date</li>
      <li><strong>Prepare for adventure</strong> - Start getting excited about your surf retreat!</li>
      <li><strong>Pack your bags</strong> - We'll send you a packing list 6 weeks before your retreat</li>
    </ol>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${SITE_URL}/booking?booking_id=${data.bookingNumber}" class="button">View Your Booking</a>
    </p>

    <p>If you have any questions, don't hesitate to reach out to us!</p>
    <p>See you on the waves!</p>
    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `Your booking ${data.bookingNumber} for ${data.retreatDestination} is confirmed!`)
}

// Payment Confirmation Email
export function paymentConfirmationEmail(data: PaymentData): string {
  const nextPaymentHtml = data.nextPaymentDate
    ? `
      <div class="warning-box">
        <strong>Next Payment Due</strong><br>
        €${data.nextPaymentAmount?.toFixed(2)} due on ${new Date(data.nextPaymentDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    `
    : `
      <div class="success-box">
        <strong>Fully Paid!</strong><br>
        Your retreat is fully paid. No more payments required.
      </div>
    `

  const content = `
    <h2>Payment Received</h2>
    <p>Dear ${data.firstName},</p>
    <p>We've received your payment. Thank you!</p>

    <div class="highlight-box">
      <div style="font-size: 14px; color: #64748b;">${data.paymentDescription}</div>
      <div class="amount">€${data.amount.toFixed(2)}</div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Booking Reference</div>
        <div class="info-value">${data.bookingNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Retreat</div>
        <div class="info-value">${data.retreatDestination}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Remaining Balance</div>
        <div class="info-value">€${data.remainingBalance.toFixed(2)}</div>
      </div>
    </div>

    ${nextPaymentHtml}

    <p style="text-align: center; margin-top: 30px;">
      <a href="${SITE_URL}/booking?booking_id=${data.bookingNumber}" class="button">View Your Booking</a>
    </p>

    <p>Thank you for choosing Rainbow Surf Retreats!</p>
    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `Payment of €${data.amount.toFixed(2)} received for your ${data.retreatDestination} retreat`)
}

// Payment Reminder Email
export function paymentReminderEmail(data: ReminderData, urgency: 'week' | 'days' | 'tomorrow' | 'today' | 'overdue'): string {
  const urgencyMessages = {
    week: { title: 'Payment Reminder', message: `Your payment is due in 7 days.`, boxClass: 'highlight-box' },
    days: { title: 'Payment Due Soon', message: `Your payment is due in 3 days.`, boxClass: 'warning-box' },
    tomorrow: { title: 'Payment Due Tomorrow', message: `Your payment is due tomorrow!`, boxClass: 'warning-box' },
    today: { title: 'Payment Due Today', message: `Your payment is due today.`, boxClass: 'warning-box' },
    overdue: { title: 'Payment Overdue', message: `Your payment is overdue. Please pay as soon as possible to secure your booking.`, boxClass: 'warning-box' },
  }

  const { title, message, boxClass } = urgencyMessages[urgency]

  // Use payNowUrl if provided (early payment), otherwise fallback to legacy URL
  const paymentUrl = data.payNowUrl || `${SITE_URL}/booking/pay?booking_id=${data.bookingNumber}`

  const content = `
    <h2>${title}</h2>
    <p>Dear ${data.firstName},</p>
    <p>${message}</p>

    <div class="${boxClass}">
      <div style="font-size: 14px; color: #64748b;">Payment ${data.paymentNumber} Due</div>
      <div class="amount">€${data.amount.toFixed(2)}</div>
      <div style="margin-top: 10px;">
        <strong>Due Date:</strong> ${new Date(data.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
      </div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Booking Reference</div>
        <div class="info-value">${data.bookingNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Retreat</div>
        <div class="info-value">${data.retreatDestination}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Dates</div>
        <div class="info-value">${data.retreatDates}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Days Until Retreat</div>
        <div class="info-value">${data.daysUntilRetreat} days</div>
      </div>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${paymentUrl}" class="button">Pay Now (€${data.amount.toFixed(2)})</a>
    </p>

    <p style="font-size: 14px; color: #64748b; text-align: center;">
      Click the button above to pay now, or wait for the automatic charge on the due date.
    </p>

    <p style="font-size: 14px; color: #64748b;">
      If you've already made this payment, please disregard this email. It may take a few hours for payments to be reflected in our system.
    </p>

    <p>Questions? Reply to this email or contact us at info@rainbowsurfretreats.com</p>
    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `${title}: €${data.amount.toFixed(2)} due for your ${data.retreatDestination} retreat`)
}

// Pre-Retreat Reminder Email (6 weeks before)
export function preRetreatReminderEmail(data: {
  firstName: string
  lastName: string
  email: string
  bookingNumber: string
  retreatDestination: string
  retreatDates: string
  retreatStartDate: string
  daysUntilRetreat: number
}): string {
  const content = `
    <h2>Your Adventure Awaits!</h2>
    <p>Dear ${data.firstName},</p>
    <p>Can you believe it? Your surf retreat in <strong>${data.retreatDestination}</strong> is just <strong>${data.daysUntilRetreat} days away</strong>!</p>

    <div class="highlight-box">
      <div style="font-size: 14px; color: #64748b;">Retreat Dates</div>
      <div style="font-size: 20px; font-weight: 700; color: #0ea5e9;">${data.retreatDates}</div>
    </div>

    <h3>Packing Essentials</h3>
    <ul>
      <li><strong>Swimwear</strong> - Multiple sets recommended</li>
      <li><strong>Sunscreen</strong> - SPF 50+ reef-safe sunscreen</li>
      <li><strong>Rash guard</strong> - Protects from sun and board rash</li>
      <li><strong>Flip flops/sandals</strong> - For the beach</li>
      <li><strong>Light clothing</strong> - Breathable fabrics for the tropical climate</li>
      <li><strong>Hat & sunglasses</strong> - Sun protection essentials</li>
      <li><strong>Reusable water bottle</strong> - Stay hydrated!</li>
      <li><strong>Travel adapter</strong> - Check the plug type for ${data.retreatDestination}</li>
    </ul>

    <div class="divider"></div>

    <h3>What to Expect</h3>
    <ul>
      <li>Daily surf sessions with experienced instructors</li>
      <li>Yoga and meditation classes</li>
      <li>Delicious healthy meals</li>
      <li>Amazing new friends from around the world</li>
      <li>Unforgettable sunset sessions</li>
    </ul>

    <h3>Before You Go</h3>
    <ul>
      <li>Check your passport validity (6+ months recommended)</li>
      <li>Review visa requirements for ${data.retreatDestination}</li>
      <li>Arrange travel insurance</li>
      <li>Book your flights if you haven't already</li>
      <li>Check our FAQ for airport transfer options</li>
    </ul>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${SITE_URL}/booking?booking_id=${data.bookingNumber}" class="button">View Booking Details</a>
    </p>

    <p>We can't wait to see you on the beach!</p>
    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `${data.daysUntilRetreat} days until your ${data.retreatDestination} surf retreat!`)
}

// Payment Failed Email
export function paymentFailedEmail(data: ReminderData & { failureReason?: string }): string {
  const content = `
    <h2>Payment Failed</h2>
    <p>Dear ${data.firstName},</p>
    <p>Unfortunately, we were unable to process your scheduled payment.</p>

    <div class="warning-box">
      <div style="font-size: 14px; color: #92400e;">Payment ${data.paymentNumber}</div>
      <div class="amount" style="color: #dc2626;">€${data.amount.toFixed(2)}</div>
      ${data.failureReason ? `<p style="margin-top: 10px; font-size: 14px;">Reason: ${data.failureReason}</p>` : ''}
    </div>

    <p>Please update your payment method or make a manual payment to secure your booking.</p>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Booking Reference</div>
        <div class="info-value">${data.bookingNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Retreat</div>
        <div class="info-value">${data.retreatDestination}</div>
      </div>
    </div>

    <p style="text-align: center; margin-top: 30px;">
      <a href="${SITE_URL}/booking/pay?booking_id=${data.bookingNumber}" class="button">Update Payment</a>
    </p>

    <p style="font-size: 14px; color: #64748b;">
      If you need assistance, please contact us at info@rainbowsurfretreats.com
    </p>

    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `Action required: Payment failed for your ${data.retreatDestination} retreat`)
}

// Refund Confirmation Email
export function refundConfirmationEmail(data: {
  firstName: string
  lastName: string
  email: string
  bookingNumber: string
  retreatDestination: string
  refundAmount: number
  reason?: string
}): string {
  const content = `
    <h2>Refund Processed</h2>
    <p>Dear ${data.firstName},</p>
    <p>We've processed a refund for your booking.</p>

    <div class="highlight-box">
      <div style="font-size: 14px; color: #64748b;">Refund Amount</div>
      <div class="amount">€${data.refundAmount.toFixed(2)}</div>
    </div>

    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Booking Reference</div>
        <div class="info-value">${data.bookingNumber}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Retreat</div>
        <div class="info-value">${data.retreatDestination}</div>
      </div>
    </div>

    ${data.reason ? `<p><strong>Reason:</strong> ${data.reason}</p>` : ''}

    <p>The refund will appear in your account within 5-10 business days, depending on your bank.</p>

    <p>If you have any questions about this refund, please contact us.</p>
    <p><strong>The Rainbow Surf Retreats Team</strong></p>
  `

  return emailLayout(content, `Refund of €${data.refundAmount.toFixed(2)} processed for your booking`)
}
