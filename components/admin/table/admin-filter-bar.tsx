'use client'

import { X, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminFilterBarProps {
  children: React.ReactNode
  hasActiveFilters: boolean
  onReset: () => void
  className?: string
}

export function AdminFilterBar({
  children,
  hasActiveFilters,
  onReset,
  className,
}: AdminFilterBarProps) {
  return (
    <div className={`flex flex-wrap items-center gap-3 ${className || ''}`}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <SlidersHorizontal className="h-4 w-4" />
        <span>Filters:</span>
      </div>

      {children}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onReset}
          className="h-8 px-2 text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear all
        </Button>
      )}
    </div>
  )
}
