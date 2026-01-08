-- Migration: Add privacy policy content to policy_sections table
-- This adds Privacy Policy content in all supported languages

-- Insert English privacy policy
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('privacy', 'en', 'Privacy Policy', '{
  "introTitle": "Your Privacy Matters",
  "introText": "Rainbow Surf Retreats is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.",
  "collectTitle": "Information We Collect",
  "collectItems": [
    "Contact information (name, email, phone number)",
    "Booking details and payment information",
    "Communication preferences",
    "Technical data (IP address, browser type, when you visit our website)"
  ],
  "useTitle": "How We Use Your Information",
  "useItems": [
    "Processing your retreat bookings and payments",
    "Sending booking confirmations and important updates",
    "Sending newsletters (only if you opted in)",
    "Improving our services and website experience"
  ],
  "shareTitle": "Information Sharing",
  "shareText": "We do not sell your personal information. We may share your data with trusted service providers who help us operate our business (payment processors, email services) under strict confidentiality agreements.",
  "cookiesTitle": "Cookies",
  "cookiesText": "We use essential cookies to ensure our website functions properly. Analytics cookies help us understand how visitors use our site. You can manage cookie preferences in your browser settings.",
  "rightsTitle": "Your Rights",
  "rightsItems": [
    "Access your personal data",
    "Request correction of inaccurate data",
    "Request deletion of your data",
    "Withdraw consent for marketing communications",
    "Lodge a complaint with a data protection authority"
  ],
  "contactTitle": "Contact Us",
  "contactText": "For privacy-related questions or to exercise your rights, please email us at hello@rainbowsurfretreats.com"
}', 6);

-- Insert German privacy policy
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('privacy', 'de', 'Datenschutzerklärung', '{
  "introTitle": "Deine Privatsphäre ist uns wichtig",
  "introText": "Rainbow Surf Retreats verpflichtet sich, deine Privatsphäre zu schützen. Diese Richtlinie erklärt, wie wir deine persönlichen Daten sammeln, verwenden und schützen.",
  "collectTitle": "Welche Daten wir sammeln",
  "collectItems": [
    "Kontaktdaten (Name, E-Mail, Telefonnummer)",
    "Buchungsdetails und Zahlungsinformationen",
    "Kommunikationspräferenzen",
    "Technische Daten (IP-Adresse, Browsertyp, wenn du unsere Website besuchst)"
  ],
  "useTitle": "Wie wir deine Daten verwenden",
  "useItems": [
    "Bearbeitung deiner Retreat-Buchungen und Zahlungen",
    "Versand von Buchungsbestätigungen und wichtigen Updates",
    "Versand von Newslettern (nur wenn du zugestimmt hast)",
    "Verbesserung unserer Dienste und Website-Erfahrung"
  ],
  "shareTitle": "Datenweitergabe",
  "shareText": "Wir verkaufen deine persönlichen Daten nicht. Wir teilen deine Daten möglicherweise mit vertrauenswürdigen Dienstleistern, die uns beim Betrieb unseres Geschäfts helfen (Zahlungsabwickler, E-Mail-Dienste), unter strengen Vertraulichkeitsvereinbarungen.",
  "cookiesTitle": "Cookies",
  "cookiesText": "Wir verwenden essentielle Cookies, um sicherzustellen, dass unsere Website ordnungsgemäß funktioniert. Analyse-Cookies helfen uns zu verstehen, wie Besucher unsere Website nutzen. Du kannst Cookie-Einstellungen in deinen Browsereinstellungen verwalten.",
  "rightsTitle": "Deine Rechte",
  "rightsItems": [
    "Zugriff auf deine persönlichen Daten",
    "Korrektur ungenauer Daten anfordern",
    "Löschung deiner Daten anfordern",
    "Einwilligung für Marketing-Kommunikation widerrufen",
    "Beschwerde bei einer Datenschutzbehörde einreichen"
  ],
  "contactTitle": "Kontakt",
  "contactText": "Für datenschutzbezogene Fragen oder zur Ausübung deiner Rechte kontaktiere uns bitte per E-Mail unter hello@rainbowsurfretreats.com"
}', 6);

-- Insert Spanish privacy policy
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('privacy', 'es', 'Política de Privacidad', '{
  "introTitle": "Tu Privacidad Importa",
  "introText": "Rainbow Surf Retreats se compromete a proteger tu privacidad. Esta política explica cómo recopilamos, usamos y protegemos tu información personal.",
  "collectTitle": "Información que Recopilamos",
  "collectItems": [
    "Información de contacto (nombre, email, número de teléfono)",
    "Detalles de reserva e información de pago",
    "Preferencias de comunicación",
    "Datos técnicos (dirección IP, tipo de navegador, cuando visitas nuestra web)"
  ],
  "useTitle": "Cómo Usamos tu Información",
  "useItems": [
    "Procesar tus reservas y pagos de retiro",
    "Enviar confirmaciones de reserva y actualizaciones importantes",
    "Enviar newsletters (solo si has dado tu consentimiento)",
    "Mejorar nuestros servicios y experiencia web"
  ],
  "shareTitle": "Compartir Información",
  "shareText": "No vendemos tu información personal. Podemos compartir tus datos con proveedores de servicios de confianza que nos ayudan a operar nuestro negocio (procesadores de pago, servicios de email) bajo estrictos acuerdos de confidencialidad.",
  "cookiesTitle": "Cookies",
  "cookiesText": "Usamos cookies esenciales para asegurar que nuestra web funcione correctamente. Las cookies de análisis nos ayudan a entender cómo los visitantes usan nuestro sitio. Puedes gestionar las preferencias de cookies en la configuración de tu navegador.",
  "rightsTitle": "Tus Derechos",
  "rightsItems": [
    "Acceder a tus datos personales",
    "Solicitar corrección de datos inexactos",
    "Solicitar eliminación de tus datos",
    "Retirar consentimiento para comunicaciones de marketing",
    "Presentar una queja ante una autoridad de protección de datos"
  ],
  "contactTitle": "Contáctanos",
  "contactText": "Para preguntas relacionadas con la privacidad o para ejercer tus derechos, envíanos un email a hello@rainbowsurfretreats.com"
}', 6);

-- Insert French privacy policy
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('privacy', 'fr', 'Politique de Confidentialité', '{
  "introTitle": "Votre Vie Privée Compte",
  "introText": "Rainbow Surf Retreats s engage à protéger votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos informations personnelles.",
  "collectTitle": "Informations que Nous Collectons",
  "collectItems": [
    "Coordonnées (nom, email, numéro de téléphone)",
    "Détails de réservation et informations de paiement",
    "Préférences de communication",
    "Données techniques (adresse IP, type de navigateur, lors de votre visite sur notre site)"
  ],
  "useTitle": "Comment Nous Utilisons Vos Informations",
  "useItems": [
    "Traitement de vos réservations et paiements de retraite",
    "Envoi de confirmations de réservation et mises à jour importantes",
    "Envoi de newsletters (uniquement si vous avez accepté)",
    "Amélioration de nos services et expérience sur le site"
  ],
  "shareTitle": "Partage d Informations",
  "shareText": "Nous ne vendons pas vos informations personnelles. Nous pouvons partager vos données avec des prestataires de services de confiance qui nous aident à gérer notre activité (processeurs de paiement, services email) sous des accords de confidentialité stricts.",
  "cookiesTitle": "Cookies",
  "cookiesText": "Nous utilisons des cookies essentiels pour assurer le bon fonctionnement de notre site. Les cookies analytiques nous aident à comprendre comment les visiteurs utilisent notre site. Vous pouvez gérer les préférences de cookies dans les paramètres de votre navigateur.",
  "rightsTitle": "Vos Droits",
  "rightsItems": [
    "Accéder à vos données personnelles",
    "Demander la correction de données inexactes",
    "Demander la suppression de vos données",
    "Retirer votre consentement aux communications marketing",
    "Déposer une plainte auprès d une autorité de protection des données"
  ],
  "contactTitle": "Nous Contacter",
  "contactText": "Pour les questions liées à la confidentialité ou pour exercer vos droits, veuillez nous envoyer un email à hello@rainbowsurfretreats.com"
}', 6);

-- Insert Dutch privacy policy
INSERT INTO policy_sections (section_key, language, title, content, sort_order) VALUES
('privacy', 'nl', 'Privacybeleid', '{
  "introTitle": "Je Privacy is Belangrijk",
  "introText": "Rainbow Surf Retreats zet zich in voor de bescherming van je privacy. Dit beleid legt uit hoe we je persoonlijke gegevens verzamelen, gebruiken en beschermen.",
  "collectTitle": "Informatie die We Verzamelen",
  "collectItems": [
    "Contactgegevens (naam, email, telefoonnummer)",
    "Boekingsgegevens en betalingsinformatie",
    "Communicatievoorkeuren",
    "Technische gegevens (IP-adres, browsertype, wanneer je onze website bezoekt)"
  ],
  "useTitle": "Hoe We Je Informatie Gebruiken",
  "useItems": [
    "Verwerken van je retreat-boekingen en betalingen",
    "Versturen van boekingsbevestigingen en belangrijke updates",
    "Versturen van nieuwsbrieven (alleen als je hebt ingestemd)",
    "Verbeteren van onze diensten en website-ervaring"
  ],
  "shareTitle": "Informatie Delen",
  "shareText": "We verkopen je persoonlijke gegevens niet. We kunnen je gegevens delen met vertrouwde dienstverleners die ons helpen bij het runnen van ons bedrijf (betalingsverwerkers, emaildiensten) onder strikte vertrouwelijkheidsovereenkomsten.",
  "cookiesTitle": "Cookies",
  "cookiesText": "We gebruiken essentiële cookies om ervoor te zorgen dat onze website goed werkt. Analytische cookies helpen ons te begrijpen hoe bezoekers onze site gebruiken. Je kunt cookie-voorkeuren beheren in je browserinstellingen.",
  "rightsTitle": "Je Rechten",
  "rightsItems": [
    "Toegang tot je persoonlijke gegevens",
    "Verzoek tot correctie van onjuiste gegevens",
    "Verzoek tot verwijdering van je gegevens",
    "Toestemming voor marketingcommunicatie intrekken",
    "Klacht indienen bij een gegevensbeschermingsautoriteit"
  ],
  "contactTitle": "Contact",
  "contactText": "Voor privacy-gerelateerde vragen of om je rechten uit te oefenen, stuur ons een email naar hello@rainbowsurfretreats.com"
}', 6);
