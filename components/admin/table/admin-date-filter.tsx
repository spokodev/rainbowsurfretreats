'use client'

import { CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

interface AdminDateFilterProps {
  value: string | null
  onChange: (value: string | null) => void
  placeholder?: string
  className?: string
}

export function AdminDateFilter({
  value,
  onChange,
  placeholder = 'Pick a date',
  className,
}: AdminDateFilterProps) {
  const date = value ? new Date(value) : undefined

  const handleSelect = (newDate: Date | undefined) => {
    if (newDate) {
      // Format as YYYY-MM-DD for URL/API
      onChange(format(newDate, 'yyyy-MM-dd'))
    } else {
      onChange(null)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            'justify-start text-left font-normal',
            !date && 'text-muted-foreground',
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, 'MMM d, yyyy') : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}

interface AdminDateRangeFilterProps {
  fromValue: string | null
  toValue: string | null
  onFromChange: (value: string | null) => void
  onToChange: (value: string | null) => void
  fromPlaceholder?: string
  toPlaceholder?: string
  className?: string
}

export function AdminDateRangeFilter({
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  fromPlaceholder = 'From',
  toPlaceholder = 'To',
  className,
}: AdminDateRangeFilterProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <AdminDateFilter
        value={fromValue}
        onChange={onFromChange}
        placeholder={fromPlaceholder}
      />
      <span className="text-muted-foreground">-</span>
      <AdminDateFilter
        value={toValue}
        onChange={onToChange}
        placeholder={toPlaceholder}
      />
    </div>
  )
}
