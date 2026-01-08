'use client'

import { useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'

interface QuizQuestion {
  id: string
  question: string
  options: { value: string; label: string }[]
}

const questions: QuizQuestion[] = [
  {
    id: 'experience',
    question: 'What\'s your surfing experience level?',
    options: [
      { value: 'beginner', label: 'Beginner - Never surfed before' },
      { value: 'intermediate', label: 'Intermediate - Can catch green waves' },
      { value: 'advanced', label: 'Advanced - Comfortable in various conditions' },
    ],
  },
  {
    id: 'interest',
    question: 'What interests you most about our retreats?',
    options: [
      { value: 'surfing', label: 'Learning to surf or improving skills' },
      { value: 'wellness', label: 'Yoga, meditation, and wellness' },
      { value: 'community', label: 'Meeting like-minded people' },
      { value: 'adventure', label: 'Exploring new destinations' },
    ],
  },
  {
    id: 'travel_style',
    question: 'What\'s your preferred travel style?',
    options: [
      { value: 'budget', label: 'Budget-friendly options' },
      { value: 'comfort', label: 'Comfortable mid-range' },
      { value: 'premium', label: 'Premium experiences' },
    ],
  },
  {
    id: 'destination',
    question: 'Which destinations interest you most?',
    options: [
      { value: 'morocco', label: 'Morocco - Consistent waves, culture' },
      { value: 'portugal', label: 'Portugal - Europe\'s surf capital' },
      { value: 'bali', label: 'Bali - Tropical paradise' },
      { value: 'sri_lanka', label: 'Sri Lanka - Emerging surf destination' },
      { value: 'all', label: 'All of them!' },
    ],
  },
]

function QuizContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const subscriberId = searchParams.get('subscriber')

  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  const handleAnswer = (value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questions[currentQuestion].id]: value,
    }))
  }

  const handleNext = async () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1)
    } else {
      // Submit answers
      setIsSubmitting(true)
      try {
        await fetch('/api/newsletter/quiz', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subscriberId,
            responses: answers,
          }),
        })
        setIsComplete(true)
      } catch (error) {
        console.error('Quiz submit error:', error)
      } finally {
        setIsSubmitting(false)
      }
    }
  }

  const currentQ = questions[currentQuestion]
  const hasAnswer = !!answers[currentQ?.id]

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold mb-4">Thank You!</h1>

          <p className="text-gray-600 mb-6">
            Your preferences have been saved. We&apos;ll use this to personalize
            your experience and send you relevant content.
          </p>

          <Button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-ocean text-[var(--earth-brown)]"
          >
            Explore Retreats
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-ochre flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8">
        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-500 mb-2">
            <span>Question {currentQuestion + 1} of {questions.length}</span>
            <span>{Math.round(((currentQuestion + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-ocean transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question */}
        <h2 className="text-xl font-semibold mb-6">{currentQ.question}</h2>

        <RadioGroup
          value={answers[currentQ.id] || ''}
          onValueChange={handleAnswer}
          className="space-y-3"
        >
          {currentQ.options.map(option => (
            <div
              key={option.value}
              className="flex items-center space-x-3 p-4 border rounded-lg hover:border-[var(--primary-teal)] cursor-pointer transition-colors"
            >
              <RadioGroupItem value={option.value} id={option.value} />
              <Label htmlFor={option.value} className="cursor-pointer flex-1">
                {option.label}
              </Label>
            </div>
          ))}
        </RadioGroup>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="outline"
            onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
            disabled={currentQuestion === 0}
          >
            Back
          </Button>

          <Button
            onClick={handleNext}
            disabled={!hasAnswer || isSubmitting}
            className="bg-gradient-ocean text-[var(--earth-brown)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : currentQuestion === questions.length - 1 ? (
              'Complete'
            ) : (
              'Next'
            )}
          </Button>
        </div>

        {/* Skip */}
        <p className="text-center text-sm text-gray-500 mt-4">
          <button
            onClick={() => router.push('/')}
            className="hover:text-gray-700 underline"
          >
            Skip quiz
          </button>
        </p>
      </div>
    </div>
  )
}

export default function NewsletterQuizPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-ochre flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    }>
      <QuizContent />
    </Suspense>
  )
}
