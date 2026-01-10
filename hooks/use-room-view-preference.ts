'use client'

import { useState, useEffect, useCallback } from 'react'

export type RoomViewMode = 'classic' | 'interactive'

const STORAGE_KEY = 'room-management-view'
const DEFAULT_VIEW: RoomViewMode = 'interactive'

export function useRoomViewPreference() {
  const [view, setViewState] = useState<RoomViewMode>(DEFAULT_VIEW)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'classic' || stored === 'interactive') {
      setViewState(stored)
    }
    setIsLoaded(true)
  }, [])

  // Save to localStorage when view changes
  const setView = useCallback((newView: RoomViewMode) => {
    setViewState(newView)
    localStorage.setItem(STORAGE_KEY, newView)
  }, [])

  const toggleView = useCallback(() => {
    setView(view === 'classic' ? 'interactive' : 'classic')
  }, [view, setView])

  return {
    view,
    setView,
    toggleView,
    isInteractive: view === 'interactive',
    isClassic: view === 'classic',
    isLoaded,
  }
}
