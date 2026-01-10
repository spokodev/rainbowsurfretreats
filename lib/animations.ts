// Illustration opacity configuration - change these values to adjust visibility globally
export const illustrationOpacity = {
  // Homepage - Hero section
  heroSun: 0.25,
  heroBird: 0.30,
  heroWave: 0.20,

  // Homepage - Features section
  featuresShell: 0.25,
  featuresStarfish: 0.20,

  // Homepage - Testimonials section
  testimonialsShell: 0.20,
  testimonialsStarfish: 0.15,

  // Homepage - Newsletter section
  newsletterWave: 0.20,
  newsletterSurfer: 0.25,

  // Footer section (all pages)
  footerWave: 0.50,
  footerShaka: 0.15,

  // Retreats page
  retreatsSun: 0.20,
  retreatsBird: 0.25,
  retreatsShell: 0.15,
  retreatsStarfish: 0.12,

  // About page
  aboutShell: 0.20,
  aboutStarfish: 0.15,
  aboutWave: 0.15,

  // Contact page
  contactShell: 0.20,
  contactWave: 0.15,
  contactSurfer: 0.20,

  // Blog page
  blogShell: 0.15,
  blogStarfish: 0.12,
  blogBird: 0.20,

  // Booking page
  bookingWave: 0.15,
  bookingShell: 0.12,

  // Additional elements (palm, surfboard, flipflops)
  palm: 0.15,
  surfboard: 0.12,
  flipFlops: 0.10,

  // New illustrations (fin, flowers, tropicalLeaves)
  fin: 0.12,
  flowers: 0.15,
  tropicalLeaves: 0.12,

  // Retreat detail page
  retreatDetailFin: 0.15,
  retreatDetailFlowers: 0.12,
  retreatDetailLeaves: 0.10,
  retreatDetailWave: 0.15,

  // Blog post page
  blogPostFlowers: 0.12,
  blogPostLeaves: 0.10,
  blogPostShell: 0.12,

  // Admin section
  adminShaka: 0.30,
};

// Animation variants for Framer Motion

export const floatAnimation = {
  animate: {
    y: [0, -10, 0],
  },
  transition: {
    duration: 4,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export const waveAnimation = {
  animate: {
    x: [-10, 10, -10],
  },
  transition: {
    duration: 6,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export const rotateAnimation = {
  animate: {
    rotate: 360,
  },
  transition: {
    duration: 60,
    repeat: Infinity,
    ease: 'linear' as const,
  },
};

export const birdAnimation = {
  animate: {
    y: [0, -15, 0],
    rotate: [-3, 3, -3],
  },
  transition: {
    duration: 5,
    repeat: Infinity,
    ease: 'easeInOut' as const,
  },
};

export const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 },
};

export const fadeInLeft = {
  initial: { opacity: 0, x: -30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6 },
};

export const fadeInRight = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  transition: { duration: 0.6 },
};

export const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

export const scaleOnHover = {
  whileHover: { scale: 1.05 },
  whileTap: { scale: 0.95 },
};

export const cardHover = {
  whileHover: {
    y: -8,
    transition: { type: 'spring', stiffness: 300 },
  },
};
