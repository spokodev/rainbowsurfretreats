'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Star, Loader2, CheckCircle, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'

interface RatingCategory {
  id: string
  label: string
  value: number
}

function StarRating({
  value,
  onChange,
}: {
  value: number
  onChange: (v: number) => void
}) {
  const [hover, setHover] = useState(0)

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          className="p-1 transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hover || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function NPSRating({
  value,
  onChange,
}: {
  value: number | null
  onChange: (v: number) => void
}) {
  return (
    <div className="flex flex-wrap gap-2 justify-center">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
        <button
          key={num}
          type="button"
          onClick={() => onChange(num)}
          className={`w-10 h-10 rounded-lg font-semibold transition-all ${
            value === num
              ? num <= 6
                ? 'bg-red-500 text-white'
                : num <= 8
                ? 'bg-yellow-500 text-white'
                : 'bg-green-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          {num}
        </button>
      ))}
    </div>
  )
}

function FeedbackContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const bookingId = searchParams.get('booking')

  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const [ratings, setRatings] = useState<RatingCategory[]>([
    { id: 'overall', label: 'Overall Experience', value: 0 },
    { id: 'surfing', label: 'Surf Lessons & Waves', value: 0 },
    { id: 'accommodation', label: 'Accommodation', value: 0 },
    { id: 'food', label: 'Food & Meals', value: 0 },
    { id: 'staff', label: 'Staff & Instructors', value: 0 },
  ])

  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [highlights, setHighlights] = useState('')
  const [improvements, setImprovements] = useState('')
  const [testimonial, setTestimonial] = useState('')
  const [allowTestimonial, setAllowTestimonial] = useState(false)

  const updateRating = (id: string, value: number) => {
    setRatings((prev) =>
      prev.map((r) => (r.id === id ? { ...r, value } : r))
    )
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          ratings: ratings.reduce((acc, r) => ({ ...acc, [r.id]: r.value }), {}),
          npsScore,
          highlights,
          improvements,
          testimonial,
          allowTestimonial,
        }),
      })

      if (response.ok) {
        setIsComplete(true)
      }
    } catch (error) {
      console.error('Feedback error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!bookingId) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This feedback link is invalid or has expired.
          </p>
          <Button onClick={() => router.push('/')}>Go to Homepage</Button>
        </div>
      </div>
    )
  }

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-4">Thank You!</h1>

          <p className="text-gray-600 mb-6">
            Your feedback means the world to us. It helps us create even better
            experiences for our community.
          </p>

          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              Would you also share your experience on Google?
            </p>
            <Button
              asChild
              className="w-full bg-[#ea4335] hover:bg-[#d33426]"
            >
              <a
                href="https://g.page/r/YOUR_GOOGLE_REVIEW_LINK/review"
                target="_blank"
                rel="noopener noreferrer"
              >
                Leave Google Review
                <ExternalLink className="ml-2 w-4 h-4" />
              </a>
            </Button>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Back to Homepage
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-ochre py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-ocean p-8 text-center text-white">
            <h1 className="text-2xl font-bold mb-2">Share Your Experience</h1>
            <p className="opacity-90">
              Help us improve and inspire others to join our community
            </p>
          </div>

          {/* Progress */}
          <div className="px-8 pt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Step {step} of 3</span>
              <span>{Math.round((step / 3) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-ocean transition-all duration-300"
                style={{ width: `${(step / 3) * 100}%` }}
              />
            </div>
          </div>

          <div className="p-8">
            {/* Step 1: Ratings */}
            {step === 1 && (
              <div className="space-y-8">
                <h2 className="text-xl font-semibold text-center mb-6">
                  Rate Your Experience
                </h2>

                {ratings.map((rating) => (
                  <div key={rating.id} className="space-y-2">
                    <Label className="text-base">{rating.label}</Label>
                    <StarRating
                      value={rating.value}
                      onChange={(v) => updateRating(rating.id, v)}
                    />
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={() => setStep(2)}
                    disabled={ratings.some((r) => r.value === 0)}
                    className="bg-gradient-ocean"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: NPS & Written Feedback */}
            {step === 2 && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-semibold text-center mb-2">
                    How likely are you to recommend us?
                  </h2>
                  <p className="text-center text-gray-500 text-sm mb-6">
                    0 = Not at all likely, 10 = Extremely likely
                  </p>
                  <NPSRating value={npsScore} onChange={setNpsScore} />
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="highlights">
                      What were the highlights of your retreat?
                    </Label>
                    <Textarea
                      id="highlights"
                      value={highlights}
                      onChange={(e) => setHighlights(e.target.value)}
                      placeholder="Tell us what you loved most..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="improvements">
                      How could we improve?
                    </Label>
                    <Textarea
                      id="improvements"
                      value={improvements}
                      onChange={(e) => setImprovements(e.target.value)}
                      placeholder="Your suggestions help us get better..."
                      rows={3}
                      className="mt-2"
                    />
                  </div>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={npsScore === null}
                    className="bg-gradient-ocean"
                  >
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Testimonial */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-center mb-2">
                    Share Your Story
                  </h2>
                  <p className="text-center text-gray-500 text-sm mb-6">
                    Would you like to share a testimonial that we can use on our
                    website?
                  </p>
                </div>

                <div>
                  <Textarea
                    value={testimonial}
                    onChange={(e) => setTestimonial(e.target.value)}
                    placeholder="Write a few words about your experience..."
                    rows={4}
                  />
                </div>

                <div className="flex items-start gap-2">
                  <Checkbox
                    id="allow"
                    checked={allowTestimonial}
                    onCheckedChange={(c) => setAllowTestimonial(c === true)}
                    className="mt-1"
                  />
                  <Label htmlFor="allow" className="text-sm">
                    I give permission to use my testimonial and first name on
                    the Rainbow Surf Retreats website and marketing materials.
                  </Label>
                </div>

                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={isSubmitting}
                    className="bg-gradient-ocean"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Feedback'
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeedbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary-teal)]" />
        </div>
      }
    >
      <FeedbackContent />
    </Suspense>
  )
}
