-- Migration: Add policies content table for admin-editable policy sections
-- This allows admins to edit the policies page content in multiple languages

CREATE TABLE IF NOT EXISTS policy_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  section_key VARCHAR(50) NOT NULL, -- e.g., 'paymentTerms', 'cancellation', 'insurance', 'whatToBring', 'legal'
  language VARCHAR(5) NOT NULL DEFAULT 'en', -- en, de, es, fr, nl
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL, -- Structured content for the section
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(section_key, language)
);

-- Create index for fast lookups
CREATE INDEX idx_policy_sections_language ON policy_sections(language);
CREATE INDEX idx_policy_sections_key ON policy_sections(section_key);
CREATE INDEX idx_policy_sections_active ON policy_sections(is_active);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_policy_sections_updated_at
  BEFORE UPDATE ON policy_sections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE policy_sections ENABLE ROW LEVEL SECURITY;

-- Anyone can read active policies
CREATE POLICY "Anyone can read active policies"
  ON policy_sections
  FOR SELECT
  USING (is_active = true);

-- Authenticated users can manage policies
CREATE POLICY "Authenticated users can manage policies"
  ON policy_sections
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default English content
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('paymentTerms', 'en', 'Payment Terms', '{
  "depositTitle": "Deposit",
  "depositText": "The deposit reserves your spot on the upcoming Rainbow Surf Retreat. The ticket options on our website are 10% deposit fees for the full ticketed amount.",
  "scheduleTitle": "Payment Schedule",
  "scheduleItems": [
    "10% deposit due at booking to reserve your spot",
    "2nd instalment (50%) due 3 months before the retreat",
    "Balance (40%, or 30% with early bird discount) due no later than 1 month before the event"
  ],
  "methodsTitle": "Payment Methods",
  "methodsText": "Payments can be made by card, bank transfer, or in cash upon arrival. Bank details available upon request."
}', 1),

('cancellation', 'en', 'Cancellation Policy', '{
  "byCancelTitle": "If We Cancel",
  "byCancelText": "If Rainbow Surf Retreats cancels (due to situations like weather, issues with local providers, or unforeseen events), you will get a full refund of your deposit. However, we cannot reimburse extra costs like flights.",
  "byYouTitle": "If You Cancel",
  "byYouItems": [
    "We will refund your fee if we or you can find someone to take your spot",
    "If your cancellation is less than 2 weeks before the retreat, unfortunately, we cannot refund your deposit anymore"
  ],
  "noteTitle": "Important",
  "noteText": "We strongly recommend purchasing travel insurance that includes cancellation coverage to protect your investment."
}', 2),

('insurance', 'en', 'Travel Insurance', '{
  "requiredText": "For your safety, travel insurance is required for all participants.",
  "mustIncludeTitle": "Your Insurance Must Include",
  "mustIncludeItems": [
    "Surfing coverage (some policies consider surfing an \"extreme sport\")",
    "Ocean rescue coverage",
    "Trip cancellation coverage"
  ],
  "tipTitle": "Pro Tip",
  "tipText": "Double-check that your insurance specifically covers water sports and surfing activities. Not all standard travel insurance policies include this."
}', 3),

('whatToBring', 'en', 'What to Bring', '{
  "introText": "Here is what we recommend packing for your surf retreat adventure:",
  "essentialsTitle": "Essentials",
  "essentialsItems": [
    "Valid passport (check visa requirements for your destination)",
    "Travel insurance documents",
    "Swimwear and beach attire",
    "Sunscreen (reef-safe preferred)",
    "Comfortable clothing for warm weather"
  ],
  "optionalTitle": "Optional but Recommended",
  "optionalItems": [
    "Your own wetsuit (if you have one)",
    "Waterproof phone case",
    "Reusable water bottle",
    "Yoga mat (for wellness activities)"
  ]
}', 4),

('legal', 'en', 'Legal Terms', '{
  "text": "This retreat is organized under Spanish law. By booking, you are agreeing to our terms and conditions and understand that any disputes will be handled in Spanish courts."
}', 5);

-- Insert German content
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('paymentTerms', 'de', 'Zahlungsbedingungen', '{
  "depositTitle": "Anzahlung",
  "depositText": "Die Anzahlung reserviert deinen Platz beim kommenden Rainbow Surf Retreat. Die Ticketoptionen auf unserer Website sind 10% Anzahlungsgebühren für den gesamten Ticketbetrag.",
  "scheduleTitle": "Zahlungsplan",
  "scheduleItems": [
    "10% Anzahlung bei der Buchung, um deinen Platz zu reservieren",
    "2. Rate (50%) fällig 3 Monate vor dem Retreat",
    "Restbetrag (40%, oder 30% mit Frühbucher-Rabatt) fällig spätestens 1 Monat vor der Veranstaltung"
  ],
  "methodsTitle": "Zahlungsmethoden",
  "methodsText": "Zahlungen können per Karte, Banküberweisung oder bar bei Ankunft erfolgen. Bankdaten auf Anfrage erhältlich."
}', 1),

('cancellation', 'de', 'Stornierungsbedingungen', '{
  "byCancelTitle": "Wenn wir stornieren",
  "byCancelText": "Wenn Rainbow Surf Retreats storniert (aufgrund von Situationen wie Wetter, Problemen mit lokalen Anbietern oder unvorhergesehenen Ereignissen), erhältst du eine vollständige Rückerstattung deiner Anzahlung. Allerdings können wir keine zusätzlichen Kosten wie Flüge erstatten.",
  "byYouTitle": "Wenn du stornierst",
  "byYouItems": [
    "Wir erstatten deine Gebühr, wenn wir oder du jemanden findest, der deinen Platz übernimmt",
    "Wenn deine Stornierung weniger als 2 Wochen vor dem Retreat erfolgt, können wir leider deine Anzahlung nicht mehr erstatten"
  ],
  "noteTitle": "Wichtig",
  "noteText": "Wir empfehlen dringend, eine Reiseversicherung mit Stornierungsschutz abzuschließen, um deine Investition zu schützen."
}', 2),

('insurance', 'de', 'Reiseversicherung', '{
  "requiredText": "Zu deiner Sicherheit ist eine Reiseversicherung für alle Teilnehmer erforderlich.",
  "mustIncludeTitle": "Deine Versicherung muss beinhalten",
  "mustIncludeItems": [
    "Surfabdeckung (manche Policen betrachten Surfen als \"Extremsport\")",
    "Seenotrettung",
    "Reiserücktrittsversicherung"
  ],
  "tipTitle": "Profi-Tipp",
  "tipText": "Überprüfe, ob deine Versicherung ausdrücklich Wassersport und Surfaktivitäten abdeckt. Nicht alle Standard-Reiseversicherungen beinhalten dies."
}', 3),

('whatToBring', 'de', 'Was mitbringen', '{
  "introText": "Hier ist, was wir für dein Surf-Retreat-Abenteuer empfehlen:",
  "essentialsTitle": "Essentials",
  "essentialsItems": [
    "Gültiger Reisepass (Visabestimmungen für dein Ziel prüfen)",
    "Reiseversicherungsunterlagen",
    "Badebekleidung und Strandkleidung",
    "Sonnencreme (rifffreundlich bevorzugt)",
    "Bequeme Kleidung für warmes Wetter"
  ],
  "optionalTitle": "Optional aber empfohlen",
  "optionalItems": [
    "Eigener Neoprenanzug (falls vorhanden)",
    "Wasserdichte Handyhülle",
    "Wiederverwendbare Wasserflasche",
    "Yogamatte (für Wellness-Aktivitäten)"
  ]
}', 4),

('legal', 'de', 'Rechtliche Bedingungen', '{
  "text": "Dieses Retreat wird nach spanischem Recht organisiert. Mit der Buchung stimmst du unseren Allgemeinen Geschäftsbedingungen zu und verstehst, dass etwaige Streitigkeiten vor spanischen Gerichten behandelt werden."
}', 5);

-- Insert Spanish content
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('paymentTerms', 'es', 'Términos de Pago', '{
  "depositTitle": "Depósito",
  "depositText": "El depósito reserva tu plaza en el próximo Rainbow Surf Retreat. Las opciones de tickets en nuestra web son tarifas de depósito del 10% sobre el importe total del ticket.",
  "scheduleTitle": "Calendario de Pagos",
  "scheduleItems": [
    "10% de depósito al reservar para asegurar tu plaza",
    "2ª cuota (50%) vence 3 meses antes del retiro",
    "Saldo restante (40%, o 30% con descuento de reserva anticipada) vence como máximo 1 mes antes del evento"
  ],
  "methodsTitle": "Métodos de Pago",
  "methodsText": "Los pagos pueden realizarse con tarjeta, transferencia bancaria o en efectivo a la llegada. Datos bancarios disponibles bajo petición."
}', 1),

('cancellation', 'es', 'Política de Cancelación', '{
  "byCancelTitle": "Si Nosotros Cancelamos",
  "byCancelText": "Si Rainbow Surf Retreats cancela (debido a situaciones como el clima, problemas con proveedores locales o eventos imprevistos), recibirás un reembolso completo de tu depósito. Sin embargo, no podemos reembolsar costes adicionales como vuelos.",
  "byYouTitle": "Si Tú Cancelas",
  "byYouItems": [
    "Reembolsaremos tu tarifa si nosotros o tú encontramos a alguien que ocupe tu plaza",
    "Si tu cancelación es menos de 2 semanas antes del retiro, lamentablemente, ya no podemos reembolsar tu depósito"
  ],
  "noteTitle": "Importante",
  "noteText": "Recomendamos encarecidamente contratar un seguro de viaje que incluya cobertura de cancelación para proteger tu inversión."
}', 2),

('insurance', 'es', 'Seguro de Viaje', '{
  "requiredText": "Para tu seguridad, el seguro de viaje es obligatorio para todos los participantes.",
  "mustIncludeTitle": "Tu Seguro Debe Incluir",
  "mustIncludeItems": [
    "Cobertura de surf (algunas pólizas consideran el surf un \"deporte extremo\")",
    "Cobertura de rescate marítimo",
    "Cobertura de cancelación de viaje"
  ],
  "tipTitle": "Consejo",
  "tipText": "Verifica que tu seguro cubra específicamente deportes acuáticos y actividades de surf. No todas las pólizas de seguro de viaje estándar incluyen esto."
}', 3),

('whatToBring', 'es', 'Qué Traer', '{
  "introText": "Esto es lo que recomendamos empacar para tu aventura de surf:",
  "essentialsTitle": "Esenciales",
  "essentialsItems": [
    "Pasaporte válido (comprueba los requisitos de visa para tu destino)",
    "Documentos del seguro de viaje",
    "Traje de baño y ropa de playa",
    "Protector solar (preferiblemente seguro para arrecifes)",
    "Ropa cómoda para clima cálido"
  ],
  "optionalTitle": "Opcional pero Recomendado",
  "optionalItems": [
    "Tu propio traje de neopreno (si tienes uno)",
    "Funda impermeable para el teléfono",
    "Botella de agua reutilizable",
    "Esterilla de yoga (para actividades de bienestar)"
  ]
}', 4),

('legal', 'es', 'Términos Legales', '{
  "text": "Este retiro está organizado bajo la ley española. Al reservar, aceptas nuestros términos y condiciones y entiendes que cualquier disputa será tratada en los tribunales españoles."
}', 5);

-- Insert French content
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('paymentTerms', 'fr', 'Conditions de Paiement', '{
  "depositTitle": "Acompte",
  "depositText": "L acompte réserve votre place pour la prochaine Rainbow Surf Retreat. Les options de billets sur notre site sont des frais d acompte de 10% sur le montant total du billet.",
  "scheduleTitle": "Échéancier de Paiement",
  "scheduleItems": [
    "10% d acompte à la réservation pour réserver votre place",
    "2ème versement (50%) dû 3 mois avant la retraite",
    "Solde (40%, ou 30% avec réduction early bird) dû au plus tard 1 mois avant l événement"
  ],
  "methodsTitle": "Modes de Paiement",
  "methodsText": "Les paiements peuvent être effectués par carte, virement bancaire ou en espèces à l arrivée. Coordonnées bancaires disponibles sur demande."
}', 1),

('cancellation', 'fr', 'Politique d Annulation', '{
  "byCancelTitle": "Si Nous Annulons",
  "byCancelText": "Si Rainbow Surf Retreats annule (en raison de situations comme la météo, des problèmes avec les prestataires locaux ou des événements imprévus), vous recevrez un remboursement complet de votre acompte. Cependant, nous ne pouvons pas rembourser les frais supplémentaires comme les vols.",
  "byYouTitle": "Si Vous Annulez",
  "byYouItems": [
    "Nous rembourserons vos frais si nous ou vous trouvons quelqu un pour prendre votre place",
    "Si votre annulation est à moins de 2 semaines de la retraite, malheureusement, nous ne pouvons plus rembourser votre acompte"
  ],
  "noteTitle": "Important",
  "noteText": "Nous recommandons vivement de souscrire une assurance voyage incluant une couverture annulation pour protéger votre investissement."
}', 2),

('insurance', 'fr', 'Assurance Voyage', '{
  "requiredText": "Pour votre sécurité, une assurance voyage est obligatoire pour tous les participants.",
  "mustIncludeTitle": "Votre Assurance Doit Inclure",
  "mustIncludeItems": [
    "Couverture surf (certaines polices considèrent le surf comme un sport extrême)",
    "Couverture sauvetage en mer",
    "Couverture annulation de voyage"
  ],
  "tipTitle": "Conseil Pro",
  "tipText": "Vérifiez que votre assurance couvre spécifiquement les sports nautiques et les activités de surf. Toutes les polices d assurance voyage standard n incluent pas cette couverture."
}', 3),

('whatToBring', 'fr', 'Que Faut-il Apporter', '{
  "introText": "Voici ce que nous recommandons d emporter pour votre aventure surf:",
  "essentialsTitle": "Essentiels",
  "essentialsItems": [
    "Passeport valide (vérifiez les exigences de visa pour votre destination)",
    "Documents d assurance voyage",
    "Maillot de bain et tenue de plage",
    "Crème solaire (de préférence respectueuse des récifs)",
    "Vêtements confortables pour temps chaud"
  ],
  "optionalTitle": "Optionnel mais Recommandé",
  "optionalItems": [
    "Votre propre combinaison (si vous en avez une)",
    "Coque imperméable pour téléphone",
    "Gourde réutilisable",
    "Tapis de yoga (pour les activités bien-être)"
  ]
}', 4),

('legal', 'fr', 'Conditions Légales', '{
  "text": "Cette retraite est organisée selon le droit espagnol. En réservant, vous acceptez nos conditions générales et comprenez que tout litige sera traité par les tribunaux espagnols."
}', 5);

-- Insert Dutch content
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('paymentTerms', 'nl', 'Betalingsvoorwaarden', '{
  "depositTitle": "Aanbetaling",
  "depositText": "De aanbetaling reserveert je plek voor de aankomende Rainbow Surf Retreat. De ticketopties op onze website zijn aanbetalingskosten van 10% van het totale ticketbedrag.",
  "scheduleTitle": "Betalingsschema",
  "scheduleItems": [
    "10% aanbetaling bij boeking om je plek te reserveren",
    "2e termijn (50%) verschuldigd 3 maanden voor de retreat",
    "Restbedrag (40%, of 30% met vroegboekkorting) verschuldigd uiterlijk 1 maand voor het evenement"
  ],
  "methodsTitle": "Betaalmethoden",
  "methodsText": "Betalingen kunnen worden gedaan per kaart, bankoverschrijving of contant bij aankomst. Bankgegevens beschikbaar op aanvraag."
}', 1),

('cancellation', 'nl', 'Annuleringsbeleid', '{
  "byCancelTitle": "Als Wij Annuleren",
  "byCancelText": "Als Rainbow Surf Retreats annuleert (vanwege situaties zoals weer, problemen met lokale aanbieders of onvoorziene gebeurtenissen), krijg je volledige terugbetaling van je aanbetaling. We kunnen echter geen extra kosten zoals vluchten vergoeden.",
  "byYouTitle": "Als Jij Annuleert",
  "byYouItems": [
    "We betalen je terug als wij of jij iemand vindt om je plek over te nemen",
    "Als je annulering minder dan 2 weken voor de retreat is, kunnen we helaas je aanbetaling niet meer terugbetalen"
  ],
  "noteTitle": "Belangrijk",
  "noteText": "We raden sterk aan om een reisverzekering af te sluiten die annuleringsdekking bevat om je investering te beschermen."
}', 2),

('insurance', 'nl', 'Reisverzekering', '{
  "requiredText": "Voor je veiligheid is een reisverzekering verplicht voor alle deelnemers.",
  "mustIncludeTitle": "Je Verzekering Moet Bevatten",
  "mustIncludeItems": [
    "Surfdekking (sommige polissen beschouwen surfen als extreme sport)",
    "Zeeredding dekking",
    "Reis annuleringsdekking"
  ],
  "tipTitle": "Pro Tip",
  "tipText": "Controleer of je verzekering specifiek watersporten en surfactiviteiten dekt. Niet alle standaard reisverzekeringen bevatten dit."
}', 3),

('whatToBring', 'nl', 'Wat Mee te Nemen', '{
  "introText": "Dit is wat we aanbevelen in te pakken voor je surfavontuur:",
  "essentialsTitle": "Essentials",
  "essentialsItems": [
    "Geldig paspoort (controleer visumvereisten voor je bestemming)",
    "Reisverzekeringsdocumenten",
    "Zwemkleding en strandkleding",
    "Zonnebrand (bij voorkeur rifvriendelijk)",
    "Comfortabele kleding voor warm weer"
  ],
  "optionalTitle": "Optioneel maar Aanbevolen",
  "optionalItems": [
    "Je eigen wetsuit (als je er een hebt)",
    "Waterproof telefoonhoesje",
    "Herbruikbare waterfles",
    "Yogamat (voor wellness activiteiten)"
  ]
}', 4),

('legal', 'nl', 'Juridische Voorwaarden', '{
  "text": "Deze retreat wordt georganiseerd onder Spaans recht. Door te boeken, ga je akkoord met onze algemene voorwaarden en begrijp je dat eventuele geschillen worden behandeld door Spaanse rechtbanken."
}', 5);
