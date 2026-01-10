import { createClient as createServiceClient } from '@supabase/supabase-js'
import { HOME_SLIDER, ABOUT_IMAGES, RETREAT_IMAGES, BLOG_IMAGES, POLICIES_IMAGES } from './images'
import type { PageImages, SliderImage, SingleImage } from './validations/page-images'

// Service role client for server-side operations
function getServiceSupabase() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// Default page images (current hardcoded values as fallback)
export const DEFAULT_PAGE_IMAGES: PageImages = {
  home: {
    slider: [
      { url: HOME_SLIDER.silhouetteSunset, alt: 'Surfer silhouette at sunset', sort_order: 0 },
      { url: HOME_SLIDER.surfersSunset, alt: 'Surfers enjoying sunset', sort_order: 1 },
      { url: HOME_SLIDER.surfersWaves, alt: 'Surfers riding waves', sort_order: 2 },
    ],
  },
  about: { header: { url: ABOUT_IMAGES.surfersPosing, alt: 'Rainbow Surf Retreats group' } },
  retreats: { header: { url: RETREAT_IMAGES.morocco, alt: 'Our Retreats' } },
  blog: { header: { url: BLOG_IMAGES.surfingFrance, alt: 'Surf Blog' } },
  policies: { header: { url: POLICIES_IMAGES.underwater, alt: 'Policies' } },
  contact: { header: { url: HOME_SLIDER.surfersSunset, alt: 'Contact us' } },
}

/**
 * Get all page images from database with fallback to defaults
 */
export async function getPageImages(): Promise<PageImages> {
  const supabase = getServiceSupabase()

  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'page_images')
    .single()

  if (error || !data) {
    return DEFAULT_PAGE_IMAGES
  }

  const dbImages = data.value as Partial<PageImages> | null

  if (!dbImages) {
    return DEFAULT_PAGE_IMAGES
  }

  // Merge with defaults to ensure all keys exist
  return {
    home: {
      slider: dbImages.home?.slider?.length
        ? dbImages.home.slider
        : DEFAULT_PAGE_IMAGES.home.slider,
    },
    about: {
      header: dbImages.about?.header || DEFAULT_PAGE_IMAGES.about.header,
    },
    retreats: {
      header: dbImages.retreats?.header || DEFAULT_PAGE_IMAGES.retreats.header,
    },
    blog: {
      header: dbImages.blog?.header || DEFAULT_PAGE_IMAGES.blog.header,
    },
    policies: {
      header: dbImages.policies?.header || DEFAULT_PAGE_IMAGES.policies.header,
    },
    contact: {
      header: dbImages.contact?.header || DEFAULT_PAGE_IMAGES.contact.header,
    },
  }
}

/**
 * Get home slider images sorted by order
 */
export async function getHomeSliderImages(): Promise<SliderImage[]> {
  const images = await getPageImages()
  return [...images.home.slider].sort((a, b) => a.sort_order - b.sort_order)
}

/**
 * Get page header image for a specific page
 */
export async function getPageHeaderImage(
  pageKey: 'about' | 'retreats' | 'blog' | 'policies' | 'contact'
): Promise<SingleImage> {
  const images = await getPageImages()
  return images[pageKey].header || DEFAULT_PAGE_IMAGES[pageKey].header!
}

/**
 * Get about page header image
 */
export async function getAboutHeaderImage(): Promise<SingleImage> {
  return getPageHeaderImage('about')
}

/**
 * Get retreats page header image
 */
export async function getRetreatsHeaderImage(): Promise<SingleImage> {
  return getPageHeaderImage('retreats')
}

/**
 * Get blog page header image
 */
export async function getBlogHeaderImage(): Promise<SingleImage> {
  return getPageHeaderImage('blog')
}

/**
 * Get policies page header image
 */
export async function getPoliciesHeaderImage(): Promise<SingleImage> {
  return getPageHeaderImage('policies')
}

/**
 * Get contact page header image
 */
export async function getContactHeaderImage(): Promise<SingleImage> {
  return getPageHeaderImage('contact')
}
