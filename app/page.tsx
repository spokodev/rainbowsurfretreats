import Hero from '@/components/Hero'
import NextRetreats from '@/components/NextRetreats'
import Features from '@/components/Features'
import Testimonials from '@/components/Testimonials'
import Newsletter from '@/components/Newsletter'
import { getHomeSliderImages } from '@/lib/page-images'

export const revalidate = 3600 // Revalidate every hour

export default async function HomePage() {
  const sliderImages = await getHomeSliderImages()

  return (
    <>
      <Hero sliderImages={sliderImages} />
      <NextRetreats />
      <Features />
      <Testimonials />
      <Newsletter />
    </>
  )
}
