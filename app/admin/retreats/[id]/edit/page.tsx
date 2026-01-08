'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RetreatForm from '@/components/admin/retreat-form'
import GalleryManager from '@/components/admin/gallery-manager'
import type { Retreat, RetreatRoom } from '@/lib/types/database'

export default function EditRetreatPage() {
  const params = useParams()
  const [retreat, setRetreat] = useState<(Retreat & { rooms?: RetreatRoom[] }) | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRetreat() {
      try {
        const response = await fetch(`/api/retreats/${params.id}`)
        const result = await response.json()

        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch retreat')
        }

        setRetreat(result.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (params.id) {
      fetchRetreat()
    }
  }, [params.id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error || !retreat) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/admin/retreats">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Retreat</h1>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-800">{error || 'Retreat not found'}</p>
          <Button asChild variant="link" className="mt-2 p-0 text-red-800">
            <Link href="/admin/retreats">Return to retreats list</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/retreats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Retreat</h1>
          <p className="text-muted-foreground">
            {retreat.destination}
          </p>
        </div>
      </div>

      <RetreatForm retreat={retreat} isEdit />

      {/* Gallery Manager */}
      <div className="mt-8">
        <GalleryManager retreatId={retreat.id} />
      </div>
    </div>
  )
}
