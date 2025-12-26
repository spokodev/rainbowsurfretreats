import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy - Rainbow Surf Retreats',
  description: 'Learn how Rainbow Surf Retreats collects, uses, and protects your personal information. Read our full privacy policy.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
      <p className="text-lg text-gray-600">
        Coming soon - Information about how we collect, use, and protect your personal data.
      </p>
    </div>
  )
}
