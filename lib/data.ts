import { RETREAT_IMAGES } from "./images";

export interface RetreatRoom {
  id: string;
  name: string;
  price: number;
  depositPrice: number;
  available: number;
  soldOut: boolean;
  description: string;
}

export interface Retreat {
  id: number;
  slug: string;
  destination: string;
  location: string;
  image: string;
  level: string;
  duration: string;
  participants: string;
  food: string;
  type: string;
  gear: string;
  price: string;
  earlyBird: string;
  date: string;
  description?: string;
  highlights?: string[];
  included?: string[];
  notIncluded?: string[];
  introText?: string;
  exactAddress?: string;
  addressNote?: string;
  aboutSections?: {
    title?: string;
    paragraphs: string[];
  }[];
  pricingNote?: string;
  rooms?: RetreatRoom[];
  importantInfo?: {
    paymentTerms?: string;
    cancellationPolicy?: string;
    travelInsurance?: string;
    whatToBring?: string;
  };
}

export const retreats: Retreat[] = [
  {
    id: 1,
    slug: "siargao-philippines-jan-2026",
    destination: "Siargao, Philippines",
    location: "Cloud 9",
    image: RETREAT_IMAGES.siargao,
    level: "Intermediate",
    duration: "7 days",
    participants: "8-12",
    food: "Included",
    type: "Premium",
    gear: "Board shorts",
    price: "€1,199",
    earlyBird: "€1,079",
    date: "Jan 25 - Feb 1, 2026",
    description: "Experience the legendary waves of Cloud 9 in Siargao, one of the world's premier surfing destinations. This premium retreat combines world-class surf breaks with pristine tropical beaches and vibrant LGBTQ+ community vibes.",
    highlights: [
      "Daily surf sessions at Cloud 9 and surrounding breaks",
      "Professional surf coaching for intermediate levels",
      "Island hopping and lagoon exploration",
      "Beachfront accommodation steps from the waves",
      "Sunset sessions and beach bonfires",
      "Local Filipino cuisine and fresh seafood",
    ],
    included: [
      "7 nights accommodation in beachfront resort",
      "Daily breakfast, lunch and dinner",
      "Surfboard rental for the entire week",
      "Professional surf coaching (2 sessions per day)",
      "Island hopping tour",
      "Airport transfers",
      "Welcome and farewell dinner",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses and souvenirs",
      "Alcoholic beverages",
      "Additional activities outside the program",
    ],
    introText: "Welcome to Siargao, a tropical paradise known for its world-class waves and vibrant LGBTQ+ community.",
    exactAddress: "Cloud 9, Siargao Island, Philippines",
    rooms: [
      {
        id: "1",
        name: "Beachfront Suite",
        price: 150,
        depositPrice: 50,
        available: 2,
        soldOut: false,
        description: "A spacious suite with a private balcony overlooking the ocean.",
      },
      {
        id: "2",
        name: "Beachfront Room",
        price: 100,
        depositPrice: 30,
        available: 4,
        soldOut: false,
        description: "A cozy room with a private balcony overlooking the ocean.",
      },
    ],
    importantInfo: {
      paymentTerms: "50% deposit required at the time of booking. Balance due 30 days before the retreat.",
      cancellationPolicy: "Cancellations made 30 days before the retreat are fully refundable.",
      travelInsurance: "We recommend purchasing travel insurance to cover any unforeseen circumstances.",
      whatToBring: "Board shorts, swimsuit, sunscreen, hat, flip-flops, and a reusable water bottle.",
    },
  },
  {
    id: 2,
    slug: "morocco-march-2026",
    destination: "Morocco",
    location: "Taghazout",
    image: RETREAT_IMAGES.morocco,
    level: "Beginners",
    duration: "7 days",
    participants: "8-12",
    food: "Included",
    type: "Budget",
    gear: "Board shorts",
    price: "€599",
    earlyBird: "€539",
    date: "March 21-28, 2026",
    description: "Discover the magic of Morocco's surf coast in Taghazout. Perfect for beginners, this budget-friendly retreat offers consistent waves, warm weather, and an authentic Moroccan experience.",
    highlights: [
      "Beginner-friendly beach breaks",
      "Traditional Moroccan hammam experience",
      "Sunrise and sunset surf sessions",
      "Yoga classes on the beach",
      "Visit to local markets and villages",
      "Authentic Moroccan cuisine",
    ],
    included: [
      "7 nights in surf house accommodation",
      "Daily breakfast, lunch and dinner",
      "Surfboard and wetsuit rental",
      "Surf lessons (5 days)",
      "Daily yoga sessions",
      "Local cultural tour",
      "Airport transfers",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Alcoholic beverages",
      "Optional excursions",
    ],
  },
  {
    id: 3,
    slug: "indonesia-may-2026",
    destination: "Indonesia",
    location: "Bali / Lombok",
    image: RETREAT_IMAGES.indonesia,
    level: "Beginners",
    duration: "7 days",
    participants: "10-14",
    food: "Included",
    type: "Premium",
    gear: "Board shorts",
    price: "€1,099",
    earlyBird: "€989",
    date: "May 16-23, 2026",
    description: "Explore the paradise islands of Bali and Lombok. This premium retreat offers stunning beaches, vibrant culture, and perfect waves for beginners in a tropical setting.",
    highlights: [
      "Surf multiple spots across Bali and Lombok",
      "Temple visits and cultural experiences",
      "Snorkeling and diving opportunities",
      "Traditional Balinese massage",
      "Beach clubs and sunset sessions",
      "Farm-to-table Indonesian cuisine",
    ],
    included: [
      "7 nights premium accommodation",
      "All meals included",
      "Surfboard rental",
      "Professional coaching (daily)",
      "Island transfers",
      "Cultural tours",
      "Airport pickup and drop-off",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Spa treatments",
      "Optional activities",
    ],
  },
  {
    id: 4,
    slug: "france-june-2026",
    destination: "France",
    location: "Hossegor / Biarritz",
    image: RETREAT_IMAGES.france,
    level: "Intermediate",
    duration: "7 days",
    participants: "8-12",
    food: "Included",
    type: "Premium",
    gear: "Wetsuit",
    price: "€899",
    earlyBird: "€809",
    date: "June 6-13, 2026",
    description: "Surf the legendary beach breaks of Hossegor and experience the elegant surf culture of Biarritz.",
    highlights: [
      "Surf famous breaks like La Gravière",
      "French surf culture immersion",
      "Gourmet French cuisine",
      "Visit charming coastal villages",
      "Beach club sunset sessions",
      "Optional wine tasting tours",
    ],
    included: [
      "7 nights accommodation",
      "Daily breakfast, lunch and dinner",
      "Wetsuit and surfboard rental",
      "Surf coaching sessions",
      "Cultural excursions",
      "Airport transfers",
      "Welcome aperitif",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Wine and spirits",
      "Optional activities",
    ],
  },
  {
    id: 5,
    slug: "bali-september-2026",
    destination: "Bali",
    location: "Canggu",
    image: RETREAT_IMAGES.bali,
    level: "Beginners",
    duration: "10 days",
    participants: "10-14",
    food: "Included",
    type: "Premium",
    gear: "Board shorts",
    price: "€1,299",
    earlyBird: "€1,169",
    date: "Sept 11-21, 2026",
    description: "Immerse yourself in Canggu's vibrant surf and digital nomad scene. This extended retreat offers perfect beginner waves, incredible food scene, and a thriving LGBTQ+ community.",
    highlights: [
      "Surf iconic Canggu breaks like Echo Beach",
      "Daily yoga and wellness activities",
      "Explore rice terraces and temples",
      "Beach club parties and social events",
      "Healthy cafe culture",
      "Balinese cooking class",
    ],
    included: [
      "10 nights premium villa accommodation",
      "All meals (breakfast, lunch, dinner)",
      "Surfboard rental for entire stay",
      "Daily surf lessons",
      "Yoga classes (5 sessions)",
      "Cultural tours and temple visits",
      "Airport transfers",
      "Cooking class",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Spa treatments",
      "Alcoholic beverages",
    ],
  },
  {
    id: 6,
    slug: "portugal-october-2026",
    destination: "Portugal",
    location: "Ericeira",
    image: RETREAT_IMAGES.portugal,
    level: "Intermediate",
    duration: "7 days",
    participants: "6-10",
    food: "Included",
    type: "Premium",
    gear: "Wetsuit",
    price: "€899",
    earlyBird: "€809",
    date: "Oct 10-17, 2026",
    description: "Surf Europe's first World Surfing Reserve in the charming fishing village of Ericeira.",
    highlights: [
      "Surf multiple world-class reef breaks",
      "Explore historic Ericeira village",
      "Fresh seafood and Portuguese wines",
      "Coastal cliff walks and viewpoints",
      "Traditional Portuguese culture",
      "Sunset sessions at Ribeira d'Ilhas",
    ],
    included: [
      "7 nights boutique accommodation",
      "Daily breakfast, lunch and dinner",
      "Wetsuit and board rental",
      "Professional surf coaching",
      "Cultural excursions",
      "Wine tasting experience",
      "Airport transfers from Lisbon",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Additional alcoholic beverages",
      "Optional activities",
    ],
  },
  {
    id: 7,
    slug: "panama-december-2026",
    destination: "Panama",
    location: "Santa Catalina",
    image: RETREAT_IMAGES.panama,
    level: "Beginners",
    duration: "8 days",
    participants: "6-10",
    food: "Included",
    type: "Budget",
    gear: "Board shorts",
    price: "€799",
    earlyBird: "€719",
    date: "Nov 29 - Dec 7, 2026",
    description: "Discover Panama's hidden surf gem in Santa Catalina. This budget-friendly retreat offers uncrowded waves, pristine beaches, and access to world-famous Isla Coiba for diving.",
    highlights: [
      "Uncrowded surf breaks",
      "Boat trip to Isla Coiba",
      "Snorkeling with tropical fish",
      "Jungle and waterfall hikes",
      "Fresh tropical fruits and local cuisine",
      "Laid-back Caribbean vibes",
    ],
    included: [
      "8 nights in beachfront hostel",
      "Daily breakfast, lunch and dinner",
      "Surfboard rental",
      "Surf lessons (5 days)",
      "Isla Coiba boat tour",
      "Jungle trek",
      "Local transfers",
    ],
    notIncluded: [
      "International flights",
      "Travel insurance",
      "Personal expenses",
      "Alcoholic beverages",
      "Diving certification courses",
    ],
  },
];

export function getRetreatById(id: number): Retreat | undefined {
  return retreats.find((retreat) => retreat.id === id);
}

export function getRetreatBySlug(slug: string): Retreat | undefined {
  return retreats.find((retreat) => retreat.slug === slug);
}
