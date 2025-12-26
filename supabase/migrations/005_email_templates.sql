-- Email Templates for Rainbow Surf Retreats
-- Allows editing email content from admin panel

-- =====================
-- EMAIL TEMPLATES TABLE
-- =====================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  slug VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Email content
  subject VARCHAR(255) NOT NULL,
  html_content TEXT NOT NULL,
  text_content TEXT, -- Plain text version (optional)

  -- Template settings
  category VARCHAR(50) NOT NULL DEFAULT 'transactional',
  is_active BOOLEAN DEFAULT true,

  -- Available variables for this template
  available_variables JSONB DEFAULT '[]',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================
-- INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_email_templates_slug ON email_templates(slug);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);

-- =====================
-- UPDATED_AT TRIGGER
-- =====================
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================
-- RLS POLICIES
-- =====================
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Only admins can manage email templates
DROP POLICY IF EXISTS "Admins can manage email templates" ON email_templates;
CREATE POLICY "Admins can manage email templates" ON email_templates
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================
-- SEED DEFAULT TEMPLATES
-- =====================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, available_variables) VALUES

-- Booking Confirmation
('booking_confirmation', 'Booking Confirmation', 'Sent when a new booking is confirmed',
'Booking Confirmed: {{retreatDestination}} Surf Retreat - {{bookingNumber}}',
'<h2>Booking Confirmed!</h2>
<p>Dear {{firstName}},</p>
<p>Thank you for booking your surf retreat adventure with us! We''re thrilled to have you join our community of wave riders.</p>

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #64748b;">Booking Reference</div>
  <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">{{bookingNumber}}</div>
</div>

{{#if isEarlyBird}}
<div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0;">
  <strong>Early Bird Discount Applied!</strong><br>
  You saved €{{earlyBirdDiscount}} on your booking.
</div>
{{/if}}

<h3>Retreat Details</h3>
<ul>
  <li><strong>Destination:</strong> {{retreatDestination}}</li>
  <li><strong>Dates:</strong> {{retreatDates}}</li>
  {{#if roomName}}<li><strong>Room:</strong> {{roomName}}</li>{{/if}}
  <li><strong>Total:</strong> €{{totalAmount}}</li>
</ul>

{{#if paymentSchedule}}
<h3>Payment Schedule</h3>
{{paymentScheduleHtml}}
{{/if}}

<h3>What''s Next?</h3>
<ol>
  <li><strong>Check your email</strong> - We''ll send payment reminders before each due date</li>
  <li><strong>Prepare for adventure</strong> - Start getting excited about your surf retreat!</li>
  <li><strong>Pack your bags</strong> - We''ll send you a packing list 6 weeks before your retreat</li>
</ol>

<p>If you have any questions, don''t hesitate to reach out to us!</p>
<p>See you on the waves!</p>
<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "roomName", "totalAmount", "depositAmount", "balanceDue", "isEarlyBird", "earlyBirdDiscount", "paymentSchedule", "paymentScheduleHtml"]'::jsonb),

-- Payment Confirmation
('payment_confirmation', 'Payment Confirmation', 'Sent when a payment is received',
'Payment Received - {{bookingNumber}}',
'<h2>Payment Received</h2>
<p>Dear {{firstName}},</p>
<p>We''ve received your payment. Thank you!</p>

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #64748b;">{{paymentDescription}}</div>
  <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">€{{amount}}</div>
</div>

<ul>
  <li><strong>Booking Reference:</strong> {{bookingNumber}}</li>
  <li><strong>Retreat:</strong> {{retreatDestination}}</li>
  <li><strong>Remaining Balance:</strong> €{{remainingBalance}}</li>
</ul>

{{#if nextPaymentDate}}
<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0;">
  <strong>Next Payment Due</strong><br>
  €{{nextPaymentAmount}} due on {{nextPaymentDate}}
</div>
{{else}}
<div style="background: #d1fae5; border-left: 4px solid #10b981; padding: 15px 20px; margin: 20px 0;">
  <strong>Fully Paid!</strong><br>
  Your retreat is fully paid. No more payments required.
</div>
{{/if}}

<p>Thank you for choosing Rainbow Surf Retreats!</p>
<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "amount", "paymentNumber", "paymentDescription", "remainingBalance", "nextPaymentDate", "nextPaymentAmount"]'::jsonb),

-- Payment Reminder
('payment_reminder', 'Payment Reminder', 'Sent as a reminder before payment due date',
'{{#if isOverdue}}URGENT: Payment Overdue{{else}}Payment Reminder{{/if}} - {{bookingNumber}}',
'<h2>{{title}}</h2>
<p>Dear {{firstName}},</p>
<p>{{message}}</p>

<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #92400e;">Payment {{paymentNumber}} Due</div>
  <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">€{{amount}}</div>
  <div style="margin-top: 10px;">
    <strong>Due Date:</strong> {{dueDate}}
  </div>
</div>

<ul>
  <li><strong>Booking Reference:</strong> {{bookingNumber}}</li>
  <li><strong>Retreat:</strong> {{retreatDestination}}</li>
  <li><strong>Dates:</strong> {{retreatDates}}</li>
  <li><strong>Days Until Retreat:</strong> {{daysUntilRetreat}} days</li>
</ul>

<p style="text-align: center; margin-top: 30px;">
  <a href="{{paymentUrl}}" style="display: inline-block; background: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Pay Now</a>
</p>

<p style="font-size: 14px; color: #64748b;">
  If you''ve already made this payment, please disregard this email.
</p>

<p>Questions? Reply to this email or contact us at info@rainbowsurfretreats.com</p>
<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat", "amount", "dueDate", "paymentNumber", "paymentUrl", "title", "message", "isOverdue"]'::jsonb),

-- Payment Failed
('payment_failed', 'Payment Failed', 'Sent when a payment fails',
'Action Required: Payment Failed - {{bookingNumber}}',
'<h2>Payment Failed</h2>
<p>Dear {{firstName}},</p>
<p>Unfortunately, we were unable to process your scheduled payment.</p>

<div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #92400e;">Payment {{paymentNumber}}</div>
  <div style="font-size: 24px; font-weight: 700; color: #dc2626;">€{{amount}}</div>
  {{#if failureReason}}<p style="margin-top: 10px; font-size: 14px;">Reason: {{failureReason}}</p>{{/if}}
</div>

<p>Please update your payment method or make a manual payment to secure your booking.</p>

<ul>
  <li><strong>Booking Reference:</strong> {{bookingNumber}}</li>
  <li><strong>Retreat:</strong> {{retreatDestination}}</li>
</ul>

<p style="text-align: center; margin-top: 30px;">
  <a href="{{paymentUrl}}" style="display: inline-block; background: #0ea5e9; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">Update Payment</a>
</p>

<p style="font-size: 14px; color: #64748b;">
  If you need assistance, please contact us at info@rainbowsurfretreats.com
</p>

<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "amount", "paymentNumber", "failureReason", "paymentUrl"]'::jsonb),

-- Pre-Retreat Reminder (6 weeks)
('pre_retreat_reminder', 'Pre-Retreat Reminder', 'Sent 6 weeks before retreat starts',
'{{daysUntilRetreat}} Days Until Your {{retreatDestination}} Surf Retreat!',
'<h2>Your Adventure Awaits!</h2>
<p>Dear {{firstName}},</p>
<p>Can you believe it? Your surf retreat in <strong>{{retreatDestination}}</strong> is just <strong>{{daysUntilRetreat}} days away</strong>!</p>

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #64748b;">Retreat Dates</div>
  <div style="font-size: 20px; font-weight: 700; color: #0ea5e9;">{{retreatDates}}</div>
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
  <li><strong>Travel adapter</strong> - Check the plug type for {{retreatDestination}}</li>
</ul>

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
  <li>Review visa requirements for {{retreatDestination}}</li>
  <li>Arrange travel insurance</li>
  <li>Book your flights if you haven''t already</li>
  <li>Check our FAQ for airport transfer options</li>
</ul>

<p>We can''t wait to see you on the beach!</p>
<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]'::jsonb),

-- Refund Confirmation
('refund_confirmation', 'Refund Confirmation', 'Sent when a refund is processed',
'Refund Processed - {{bookingNumber}}',
'<h2>Refund Processed</h2>
<p>Dear {{firstName}},</p>
<p>We''ve processed a refund for your booking.</p>

<div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
  <div style="font-size: 14px; color: #64748b;">Refund Amount</div>
  <div style="font-size: 24px; font-weight: 700; color: #0ea5e9;">€{{refundAmount}}</div>
</div>

<ul>
  <li><strong>Booking Reference:</strong> {{bookingNumber}}</li>
  <li><strong>Retreat:</strong> {{retreatDestination}}</li>
</ul>

{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}

<p>The refund will appear in your account within 5-10 business days, depending on your bank.</p>

<p>If you have any questions about this refund, please contact us.</p>
<p><strong>The Rainbow Surf Retreats Team</strong></p>',
'transactional',
'["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]'::jsonb)

ON CONFLICT (slug) DO NOTHING;
