'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useLocale } from 'next-intl'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, User, Share2, Facebook, Twitter, Linkedin, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { BlogPost, BlogLanguage } from '@/lib/types/database'
import { getBlogPostBySlug } from '@/lib/blog-data'
import type { BlogPost as StaticBlogPost } from '@/components/BlogCard'

// Available languages for language switcher
const LANGUAGES: { code: BlogLanguage; name: string; flag: string }[] = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
]

const categoryColors: Record<string, string> = {
  destinations: 'bg-purple-100 text-purple-800',
  'travel-tips': 'bg-blue-100 text-blue-800',
  lgbtq: 'bg-pink-100 text-pink-800',
  wellness: 'bg-green-100 text-green-800',
  environment: 'bg-teal-100 text-teal-800',
}

function estimateReadTime(content: string): string {
  const wordsPerMinute = 200
  const words = content.split(/\s+/).length
  const minutes = Math.ceil(words / wordsPerMinute)
  return `${minutes} min read`
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// Static blog post content (full articles)
function getStaticPostContent(slug: string): string {
  const content: Record<string, string> = {
    '10-things-surfing-france': `
## Welcome to the French Surf Scene

France is one of Europe's premier surf destinations, offering world-class waves along its Atlantic coastline. Whether you're a beginner looking to catch your first wave or an experienced surfer seeking challenging breaks, France has something for everyone.

## 1. The Best Time to Surf

The optimal surfing season in France runs from September to November when Atlantic swells are consistent and crowds are smaller. Summer months (June-August) are great for beginners with smaller, more manageable waves, though beaches can be crowded.

## 2. Top Surf Spots

**Hossegor** - Often called the European Pipeline, known for powerful beach breaks.
**Biarritz** - The birthplace of European surfing, offering waves for all levels.
**Lacanau** - Famous for hosting international competitions.
**Capbreton** - Protected from the wind, perfect for beginners.

## 3. Water Temperature

French Atlantic waters range from 12°C (54°F) in winter to 22°C (72°F) in summer. A 4/3mm wetsuit is essential year-round, with a 5/4mm recommended for winter months.

## 4. Local Surf Culture

The French surf community is welcoming but respects local etiquette. Wait your turn, don't drop in on other surfers, and always give right of way to the surfer closest to the peak.

## 5. Equipment Rental

Surf shops line the coast in every major surf town. Daily board rentals range from €15-30, and wetsuits from €10-15. Many shops offer package deals for weekly rentals.

## 6. Surf Schools

France boasts excellent surf schools with multilingual instructors. Group lessons typically cost €40-50 for 2 hours, while private lessons range from €60-80.

## 7. Food & Wine

Enjoy the best of French cuisine après-surf! Local specialties include fresh oysters, duck confit, and the famous Basque cake. The region produces excellent wines, including rosé perfect for sunset beach sessions.

## 8. Accommodation Options

From beachfront campsites to luxury surf lodges, accommodation options suit every budget. Book early for peak season (July-August) as popular spots fill quickly.

## 9. Getting There

Biarritz has its own international airport with connections to major European cities. Bordeaux airport is another option, about 2 hours from the main surf spots. Renting a car is recommended for exploring the coastline.

## 10. Beyond Surfing

Take a break from the waves to explore medieval villages, indulge in wine tasting, or visit San Sebastian just across the Spanish border. The Pyrenees mountains offer hiking and mountain biking opportunities.

---

France offers an unforgettable surf experience combining world-class waves with rich culture, incredible food, and welcoming communities. Whether you're chasing barrels or learning to stand up for the first time, the French coast awaits!
    `,
    '13-surf-trip-essentials': `
## The Ultimate Surf Trip Packing List

Planning a surf trip can be exciting, but packing for one? That's where things can get tricky. Whether you're heading to Bali, Portugal, or Morocco, having the right gear can make or break your experience.

## 1. Your Surfboard (or Boards!)

Obviously, the most important item. Consider bringing two boards if possible—your go-to shortboard and something with more volume for smaller days. Don't forget a quality board bag with padding to protect your precious cargo during travel.

## 2. Wetsuits

Even tropical destinations can have cooler water. Pack:
- A spring suit or shorty for warm water
- A 3/2mm fullsuit for moderate temperatures
- Consider a 4/3mm if heading somewhere cooler

## 3. Reef Boots

Essential for rocky breaks and reef points. They protect your feet and give you confidence when paddling out over sharp surfaces.

## 4. Sunscreen (Reef-Safe!)

Choose mineral-based, reef-safe sunscreen. You'll be applying it multiple times daily, so bring enough! Look for zinc-based options that provide better protection for long sessions.

## 5. Rashguard

Protects against:
- Sunburn during long sessions
- Board rash on your chest and stomach
- Jellyfish stings

## 6. Surf Wax & Wax Comb

Bring enough wax for the water temperature you'll encounter. A wax comb is essential for maintaining grip and removing old wax when needed.

## 7. Leash

Always bring at least one spare leash. They're prone to breaking at the worst times, and finding the right size in remote locations isn't always easy.

## 8. Ding Repair Kit

A small kit with solar resin can save your trip. Minor dings happen, and being able to fix them quickly means more time in the water.

## 9. First Aid Kit

Include:
- Waterproof bandages
- Antiseptic cream
- Pain relievers
- Motion sickness tablets
- Any personal medications

## 10. Earplugs

Surfer's ear is real and preventable. Quality earplugs designed for water sports protect your ears while still allowing you to hear.

## 11. Waterproof Phone Case

Document your sessions! A waterproof case or bag lets you safely bring your phone to the beach and capture memories.

## 12. Reusable Water Bottle

Stay hydrated before and after sessions. A quality insulated bottle keeps water cold all day.

## 13. Quick-Dry Towel

Microfiber towels dry fast, pack small, and are perfect for travel. Bring two if you'll be surfing multiple times daily.

---

## Bonus Tips

- Roll your wetsuits instead of folding to prevent creases
- Use packing cubes to organize surf gear
- Arrive a day early to adjust to time zones
- Always check board bag weight limits with your airline

With this list covered, you're ready for an incredible surf adventure. Now go chase those waves!
    `,
    '10-reasons-gay-surf-retreat': `
## Why a Gay Surf Retreat is Different (and Better!)

Looking for your next adventure? Dreaming of a vacation that's more than just a beach and a board? Here's why a gay surf retreat might be exactly what you need.

## 1. A Truly Welcoming Environment

At a gay surf retreat, you don't have to wonder if you'll be accepted. Everyone is there to celebrate who they are while pursuing their passion for surfing. There's no need to explain yourself or worry about judgment.

## 2. Instant Community

Walking into a group where everyone shares common ground creates instant connections. You'll make friends who understand your experiences and share your interests beyond just surfing.

## 3. Expert Instruction Without Awkwardness

Our instructors understand LGBTQ+ experiences and create an environment where everyone feels comfortable learning. No awkward moments, just supportive coaching.

## 4. Safe Space to Be Yourself

Express yourself freely on and off the board. Whether you're out and proud or still exploring your identity, surf retreats provide a judgment-free zone to be authentically you.

## 5. Unique Social Events

From beach bonfires to sunset cocktails, social events are designed with the LGBTQ+ community in mind. Think drag queen beach parties, pride flags flying, and playlists that actually slap.

## 6. Travel to LGBTQ+-Friendly Destinations

We choose locations known for their acceptance and vibrant LGBTQ+ scenes. Surf by day, explore gay-friendly nightlife by night.

## 7. All Skill Levels Welcome

Never surfed before? No problem. Advanced surfer looking for challenging waves? We've got you covered. Our retreats cater to every level with appropriate instruction and wave selection.

## 8. Photography That Celebrates You

Professional photographers capture your surf sessions. No worrying about how you're portrayed—our team celebrates diverse bodies and expressions.

## 9. Wellness Beyond Surfing

Many retreats include:
- Yoga sessions
- Meditation workshops
- Healthy, inclusive meals
- Spa treatments

## 10. Memories That Last a Lifetime

The combination of adventure, community, and self-expression creates experiences you'll never forget. Many participants return year after year, and lifelong friendships are formed.

---

## Ready to Join Us?

Rainbow Surf Retreats offers inclusive surf adventures in stunning destinations worldwide. Whether you're a first-timer or experienced surfer, there's a place for you in our community.

**Catch waves. Make memories. Be yourself.**
    `,
  }

  return content[slug] || 'Content not available. Please try again later.'
}

// Type for display post data (unified format)
interface DisplayPost {
  title: string
  content: string
  featured_image_url: string
  author_name: string
  published_at: string
  excerpt?: string
  category?: { name: string; slug: string } | string
  tags?: string[]
  availableLanguages?: BlogLanguage[]
  currentLanguage?: BlogLanguage
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string
  const locale = useLocale() as BlogLanguage
  const [post, setPost] = useState<DisplayPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentLang, setCurrentLang] = useState<BlogLanguage>(locale || 'en')

  useEffect(() => {
    async function fetchPost() {
      try {
        // First, try to get from static data (for existing blog posts)
        const staticPost = getBlogPostBySlug(slug)

        if (staticPost) {
          // Convert static post to expected format
          setPost({
            title: staticPost.title,
            content: getStaticPostContent(slug),
            featured_image_url: staticPost.image,
            author_name: staticPost.author.name,
            published_at: staticPost.publishedAt,
            excerpt: staticPost.excerpt,
            category: { name: staticPost.category, slug: staticPost.categorySlug },
            tags: [],
            availableLanguages: ['en'], // Static posts only in English
            currentLanguage: 'en',
          })
          setLoading(false)
          return
        }

        // If not in static data, try API (for new posts from Supabase)
        // Fetch with language parameter for translated content
        const response = await fetch(`/api/blog/posts?slug=${slug}&lang=${currentLang}`)
        const data = await response.json()

        if (data.error) {
          setError(data.error)
        } else if (data.data && data.data.length > 0) {
          const dbPost = data.data[0]

          // Determine which languages have translations
          const availableLangs: BlogLanguage[] = ['en'] // Primary always available
          if (dbPost.translations) {
            Object.keys(dbPost.translations).forEach((lang) => {
              if (dbPost.translations[lang]?.title && dbPost.translations[lang]?.content) {
                availableLangs.push(lang as BlogLanguage)
              }
            })
          }

          setPost({
            title: dbPost.title,
            content: dbPost.content,
            featured_image_url: dbPost.featured_image_url,
            author_name: dbPost.author_name,
            published_at: dbPost.published_at,
            excerpt: dbPost.excerpt,
            category: dbPost.category,
            tags: dbPost.tags,
            availableLanguages: availableLangs,
            currentLanguage: currentLang,
          })
        } else {
          setError('Post not found')
        }
      } catch {
        setError('Failed to load post')
      } finally {
        setLoading(false)
      }
    }

    if (slug) {
      fetchPost()
    }
  }, [slug, currentLang])

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--sand-light)]">
        <div className="container mx-auto px-4 py-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <Skeleton className="h-[400px] w-full mb-8 rounded-2xl" />
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-[var(--sand-light)] flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">{error || 'The blog post you are looking for does not exist.'}</p>
          <Link href="/blog">
            <Button>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const categorySlug = typeof post.category === 'object' ? post.category?.slug : 'destinations'
  const categoryColor = categoryColors[categorySlug || 'destinations'] || 'bg-gray-100 text-gray-800'
  const readTime = estimateReadTime(post.content)

  return (
    <div className="min-h-screen bg-[var(--sand-light)]">
      {/* Hero Image */}
      <div className="relative h-[50vh] md:h-[60vh] w-full">
        <Image
          src={post.featured_image_url || '/images/blog/default.jpg'}
          alt={post.title}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />

        {/* Back Button */}
        <div className="absolute top-8 left-8 z-[60]">
          <Link href="/blog">
            <Button variant="secondary" size="sm" className="bg-white/90 hover:bg-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Blog
            </Button>
          </Link>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
          <div className="container mx-auto">
            <Badge className={`${categoryColor} mb-4`}>
              {typeof post.category === 'object' ? post.category?.name : post.category || 'Blog'}
            </Badge>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 max-w-4xl">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/90 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                <span>{post.author_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{post.published_at ? formatDate(post.published_at) : 'Draft'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{readTime}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <article className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xl text-gray-600 mb-8 leading-relaxed font-medium">
              {post.excerpt}
            </p>
          )}

          {/* Main Content */}
          <div
            className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-[var(--primary-teal)] prose-strong:text-gray-900"
            dangerouslySetInnerHTML={{ __html: formatContent(post.content) }}
          />

          {/* Tags */}
          {post.tags && post.tags.length > 0 && (
            <div className="mt-12 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="bg-gray-100 text-gray-700">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Language Switcher */}
          {post.availableLanguages && post.availableLanguages.length > 1 && (
            <div className="mt-8 pt-8 border-t border-gray-200">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                Read in another language
              </h3>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.filter(lang => post.availableLanguages?.includes(lang.code)).map((lang) => (
                  <Button
                    key={lang.code}
                    variant={currentLang === lang.code ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentLang(lang.code)}
                    className={currentLang === lang.code ? "bg-[var(--primary-teal)]" : ""}
                  >
                    <span className="mr-1">{lang.flag}</span>
                    {lang.name}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Share */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-500 uppercase mb-4 flex items-center gap-2">
              <Share2 className="w-4 h-4" />
              Share this article
            </h3>
            <div className="flex gap-3">
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href)
                  window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank', 'width=600,height=400')
                }}
              >
                <Facebook className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href)
                  const text = encodeURIComponent(post.title)
                  window.open(`https://twitter.com/intent/tweet?url=${url}&text=${text}`, '_blank', 'width=600,height=400')
                }}
              >
                <Twitter className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="rounded-full"
                onClick={() => {
                  const url = encodeURIComponent(window.location.href)
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, '_blank', 'width=600,height=400')
                }}
              >
                <Linkedin className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>
    </div>
  )
}

// Convert markdown-style content to HTML
function formatContent(content: string): string {
  return content
    // Headers
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.*$)/gim, '<li>$1</li>')
    // Paragraphs
    .replace(/\n\n/g, '</p><p>')
    // Wrap in paragraph
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith('<h') || match.startsWith('<li') || match.startsWith('<ul') || match.startsWith('</')) {
        return match
      }
      return `<p>${match}</p>`
    })
    // Clean up empty paragraphs
    .replace(/<p><\/p>/g, '')
    .replace(/<p><h/g, '<h')
    .replace(/<\/h2><\/p>/g, '</h2>')
    .replace(/<\/h3><\/p>/g, '</h3>')
    // Wrap lists (using [\s\S] instead of 's' flag for compatibility)
    .replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>')
    // Horizontal rules
    .replace(/^---$/gim, '<hr />')
}
