'use client'

import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { TableHead } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import type { SortOrder } from '@/hooks/use-admin-table-state'

interface AdminSortHeaderProps {
  column: string
  label: string
  currentSort: string
  currentOrder: SortOrder
  onSort: (column: string) => void
  className?: string
}

export function AdminSortHeader({
  column,
  label,
  currentSort,
  currentOrder,
  onSort,
  className,
}: AdminSortHeaderProps) {
  const isActive = currentSort === column

  return (
    <TableHead
      className={cn(
        'cursor-pointer select-none transition-colors hover:bg-muted/50',
        className
      )}
      onClick={() => onSort(column)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive ? (
          currentOrder === 'asc' ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )
        ) : (
          <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50" />
        )}
      </div>
    </TableHead>
  )
}
