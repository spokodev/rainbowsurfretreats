'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface StatusOption {
  value: string
  label: string
}

interface AdminStatusFilterProps {
  value: string
  onChange: (value: string) => void
  options: StatusOption[]
  placeholder?: string
  allLabel?: string
  className?: string
}

export function AdminStatusFilter({
  value,
  onChange,
  options,
  placeholder = 'Filter by status',
  allLabel = 'All',
  className,
}: AdminStatusFilterProps) {
  return (
    <Select value={value || 'all'} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{allLabel}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
