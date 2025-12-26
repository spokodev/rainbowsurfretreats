// Google Drive Image URLs

const createImageUrl = (id: string) => `https://lh3.googleusercontent.com/d/${id}`;

// LOGO & GLOBAL
export const LOGO = createImageUrl("1hxw3gafof-4vRQTtJEHU0NUDZq7y3zdX");

// HOME PAGE - Hero Slider
export const HOME_SLIDER = {
  silhouetteSunset: createImageUrl("1SUE4w2zOdfSReJKUxiBG-afOke-hILpU"),
  surfersSunset: createImageUrl("15BBlQMV1nrZ_S2j2mMOJ0dlG5KOqPstG"),
  surfersWaves: createImageUrl("1x0pA4iJuT5MolhsezqpOfHbqmAYCT2ph"),
};

// ABOUT PAGE
export const ABOUT_IMAGES = {
  surfersPosing: createImageUrl("1o2G7FaoADbTDjD9DLwqynJycNyy5zvpU"),
  aerialView: createImageUrl("111L44SJ2gK-27JaU1ySaqX0y_vvmvmCq"),
  whatsapp1: createImageUrl("1vmP6rD8nqYF6wq7kk3Ktdu1phM4ABVil"),
  whatsapp2: createImageUrl("1zeTAyDRBF71WYiBzXElY-BN7fC3jOR_w"),
  splashWater: createImageUrl("1ZEekzwC19BSToLmoQOoS-5HPzPgZfrPs"),
  ambassador: createImageUrl("1i3NBMLpQfUurZ6Vk-y_4_VG2z1GYfO3L"),
  ogImage: createImageUrl("1jCzwkbT9BdxQ430UdwaYkGj6AoYPxBXV"),
  rich: createImageUrl("1SEEqwECsz--syyT0frGyhN568QmZbgDy"),
  steven: createImageUrl("1X_nk8tVwLFucUgI3sTSpVIhWzooObkfz"),
};

// POLICIES PAGE
export const POLICIES_IMAGES = {
  underwater: createImageUrl("1ZeYVoLAd5-7NeD55zjf-ABpjzvliiS3-"),
};

// RETREATS PAGE - Retreat Cards
export const RETREAT_IMAGES = {
  siargao: createImageUrl("1M9DjpRoK9yLDnrb0APQui20CqoZJQ0on"),
  morocco: createImageUrl("1gmzAvkEmG8a-Q0C7LRtYmvLtV7i9T2d7"),
  indonesia: createImageUrl("1M9wT2uJ3k7NLh9DXQxB87kqCEpeFERbP"),
  france: createImageUrl("1_KL1hlzlJIOsgVZtsY7EK2sITMUytclC"),
  bali: createImageUrl("1qeZXaVcMZnMlOudKWgZkp8hOp6bflvEV"),
  portugal: createImageUrl("1-SD67qQrUOvzuIc4R9N24Hnkuesm6ZQ5"),
  panama: createImageUrl("124ODKBaQGlSa2nSPzrbGwE4LVmSno6n7"),
};

// BLOG PAGE - Article Thumbnails
export const BLOG_IMAGES = {
  surfingFrance: createImageUrl("19PlfUF2j4z0owryFWWb3DzhXSQ5pL_sH"),
  surfTripEssentials: createImageUrl("11-rnCaU_gBxsFSPkXwmKNyZ5QVy6Iax4"),
  gaySurfRetreat: createImageUrl("1FmS6IgHkCfzNc7tMKCpH4Qr6gwR4qzNc"),
};

// Export all as IMAGES object
export const IMAGES = {
  logo: LOGO,
  home: HOME_SLIDER,
  about: ABOUT_IMAGES,
  policies: POLICIES_IMAGES,
  retreats: RETREAT_IMAGES,
  blog: BLOG_IMAGES,
};
