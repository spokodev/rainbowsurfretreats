'use client'

import { LayoutGrid, Columns3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { RoomViewMode } from '@/hooks/use-room-view-preference'

interface ViewToggleProps {
  view: RoomViewMode
  onViewChange: (view: RoomViewMode) => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          {view === 'interactive' ? (
            <>
              <Columns3 className="w-4 h-4" />
              Interactive
            </>
          ) : (
            <>
              <LayoutGrid className="w-4 h-4" />
              Classic
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => onViewChange('interactive')}
          className={view === 'interactive' ? 'bg-accent' : ''}
        >
          <Columns3 className="w-4 h-4 mr-2" />
          Interactive View
          <span className="ml-2 text-xs text-muted-foreground">Drag & Drop</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => onViewChange('classic')}
          className={view === 'classic' ? 'bg-accent' : ''}
        >
          <LayoutGrid className="w-4 h-4 mr-2" />
          Classic View
          <span className="ml-2 text-xs text-muted-foreground">Card Grid</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
