-- Add missing email templates: payment_failed, pre_retreat_reminder, refund_confirmation
-- For all 5 languages: en, de, es, fr, nl

-- =============================================
-- ENGLISH TEMPLATES
-- =============================================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('payment_failed', 'Payment Failed', 'Email when automatic payment fails',
'Action Required: Payment Failed - {{bookingNumber}}',
'<h2>Hello {{firstName}},</h2>
<p>Unfortunately, we were unable to process your scheduled payment.</p>

<div class="warning-box">
  <p><strong>Payment {{paymentNumber}}</strong></p>
  <p><strong>Amount:</strong> <span class="amount">€{{amount}}</span></p>
  {{#if failureReason}}<p><strong>Reason:</strong> {{failureReason}}</p>{{/if}}
</div>

<p>Please update your payment method or make a manual payment to secure your booking.</p>

<div class="highlight-box">
  <p><strong>Booking Reference:</strong> {{bookingNumber}}</p>
  <p><strong>Retreat:</strong> {{retreatDestination}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Update Payment</a>
</p>

<p>If you need assistance, please contact us at info@rainbowsurfretreats.com</p>

<p>The Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentNumber", "failureReason", "retreatDestination", "paymentUrl"]', 'en'),

('pre_retreat_reminder', 'Pre-Retreat Reminder', 'Email sent 6 weeks before retreat',
'{{daysUntilRetreat}} Days Until Your {{retreatDestination}} Surf Retreat!',
'<h2>Your Adventure Awaits!</h2>
<p>Dear {{firstName}},</p>
<p>Can you believe it? Your surf retreat in <strong>{{retreatDestination}}</strong> is just <strong>{{daysUntilRetreat}} days away</strong>!</p>

<div class="highlight-box">
  <p><strong>Retreat Dates:</strong> {{retreatDates}}</p>
  <p><strong>Booking Reference:</strong> {{bookingNumber}}</p>
</div>

<h3>Packing Essentials</h3>
<ul>
  <li><strong>Swimwear</strong> - Multiple sets recommended</li>
  <li><strong>Sunscreen</strong> - SPF 50+ reef-safe sunscreen</li>
  <li><strong>Rash guard</strong> - Protects from sun and board rash</li>
  <li><strong>Flip flops/sandals</strong> - For the beach</li>
  <li><strong>Light clothing</strong> - Breathable fabrics</li>
  <li><strong>Hat & sunglasses</strong> - Sun protection essentials</li>
  <li><strong>Reusable water bottle</strong> - Stay hydrated!</li>
  <li><strong>Travel adapter</strong> - Check the plug type for {{retreatDestination}}</li>
</ul>

<h3>Before You Go</h3>
<ul>
  <li>Check your passport validity (6+ months recommended)</li>
  <li>Review visa requirements for {{retreatDestination}}</li>
  <li>Arrange travel insurance</li>
  <li>Book your flights if you haven''t already</li>
</ul>

<p>We can''t wait to see you on the beach!</p>
<p><strong>The Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]', 'en'),

('refund_confirmation', 'Refund Confirmation', 'Email when refund is processed',
'Refund Processed - {{bookingNumber}}',
'<h2>Refund Processed</h2>
<p>Dear {{firstName}},</p>
<p>We have processed a refund for your booking.</p>

<div class="highlight-box">
  <p><strong>Refund Amount:</strong> <span class="amount">€{{refundAmount}}</span></p>
</div>

<div class="info-grid">
  <div class="info-item">
    <div class="info-label">Booking Reference</div>
    <div class="info-value">{{bookingNumber}}</div>
  </div>
  <div class="info-item">
    <div class="info-label">Retreat</div>
    <div class="info-value">{{retreatDestination}}</div>
  </div>
</div>

{{#if reason}}<p><strong>Reason:</strong> {{reason}}</p>{{/if}}

<p>The refund will appear in your account within 5-10 business days, depending on your bank.</p>

<p>If you have any questions about this refund, please contact us.</p>
<p><strong>The Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]', 'en')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- =============================================
-- GERMAN TEMPLATES
-- =============================================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('payment_failed', 'Zahlung fehlgeschlagen', 'E-Mail wenn automatische Zahlung fehlschlägt',
'Handlungsbedarf: Zahlung fehlgeschlagen - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>Leider konnten wir deine geplante Zahlung nicht verarbeiten.</p>

<div class="warning-box">
  <p><strong>Zahlung {{paymentNumber}}</strong></p>
  <p><strong>Betrag:</strong> <span class="amount">€{{amount}}</span></p>
  {{#if failureReason}}<p><strong>Grund:</strong> {{failureReason}}</p>{{/if}}
</div>

<p>Bitte aktualisiere deine Zahlungsmethode oder tätige eine manuelle Zahlung, um deine Buchung zu sichern.</p>

<div class="highlight-box">
  <p><strong>Buchungsnummer:</strong> {{bookingNumber}}</p>
  <p><strong>Retreat:</strong> {{retreatDestination}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Zahlung aktualisieren</a>
</p>

<p>Bei Fragen kontaktiere uns unter info@rainbowsurfretreats.com</p>

<p>Das Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentNumber", "failureReason", "retreatDestination", "paymentUrl"]', 'de'),

('pre_retreat_reminder', 'Vor-Retreat-Erinnerung', 'E-Mail 6 Wochen vor dem Retreat',
'Noch {{daysUntilRetreat}} Tage bis zu deinem {{retreatDestination}} Surf Retreat!',
'<h2>Dein Abenteuer wartet!</h2>
<p>Liebe/r {{firstName}},</p>
<p>Kannst du es glauben? Dein Surf Retreat in <strong>{{retreatDestination}}</strong> beginnt in nur <strong>{{daysUntilRetreat}} Tagen</strong>!</p>

<div class="highlight-box">
  <p><strong>Retreat-Daten:</strong> {{retreatDates}}</p>
  <p><strong>Buchungsnummer:</strong> {{bookingNumber}}</p>
</div>

<h3>Pack-Essentials</h3>
<ul>
  <li><strong>Badekleidung</strong> - Mehrere Sets empfohlen</li>
  <li><strong>Sonnencreme</strong> - LSF 50+ rifffreundlich</li>
  <li><strong>Rash Guard</strong> - Schützt vor Sonne und Surfausschlag</li>
  <li><strong>Flip-Flops/Sandalen</strong> - Für den Strand</li>
  <li><strong>Leichte Kleidung</strong> - Atmungsaktive Stoffe</li>
  <li><strong>Hut & Sonnenbrille</strong> - Sonnenschutz-Essentials</li>
  <li><strong>Wiederverwendbare Wasserflasche</strong> - Bleib hydratisiert!</li>
  <li><strong>Reiseadapter</strong> - Prüfe den Steckertyp für {{retreatDestination}}</li>
</ul>

<h3>Vor der Abreise</h3>
<ul>
  <li>Passgültigkeit prüfen (6+ Monate empfohlen)</li>
  <li>Visa-Anforderungen für {{retreatDestination}} prüfen</li>
  <li>Reiseversicherung abschließen</li>
  <li>Flüge buchen, falls noch nicht geschehen</li>
</ul>

<p>Wir können es kaum erwarten, dich am Strand zu sehen!</p>
<p><strong>Das Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]', 'de'),

('refund_confirmation', 'Rückerstattungsbestätigung', 'E-Mail bei Rückerstattung',
'Rückerstattung verarbeitet - {{bookingNumber}}',
'<h2>Rückerstattung verarbeitet</h2>
<p>Liebe/r {{firstName}},</p>
<p>Wir haben eine Rückerstattung für deine Buchung verarbeitet.</p>

<div class="highlight-box">
  <p><strong>Rückerstattungsbetrag:</strong> <span class="amount">€{{refundAmount}}</span></p>
</div>

<div class="info-grid">
  <div class="info-item">
    <div class="info-label">Buchungsnummer</div>
    <div class="info-value">{{bookingNumber}}</div>
  </div>
  <div class="info-item">
    <div class="info-label">Retreat</div>
    <div class="info-value">{{retreatDestination}}</div>
  </div>
</div>

{{#if reason}}<p><strong>Grund:</strong> {{reason}}</p>{{/if}}

<p>Die Rückerstattung wird innerhalb von 5-10 Werktagen auf deinem Konto erscheinen, abhängig von deiner Bank.</p>

<p>Bei Fragen zu dieser Rückerstattung kontaktiere uns bitte.</p>
<p><strong>Das Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]', 'de')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- =============================================
-- SPANISH TEMPLATES
-- =============================================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('payment_failed', 'Pago fallido', 'Email cuando el pago automático falla',
'Acción requerida: Pago fallido - {{bookingNumber}}',
'<h2>Hola {{firstName}},</h2>
<p>Lamentablemente, no pudimos procesar tu pago programado.</p>

<div class="warning-box">
  <p><strong>Pago {{paymentNumber}}</strong></p>
  <p><strong>Cantidad:</strong> <span class="amount">€{{amount}}</span></p>
  {{#if failureReason}}<p><strong>Razón:</strong> {{failureReason}}</p>{{/if}}
</div>

<p>Por favor actualiza tu método de pago o realiza un pago manual para asegurar tu reserva.</p>

<div class="highlight-box">
  <p><strong>Número de reserva:</strong> {{bookingNumber}}</p>
  <p><strong>Retreat:</strong> {{retreatDestination}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Actualizar pago</a>
</p>

<p>Si necesitas ayuda, contáctanos en info@rainbowsurfretreats.com</p>

<p>El equipo Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentNumber", "failureReason", "retreatDestination", "paymentUrl"]', 'es'),

('pre_retreat_reminder', 'Recordatorio pre-retreat', 'Email 6 semanas antes del retreat',
'¡Faltan {{daysUntilRetreat}} días para tu {{retreatDestination}} Surf Retreat!',
'<h2>¡Tu aventura te espera!</h2>
<p>Querido/a {{firstName}},</p>
<p>¿Puedes creerlo? Tu retiro de surf en <strong>{{retreatDestination}}</strong> está a solo <strong>{{daysUntilRetreat}} días</strong>!</p>

<div class="highlight-box">
  <p><strong>Fechas del retreat:</strong> {{retreatDates}}</p>
  <p><strong>Número de reserva:</strong> {{bookingNumber}}</p>
</div>

<h3>Esenciales para empacar</h3>
<ul>
  <li><strong>Traje de baño</strong> - Se recomiendan varios sets</li>
  <li><strong>Protector solar</strong> - SPF 50+ respetuoso con los arrecifes</li>
  <li><strong>Lycra de surf</strong> - Protege del sol y rozaduras</li>
  <li><strong>Chanclas/sandalias</strong> - Para la playa</li>
  <li><strong>Ropa ligera</strong> - Telas transpirables</li>
  <li><strong>Sombrero y gafas de sol</strong> - Esenciales de protección solar</li>
  <li><strong>Botella de agua reutilizable</strong> - ¡Mantente hidratado!</li>
  <li><strong>Adaptador de viaje</strong> - Verifica el tipo de enchufe para {{retreatDestination}}</li>
</ul>

<h3>Antes de irte</h3>
<ul>
  <li>Verifica la validez de tu pasaporte (6+ meses recomendado)</li>
  <li>Revisa los requisitos de visa para {{retreatDestination}}</li>
  <li>Contrata un seguro de viaje</li>
  <li>Reserva tus vuelos si aún no lo has hecho</li>
</ul>

<p>¡No podemos esperar a verte en la playa!</p>
<p><strong>El equipo Rainbow Surf</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]', 'es'),

('refund_confirmation', 'Confirmación de reembolso', 'Email cuando se procesa un reembolso',
'Reembolso procesado - {{bookingNumber}}',
'<h2>Reembolso procesado</h2>
<p>Querido/a {{firstName}},</p>
<p>Hemos procesado un reembolso para tu reserva.</p>

<div class="highlight-box">
  <p><strong>Cantidad reembolsada:</strong> <span class="amount">€{{refundAmount}}</span></p>
</div>

<div class="info-grid">
  <div class="info-item">
    <div class="info-label">Número de reserva</div>
    <div class="info-value">{{bookingNumber}}</div>
  </div>
  <div class="info-item">
    <div class="info-label">Retreat</div>
    <div class="info-value">{{retreatDestination}}</div>
  </div>
</div>

{{#if reason}}<p><strong>Razón:</strong> {{reason}}</p>{{/if}}

<p>El reembolso aparecerá en tu cuenta dentro de 5-10 días hábiles, dependiendo de tu banco.</p>

<p>Si tienes preguntas sobre este reembolso, contáctanos.</p>
<p><strong>El equipo Rainbow Surf</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]', 'es')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- =============================================
-- FRENCH TEMPLATES
-- =============================================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('payment_failed', 'Paiement échoué', 'Email quand le paiement automatique échoue',
'Action requise : Paiement échoué - {{bookingNumber}}',
'<h2>Bonjour {{firstName}},</h2>
<p>Malheureusement, nous n''avons pas pu traiter votre paiement programmé.</p>

<div class="warning-box">
  <p><strong>Paiement {{paymentNumber}}</strong></p>
  <p><strong>Montant :</strong> <span class="amount">€{{amount}}</span></p>
  {{#if failureReason}}<p><strong>Raison :</strong> {{failureReason}}</p>{{/if}}
</div>

<p>Veuillez mettre à jour votre méthode de paiement ou effectuer un paiement manuel pour sécuriser votre réservation.</p>

<div class="highlight-box">
  <p><strong>Numéro de réservation :</strong> {{bookingNumber}}</p>
  <p><strong>Retreat :</strong> {{retreatDestination}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Mettre à jour le paiement</a>
</p>

<p>Si vous avez besoin d''aide, contactez-nous à info@rainbowsurfretreats.com</p>

<p>L''équipe Rainbow Surf</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentNumber", "failureReason", "retreatDestination", "paymentUrl"]', 'fr'),

('pre_retreat_reminder', 'Rappel pré-retreat', 'Email 6 semaines avant le retreat',
'Plus que {{daysUntilRetreat}} jours avant votre {{retreatDestination}} Surf Retreat !',
'<h2>Votre aventure vous attend !</h2>
<p>Cher/Chère {{firstName}},</p>
<p>Pouvez-vous y croire ? Votre retraite de surf à <strong>{{retreatDestination}}</strong> commence dans seulement <strong>{{daysUntilRetreat}} jours</strong> !</p>

<div class="highlight-box">
  <p><strong>Dates du retreat :</strong> {{retreatDates}}</p>
  <p><strong>Numéro de réservation :</strong> {{bookingNumber}}</p>
</div>

<h3>Essentiels à emporter</h3>
<ul>
  <li><strong>Maillots de bain</strong> - Plusieurs sets recommandés</li>
  <li><strong>Crème solaire</strong> - SPF 50+ respectueux des récifs</li>
  <li><strong>Lycra de surf</strong> - Protège du soleil et des irritations</li>
  <li><strong>Tongs/sandales</strong> - Pour la plage</li>
  <li><strong>Vêtements légers</strong> - Tissus respirants</li>
  <li><strong>Chapeau et lunettes de soleil</strong> - Essentiels de protection solaire</li>
  <li><strong>Gourde réutilisable</strong> - Restez hydraté !</li>
  <li><strong>Adaptateur de voyage</strong> - Vérifiez le type de prise pour {{retreatDestination}}</li>
</ul>

<h3>Avant de partir</h3>
<ul>
  <li>Vérifiez la validité de votre passeport (6+ mois recommandés)</li>
  <li>Consultez les exigences de visa pour {{retreatDestination}}</li>
  <li>Souscrivez une assurance voyage</li>
  <li>Réservez vos vols si ce n''est pas encore fait</li>
</ul>

<p>Nous avons hâte de vous voir sur la plage !</p>
<p><strong>L''équipe Rainbow Surf</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]', 'fr'),

('refund_confirmation', 'Confirmation de remboursement', 'Email quand un remboursement est traité',
'Remboursement traité - {{bookingNumber}}',
'<h2>Remboursement traité</h2>
<p>Cher/Chère {{firstName}},</p>
<p>Nous avons traité un remboursement pour votre réservation.</p>

<div class="highlight-box">
  <p><strong>Montant remboursé :</strong> <span class="amount">€{{refundAmount}}</span></p>
</div>

<div class="info-grid">
  <div class="info-item">
    <div class="info-label">Numéro de réservation</div>
    <div class="info-value">{{bookingNumber}}</div>
  </div>
  <div class="info-item">
    <div class="info-label">Retreat</div>
    <div class="info-value">{{retreatDestination}}</div>
  </div>
</div>

{{#if reason}}<p><strong>Raison :</strong> {{reason}}</p>{{/if}}

<p>Le remboursement apparaîtra sur votre compte dans 5 à 10 jours ouvrables, selon votre banque.</p>

<p>Si vous avez des questions concernant ce remboursement, n''hésitez pas à nous contacter.</p>
<p><strong>L''équipe Rainbow Surf</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]', 'fr')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;

-- =============================================
-- DUTCH TEMPLATES
-- =============================================
INSERT INTO email_templates (slug, name, description, subject, html_content, category, is_active, available_variables, language)
VALUES
('payment_failed', 'Betaling mislukt', 'Email wanneer automatische betaling mislukt',
'Actie vereist: Betaling mislukt - {{bookingNumber}}',
'<h2>Hallo {{firstName}},</h2>
<p>Helaas konden we je geplande betaling niet verwerken.</p>

<div class="warning-box">
  <p><strong>Betaling {{paymentNumber}}</strong></p>
  <p><strong>Bedrag:</strong> <span class="amount">€{{amount}}</span></p>
  {{#if failureReason}}<p><strong>Reden:</strong> {{failureReason}}</p>{{/if}}
</div>

<p>Werk je betaalmethode bij of doe een handmatige betaling om je boeking te behouden.</p>

<div class="highlight-box">
  <p><strong>Boekingsnummer:</strong> {{bookingNumber}}</p>
  <p><strong>Retreat:</strong> {{retreatDestination}}</p>
</div>

<p style="text-align: center;">
  <a href="{{paymentUrl}}" class="button">Betaling bijwerken</a>
</p>

<p>Als je hulp nodig hebt, neem contact op via info@rainbowsurfretreats.com</p>

<p>Het Rainbow Surf Team</p>',
'transactional', true, '["firstName", "bookingNumber", "amount", "paymentNumber", "failureReason", "retreatDestination", "paymentUrl"]', 'nl'),

('pre_retreat_reminder', 'Pre-retreat herinnering', 'Email 6 weken voor de retreat',
'Nog {{daysUntilRetreat}} dagen tot je {{retreatDestination}} Surf Retreat!',
'<h2>Je avontuur wacht!</h2>
<p>Beste {{firstName}},</p>
<p>Kun je het geloven? Je surf retreat in <strong>{{retreatDestination}}</strong> begint over slechts <strong>{{daysUntilRetreat}} dagen</strong>!</p>

<div class="highlight-box">
  <p><strong>Retreat data:</strong> {{retreatDates}}</p>
  <p><strong>Boekingsnummer:</strong> {{bookingNumber}}</p>
</div>

<h3>Inpak-essentials</h3>
<ul>
  <li><strong>Zwemkleding</strong> - Meerdere sets aanbevolen</li>
  <li><strong>Zonnebrandcrème</strong> - SPF 50+ rifvriendelijk</li>
  <li><strong>Rashguard</strong> - Beschermt tegen zon en schaafwonden</li>
  <li><strong>Slippers/sandalen</strong> - Voor het strand</li>
  <li><strong>Lichte kleding</strong> - Ademende stoffen</li>
  <li><strong>Hoed & zonnebril</strong> - Zonbescherming essentials</li>
  <li><strong>Herbruikbare waterfles</strong> - Blijf gehydrateerd!</li>
  <li><strong>Reisadapter</strong> - Check het stekkertype voor {{retreatDestination}}</li>
</ul>

<h3>Voordat je vertrekt</h3>
<ul>
  <li>Controleer de geldigheid van je paspoort (6+ maanden aanbevolen)</li>
  <li>Check de visumvereisten voor {{retreatDestination}}</li>
  <li>Regel reisverzekering</li>
  <li>Boek je vluchten als je dat nog niet gedaan hebt</li>
</ul>

<p>We kunnen niet wachten om je op het strand te zien!</p>
<p><strong>Het Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "retreatDates", "daysUntilRetreat"]', 'nl'),

('refund_confirmation', 'Terugbetalingsbevestiging', 'Email wanneer terugbetaling is verwerkt',
'Terugbetaling verwerkt - {{bookingNumber}}',
'<h2>Terugbetaling verwerkt</h2>
<p>Beste {{firstName}},</p>
<p>We hebben een terugbetaling voor je boeking verwerkt.</p>

<div class="highlight-box">
  <p><strong>Terugbetalingsbedrag:</strong> <span class="amount">€{{refundAmount}}</span></p>
</div>

<div class="info-grid">
  <div class="info-item">
    <div class="info-label">Boekingsnummer</div>
    <div class="info-value">{{bookingNumber}}</div>
  </div>
  <div class="info-item">
    <div class="info-label">Retreat</div>
    <div class="info-value">{{retreatDestination}}</div>
  </div>
</div>

{{#if reason}}<p><strong>Reden:</strong> {{reason}}</p>{{/if}}

<p>De terugbetaling zal binnen 5-10 werkdagen op je rekening verschijnen, afhankelijk van je bank.</p>

<p>Als je vragen hebt over deze terugbetaling, neem gerust contact met ons op.</p>
<p><strong>Het Rainbow Surf Team</strong></p>',
'transactional', true, '["firstName", "lastName", "bookingNumber", "retreatDestination", "refundAmount", "reason"]', 'nl')
ON CONFLICT (slug, language) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  subject = EXCLUDED.subject,
  html_content = EXCLUDED.html_content;
