'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import RetreatForm from '@/components/admin/retreat-form'

export default function NewRetreatPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/admin/retreats">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create New Retreat</h1>
          <p className="text-muted-foreground">
            Add a new surf retreat experience
          </p>
        </div>
      </div>

      <RetreatForm />
    </div>
  )
}
