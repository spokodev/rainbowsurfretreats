'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Instagram, Facebook, Youtube, ChevronDown, Send, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import ImageWithFallback from '@/components/ImageWithFallback'
import { HOME_SLIDER } from '@/lib/images'
import type { SingleImage } from '@/lib/validations/page-images'

interface FormData {
  name: string
  email: string
  subject: string
  message: string
}

interface FAQItem {
  question: string
  answer: string
}

const faqs: FAQItem[] = [
  {
    question: 'What skill level do I need to join a retreat?',
    answer: 'Our retreats welcome all skill levels, from complete beginners to advanced surfers. We tailor our lessons and activities to match your experience, ensuring everyone gets the most out of their surf experience.'
  },
  {
    question: 'What is included in the retreat package?',
    answer: 'Our packages typically include accommodation, daily surf lessons with professional instructors, surf equipment rental, yoga sessions, breakfast and some meals, airport transfers, and various group activities. Specific inclusions vary by retreat type.'
  },
  {
    question: 'Is the retreat LGBTQ+ exclusive?',
    answer: 'Our retreats are LGBTQ+ focused, creating a safe and welcoming space for our community. However, we welcome all allies and anyone who wants to be part of our inclusive, supportive environment.'
  },
  {
    question: 'What should I bring to the retreat?',
    answer: 'We recommend bringing swimwear, sunscreen, comfortable clothing, a reusable water bottle, and any personal items you need. Surf equipment is provided, but you\'re welcome to bring your own board if you prefer.'
  }
]

const contactInfo = [
  {
    icon: Mail,
    label: 'Email',
    value: 'info@rainbowsurfretreats.com',
    href: 'mailto:info@rainbowsurfretreats.com'
  },
  {
    icon: Phone,
    label: 'WhatsApp',
    value: '+34 662 42 45 63',
    href: 'https://wa.me/34662424563'
  },
  {
    icon: MapPin,
    label: 'Location',
    value: 'Cyprus',
    href: 'https://maps.google.com/?q=Cyprus'
  }
]

const socialLinks = [
  {
    icon: Instagram,
    label: '@surfergays',
    href: 'https://instagram.com/surfergays'
  },
  {
    icon: Instagram,
    label: '@longboardzaddy',
    href: 'https://instagram.com/longboardzaddy'
  },
  {
    icon: Facebook,
    label: 'Facebook',
    href: 'https://facebook.com/rainbowsurfretreats'
  },
  {
    icon: Youtube,
    label: 'YouTube',
    href: 'https://youtube.com/@rainbowsurfretreats'
  }
]

// Default header image fallback
const defaultHeaderImage = { url: HOME_SLIDER.surfersSunset, alt: 'Contact Rainbow Surf Retreats' }

interface ContactProps {
  headerImage?: SingleImage
}

export default function Contact({ headerImage }: ContactProps) {
  const displayHeaderImage = headerImage || defaultHeaderImage
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [openFAQ, setOpenFAQ] = useState<number | null>(null)

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setSubmitStatus('idle')

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send message')
      }

      setSubmitStatus('success')
      setFormData({ name: '', email: '', subject: '', message: '' })
    } catch (error) {
      console.error('Contact form error:', error)
      setSubmitStatus('error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleFAQ = (index: number) => {
    setOpenFAQ(openFAQ === index ? null : index)
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[40vh] md:h-[50vh] min-h-[300px] md:min-h-[400px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={displayHeaderImage.url}
            alt={displayHeaderImage.alt}
            fill
            className="object-cover"
            priority
            unoptimized={displayHeaderImage.url.includes('googleusercontent.com') || displayHeaderImage.url.includes('drive.google.com')}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/60" />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="relative z-10 text-center text-white px-4"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto opacity-90 leading-relaxed">
            Have questions about our retreats? We&apos;d love to hear from you.
            Reach out and let&apos;s start your surf adventure together.
          </p>
        </motion.div>
      </section>

      {/* Main Content */}
      <section className="py-16 md:py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Contact Info & Social - LEFT COLUMN */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="space-y-10 order-2 lg:order-1"
            >
              {/* Contact Information */}
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">
                  Let&apos;s <span className="text-[var(--primary-teal)]">Connect</span>
                </h2>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Whether you have questions about our retreats, need help choosing the right destination, or just want to say hi - we&apos;re here for you!
                </p>
                <div className="space-y-4">
                  {contactInfo.map((item, index) => (
                    <motion.a
                      key={item.label}
                      href={item.href}
                      target={item.label === 'Location' ? '_blank' : undefined}
                      rel={item.label === 'Location' ? 'noopener noreferrer' : undefined}
                      initial={{ opacity: 0, y: 20 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.4, delay: index * 0.1 }}
                      className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                    >
                      <div className="p-3 rounded-full bg-[var(--primary-teal)]/10 text-[var(--primary-teal)] group-hover:bg-[var(--primary-teal)] group-hover:text-white transition-colors">
                        <item.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">{item.label}</p>
                        <p className="font-medium">{item.value}</p>
                      </div>
                    </motion.a>
                  ))}
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-xl font-bold mb-4">Follow Our Journey</h3>
                <div className="flex flex-wrap gap-3">
                  {socialLinks.map((social, index) => (
                    <motion.a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 text-white hover:bg-[var(--primary-teal)] transition-colors"
                    >
                      <social.icon className="w-5 h-5" />
                    </motion.a>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Contact Form - RIGHT COLUMN */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="order-1 lg:order-2"
            >
              <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8">
                <h2 className="text-2xl font-bold mb-6">Send Us a Message</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    name="subject"
                    type="text"
                    placeholder="What's this about?"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    name="message"
                    placeholder="Tell us about your surf dreams..."
                    rows={6}
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  size="lg"
                  disabled={isSubmitting}
                  className="w-full bg-[var(--primary-teal)] hover:bg-[var(--primary-teal-hover)]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      Send Message
                    </span>
                  )}
                </Button>

                {submitStatus === 'success' && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-green-600 dark:text-green-400"
                  >
                    Thank you! Your message has been sent successfully.
                  </motion.p>
                )}
                {submitStatus === 'error' && (
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-600 dark:text-red-400"
                  >
                    Oops! Something went wrong. Please try again.
                  </motion.p>
                )}
              </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Find answers to common questions about our surf retreats.
              Can&apos;t find what you&apos;re looking for? Reach out to us directly!
            </p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="bg-background rounded-lg shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => toggleFAQ(index)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-muted/50 transition-colors"
                >
                  <span className="font-medium pr-4">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: openFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  </motion.div>
                </button>
                <motion.div
                  initial={false}
                  animate={{
                    height: openFAQ === index ? 'auto' : 0,
                    opacity: openFAQ === index ? 1 : 0
                  }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 pb-5 text-muted-foreground">
                    {faq.answer}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
