'use client'

import { useCallback, useMemo } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'

export type SortOrder = 'asc' | 'desc'

export interface TableState {
  page: number
  pageSize: number
  search: string
  sortBy: string
  sortOrder: SortOrder
  filters: Record<string, string>
}

export interface TableStateHandlers {
  setPage: (page: number) => void
  setSearch: (search: string) => void
  setSort: (column: string) => void
  setFilter: (key: string, value: string | null) => void
  setFilters: (filters: Record<string, string | null>) => void
  resetFilters: () => void
  updateParams: (updates: Record<string, string | null>) => void
}

export interface UseAdminTableStateOptions {
  defaultPageSize?: number
  defaultSortBy?: string
  defaultSortOrder?: SortOrder
  filterKeys?: string[]
}

export interface UseAdminTableStateReturn extends TableState, TableStateHandlers {
  // Computed values
  hasActiveFilters: boolean
  queryString: string
}

export function useAdminTableState(
  options: UseAdminTableStateOptions = {}
): UseAdminTableStateReturn {
  const {
    defaultPageSize = 25,
    defaultSortBy = 'created_at',
    defaultSortOrder = 'desc',
    filterKeys = [],
  } = options

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  // Parse current state from URL
  const page = Number(searchParams.get('page')) || 1
  const pageSize = Number(searchParams.get('pageSize')) || defaultPageSize
  const search = searchParams.get('search') || ''
  const sortBy = searchParams.get('sort') || defaultSortBy
  const sortOrder = (searchParams.get('order') as SortOrder) || defaultSortOrder

  // Stabilize filterKeys to prevent infinite re-renders
  const stableFilterKeys = useMemo(() => filterKeys, [filterKeys.join(',')])

  // Parse filters from URL
  const filters = useMemo(() => {
    const result: Record<string, string> = {}
    stableFilterKeys.forEach((key) => {
      const value = searchParams.get(key)
      if (value && value !== 'all') {
        result[key] = value
      }
    })
    return result
  }, [searchParams, stableFilterKeys])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return search.length > 0 || Object.keys(filters).length > 0
  }, [search, filters])

  // Build query string for API calls
  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())
    if (search) params.set('search', search)
    if (sortBy !== defaultSortBy) params.set('sort', sortBy)
    if (sortOrder !== defaultSortOrder) params.set('order', sortOrder)
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    return params.toString()
  }, [page, pageSize, search, sortBy, sortOrder, filters, defaultSortBy, defaultSortOrder])

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())

      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '' || value === 'all') {
          params.delete(key)
        } else {
          params.set(key, value)
        }
      })

      const newSearch = params.toString()
      router.push(newSearch ? `${pathname}?${newSearch}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname]
  )

  // Individual setters
  const setPage = useCallback(
    (newPage: number) => {
      updateParams({ page: newPage === 1 ? null : newPage.toString() })
    },
    [updateParams]
  )

  const setSearch = useCallback(
    (newSearch: string) => {
      // Reset to page 1 when search changes
      updateParams({ search: newSearch || null, page: null })
    },
    [updateParams]
  )

  const setSort = useCallback(
    (column: string) => {
      // Toggle order if same column, otherwise set to desc
      const newOrder: SortOrder =
        sortBy === column && sortOrder === 'desc' ? 'asc' : 'desc'

      updateParams({
        sort: column === defaultSortBy && newOrder === defaultSortOrder ? null : column,
        order: newOrder === defaultSortOrder ? null : newOrder,
        page: null, // Reset to page 1
      })
    },
    [sortBy, sortOrder, defaultSortBy, defaultSortOrder, updateParams]
  )

  const setFilter = useCallback(
    (key: string, value: string | null) => {
      updateParams({ [key]: value, page: null }) // Reset to page 1
    },
    [updateParams]
  )

  const setFilters = useCallback(
    (newFilters: Record<string, string | null>) => {
      updateParams({ ...newFilters, page: null }) // Reset to page 1
    },
    [updateParams]
  )

  const resetFilters = useCallback(() => {
    const resets: Record<string, null> = { search: null, page: null }
    filterKeys.forEach((key) => {
      resets[key] = null
    })
    updateParams(resets)
  }, [filterKeys, updateParams])

  return {
    // State
    page,
    pageSize,
    search,
    sortBy,
    sortOrder,
    filters,
    // Computed
    hasActiveFilters,
    queryString,
    // Handlers
    setPage,
    setSearch,
    setSort,
    setFilter,
    setFilters,
    resetFilters,
    updateParams,
  }
}
