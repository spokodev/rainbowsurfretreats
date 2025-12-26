-- Add language column to email_templates
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'en';

-- Update unique constraint to include language
ALTER TABLE email_templates DROP CONSTRAINT IF EXISTS email_templates_slug_key;
ALTER TABLE email_templates ADD CONSTRAINT email_templates_slug_language_key UNIQUE (slug, language);

-- German templates
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('booking_confirmation', 'Buchungsbestätigung', 'E-Mail nach erfolgreicher Buchung',
'Buchung bestätigt: {{retreatDestination}} Surf Retreat - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>Vielen Dank für deine Buchung! Wir freuen uns, dich bei unserem <strong>{{retreatDestination}} Surf Retreat</strong> begrüßen zu dürfen.</p>

<div class="highlight-box">
  <h3>Buchungsdetails</h3>
  <p><strong>Buchungsnummer:</strong> {{bookingNumber}}</p>
  <p><strong>Reiseziel:</strong> {{retreatDestination}}</p>
  <p><strong>Datum:</strong> {{retreatDates}}</p>
  {{#if roomName}}<p><strong>Unterkunft:</strong> {{roomName}}</p>{{/if}}
</div>

<div class="highlight-box">
  <h3>Zahlungsübersicht</h3>
  <p><strong>Gesamtpreis:</strong> <span class="amount">€{{totalAmount}}</span></p>
  {{#if isEarlyBird}}<p>Frühbucher-Rabatt: -€{{earlyBirdDiscount}}</p>{{/if}}
  <p><strong>Anzahlung (heute):</strong> €{{depositAmount}}</p>
  <p><strong>Restbetrag:</strong> €{{balanceDue}}</p>
</div>

{{paymentScheduleHtml}}

<p>Bei Fragen stehen wir dir jederzeit zur Verfügung.</p>

<p>Wir sehen uns im Wasser!<br>Das Rainbow Surf Team</p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "roomName", "totalAmount", "depositAmount", "balanceDue", "isEarlyBird", "earlyBirdDiscount", "paymentScheduleHtml"]', 'de'),

('payment_confirmation', 'Zahlungsbestätigung', 'E-Mail nach erfolgreicher Zahlung',
'Zahlung erhalten - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>Wir haben deine Zahlung erfolgreich erhalten.</p>

<div class="success-box">
  <p><strong>Erhaltener Betrag:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Beschreibung:</strong> {{paymentDescription}}</p>
</div>

<div class="highlight-box">
  <p><strong>Restbetrag:</strong> €{{remainingBalance}}</p>
  {{#if nextPaymentDate}}<p><strong>Nächste Zahlung:</strong> €{{nextPaymentAmount}} am {{nextPaymentDate}}</p>{{/if}}
</div>

<p>Vielen Dank!<br>Das Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentDescription", "remainingBalance", "nextPaymentDate", "nextPaymentAmount"]', 'de'),

('payment_reminder', 'Zahlungserinnerung', 'Erinnerung an anstehende Zahlung',
'{{title}} - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>{{message}}</p>

<div class="{{#if isOverdue}}warning-box{{/if}}{{#unless isOverdue}}highlight-box{{/unless}}">
  <p><strong>Fälliger Betrag:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Fälligkeitsdatum:</strong> {{dueDate}}</p>
  <p><strong>Buchungsnummer:</strong> {{bookingNumber}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Jetzt bezahlen</a>
</p>

<p>Bei Fragen kontaktiere uns bitte.<br>Das Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "dueDate", "title", "message", "isOverdue", "paymentUrl"]', 'de')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- Spanish templates
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('booking_confirmation', 'Confirmación de reserva', 'Email después de reserva exitosa',
'Reserva confirmada: {{retreatDestination}} Surf Retreat - {{bookingNumber}}',
'<h2>Hola {{firstName}},</h2>
<p>¡Gracias por tu reserva! Estamos emocionados de tenerte en nuestro <strong>{{retreatDestination}} Surf Retreat</strong>.</p>

<div class="highlight-box">
  <h3>Detalles de la reserva</h3>
  <p><strong>Número de reserva:</strong> {{bookingNumber}}</p>
  <p><strong>Destino:</strong> {{retreatDestination}}</p>
  <p><strong>Fechas:</strong> {{retreatDates}}</p>
  {{#if roomName}}<p><strong>Alojamiento:</strong> {{roomName}}</p>{{/if}}
</div>

<div class="highlight-box">
  <h3>Resumen del pago</h3>
  <p><strong>Precio total:</strong> <span class="amount">€{{totalAmount}}</span></p>
  {{#if isEarlyBird}}<p>Descuento early bird: -€{{earlyBirdDiscount}}</p>{{/if}}
  <p><strong>Depósito (hoy):</strong> €{{depositAmount}}</p>
  <p><strong>Saldo pendiente:</strong> €{{balanceDue}}</p>
</div>

{{paymentScheduleHtml}}

<p>Si tienes alguna pregunta, no dudes en contactarnos.</p>

<p>¡Nos vemos en el agua!<br>El equipo Rainbow Surf</p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "roomName", "totalAmount", "depositAmount", "balanceDue", "isEarlyBird", "earlyBirdDiscount", "paymentScheduleHtml"]', 'es'),

('payment_confirmation', 'Confirmación de pago', 'Email después de pago exitoso',
'Pago recibido - {{bookingNumber}}',
'<h2>Hola {{firstName}},</h2>
<p>Hemos recibido tu pago correctamente.</p>

<div class="success-box">
  <p><strong>Cantidad recibida:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Descripción:</strong> {{paymentDescription}}</p>
</div>

<div class="highlight-box">
  <p><strong>Saldo pendiente:</strong> €{{remainingBalance}}</p>
  {{#if nextPaymentDate}}<p><strong>Próximo pago:</strong> €{{nextPaymentAmount}} el {{nextPaymentDate}}</p>{{/if}}
</div>

<p>¡Gracias!<br>El equipo Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentDescription", "remainingBalance", "nextPaymentDate", "nextPaymentAmount"]', 'es'),

('payment_reminder', 'Recordatorio de pago', 'Recordatorio de pago pendiente',
'{{title}} - {{bookingNumber}}',
'<h2>Hola {{firstName}},</h2>
<p>{{message}}</p>

<div class="{{#if isOverdue}}warning-box{{/if}}{{#unless isOverdue}}highlight-box{{/unless}}">
  <p><strong>Cantidad pendiente:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Fecha de vencimiento:</strong> {{dueDate}}</p>
  <p><strong>Número de reserva:</strong> {{bookingNumber}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Pagar ahora</a>
</p>

<p>Si tienes alguna pregunta, contáctanos.<br>El equipo Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "dueDate", "title", "message", "isOverdue", "paymentUrl"]', 'es')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- French templates
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('booking_confirmation', 'Confirmation de réservation', 'Email après réservation réussie',
'Réservation confirmée : {{retreatDestination}} Surf Retreat - {{bookingNumber}}',
'<h2>Bonjour {{firstName}},</h2>
<p>Merci pour votre réservation ! Nous avons hâte de vous accueillir à notre <strong>{{retreatDestination}} Surf Retreat</strong>.</p>

<div class="highlight-box">
  <h3>Détails de la réservation</h3>
  <p><strong>Numéro de réservation :</strong> {{bookingNumber}}</p>
  <p><strong>Destination :</strong> {{retreatDestination}}</p>
  <p><strong>Dates :</strong> {{retreatDates}}</p>
  {{#if roomName}}<p><strong>Hébergement :</strong> {{roomName}}</p>{{/if}}
</div>

<div class="highlight-box">
  <h3>Récapitulatif du paiement</h3>
  <p><strong>Prix total :</strong> <span class="amount">€{{totalAmount}}</span></p>
  {{#if isEarlyBird}}<p>Réduction early bird : -€{{earlyBirdDiscount}}</p>{{/if}}
  <p><strong>Acompte (aujourd''hui) :</strong> €{{depositAmount}}</p>
  <p><strong>Solde restant :</strong> €{{balanceDue}}</p>
</div>

{{paymentScheduleHtml}}

<p>N''hésitez pas à nous contacter si vous avez des questions.</p>

<p>À bientôt dans l''eau !<br>L''équipe Rainbow Surf</p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "roomName", "totalAmount", "depositAmount", "balanceDue", "isEarlyBird", "earlyBirdDiscount", "paymentScheduleHtml"]', 'fr'),

('payment_confirmation', 'Confirmation de paiement', 'Email après paiement réussi',
'Paiement reçu - {{bookingNumber}}',
'<h2>Bonjour {{firstName}},</h2>
<p>Nous avons bien reçu votre paiement.</p>

<div class="success-box">
  <p><strong>Montant reçu :</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Description :</strong> {{paymentDescription}}</p>
</div>

<div class="highlight-box">
  <p><strong>Solde restant :</strong> €{{remainingBalance}}</p>
  {{#if nextPaymentDate}}<p><strong>Prochain paiement :</strong> €{{nextPaymentAmount}} le {{nextPaymentDate}}</p>{{/if}}
</div>

<p>Merci !<br>L''équipe Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentDescription", "remainingBalance", "nextPaymentDate", "nextPaymentAmount"]', 'fr'),

('payment_reminder', 'Rappel de paiement', 'Rappel pour paiement en attente',
'{{title}} - {{bookingNumber}}',
'<h2>Bonjour {{firstName}},</h2>
<p>{{message}}</p>

<div class="{{#if isOverdue}}warning-box{{/if}}{{#unless isOverdue}}highlight-box{{/unless}}">
  <p><strong>Montant dû :</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Date d''échéance :</strong> {{dueDate}}</p>
  <p><strong>Numéro de réservation :</strong> {{bookingNumber}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Payer maintenant</a>
</p>

<p>N''hésitez pas à nous contacter.<br>L''équipe Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "dueDate", "title", "message", "isOverdue", "paymentUrl"]', 'fr')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- Dutch templates
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('booking_confirmation', 'Boekingsbevestiging', 'E-mail na succesvolle boeking',
'Boeking bevestigd: {{retreatDestination}} Surf Retreat - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>Bedankt voor je boeking! We kijken ernaar uit om je te verwelkomen bij onze <strong>{{retreatDestination}} Surf Retreat</strong>.</p>

<div class="highlight-box">
  <h3>Boekingsgegevens</h3>
  <p><strong>Boekingsnummer:</strong> {{bookingNumber}}</p>
  <p><strong>Bestemming:</strong> {{retreatDestination}}</p>
  <p><strong>Data:</strong> {{retreatDates}}</p>
  {{#if roomName}}<p><strong>Accommodatie:</strong> {{roomName}}</p>{{/if}}
</div>

<div class="highlight-box">
  <h3>Betalingsoverzicht</h3>
  <p><strong>Totaalprijs:</strong> <span class="amount">€{{totalAmount}}</span></p>
  {{#if isEarlyBird}}<p>Vroegboekkorting: -€{{earlyBirdDiscount}}</p>{{/if}}
  <p><strong>Aanbetaling (vandaag):</strong> €{{depositAmount}}</p>
  <p><strong>Resterend bedrag:</strong> €{{balanceDue}}</p>
</div>

{{paymentScheduleHtml}}

<p>Neem gerust contact met ons op als je vragen hebt.</p>

<p>Tot ziens in het water!<br>Het Rainbow Surf Team</p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "roomName", "totalAmount", "depositAmount", "balanceDue", "isEarlyBird", "earlyBirdDiscount", "paymentScheduleHtml"]', 'nl'),

('payment_confirmation', 'Betalingsbevestiging', 'E-mail na succesvolle betaling',
'Betaling ontvangen - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>We hebben je betaling succesvol ontvangen.</p>

<div class="success-box">
  <p><strong>Ontvangen bedrag:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Omschrijving:</strong> {{paymentDescription}}</p>
</div>

<div class="highlight-box">
  <p><strong>Resterend bedrag:</strong> €{{remainingBalance}}</p>
  {{#if nextPaymentDate}}<p><strong>Volgende betaling:</strong> €{{nextPaymentAmount}} op {{nextPaymentDate}}</p>{{/if}}
</div>

<p>Bedankt!<br>Het Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentDescription", "remainingBalance", "nextPaymentDate", "nextPaymentAmount"]', 'nl'),

('payment_reminder', 'Betalingsherinnering', 'Herinnering voor openstaande betaling',
'{{title}} - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>{{message}}</p>

<div class="{{#if isOverdue}}warning-box{{/if}}{{#unless isOverdue}}highlight-box{{/unless}}">
  <p><strong>Verschuldigd bedrag:</strong> <span class="amount">€{{amount}}</span></p>
  <p><strong>Vervaldatum:</strong> {{dueDate}}</p>
  <p><strong>Boekingsnummer:</strong> {{bookingNumber}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Nu betalen</a>
</p>

<p>Neem contact op als je vragen hebt.<br>Het Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "dueDate", "title", "message", "isOverdue", "paymentUrl"]', 'nl')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- Create index on language
CREATE INDEX IF NOT EXISTS idx_email_templates_language ON email_templates(language);
