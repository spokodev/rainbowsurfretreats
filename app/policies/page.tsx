import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Policies - Rainbow Surf Retreats',
  description: 'Read our booking policies, cancellation terms, and other important information for Rainbow Surf Retreats.',
}

export default function PoliciesPage() {
  return (
    <div className="container mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold mb-8">Policies</h1>
      <p className="text-lg text-gray-600">
        Coming soon - Our booking policies, cancellation terms, and other important information.
      </p>
    </div>
  )
}
