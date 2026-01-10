// Illustration opacity configuration - change these values to adjust visibility globally
export const illustrationOpacity = {
  // Hero section
  heroSun: 0.25,
  heroBird: 0.30,
  heroWave: 0.20,

  // Features section
  featuresShell: 0.25,
  featuresStarfish: 0.20,

  // Testimonials section
  testimonialsShell: 0.20,
  testimonialsStarfish: 0.15,

  // Newsletter section
  newsletterWave: 0.20,
  newsletterSurfer: 0.25,

  // Footer section
  footerWave: 0.50,
  footerShaka: 0.15,

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
