'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import type { Retreat } from '@/lib/types/database'

export default function AdminRetreatsPage() {
  const [retreats, setRetreats] = useState<Retreat[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)

  const fetchRetreats = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/retreats')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch retreats')
      }

      setRetreats(result.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load retreats')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRetreats()
  }, [fetchRetreats])

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/retreats/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete retreat')
      }

      toast.success('Retreat deleted successfully')
      setRetreats(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete retreat')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id)
    try {
      const response = await fetch(`/api/retreats/${id}/duplicate`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to duplicate retreat')
      }

      toast.success('Retreat duplicated successfully')
      // Refresh the list to show the new retreat
      fetchRetreats()
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate retreat')
    } finally {
      setIsDuplicating(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Retreats</h1>
          <p className="text-muted-foreground">
            Manage your surf retreat experiences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchRetreats} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/retreats/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New Retreat
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Retreats</CardTitle>
          <CardDescription>
            A list of all retreats including destination, dates, and pricing
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : retreats.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No retreats found</p>
              <Button asChild>
                <Link href="/admin/retreats/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create your first retreat
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Destination</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {retreats.map((retreat) => (
                  <TableRow key={retreat.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{retreat.destination}</span>
                      </div>
                    </TableCell>
                    <TableCell>{retreat.location}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(retreat.start_date)}</span>
                      </div>
                    </TableCell>
                    <TableCell>{retreat.duration}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          retreat.level === 'Beginners' ? 'secondary' : 'default'
                        }
                      >
                        {retreat.level}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">
                          {retreat.rooms && retreat.rooms.length > 0
                            ? `from €${Math.min(...retreat.rooms.map(r => r.price))}`
                            : 'No rooms'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={retreat.is_published ? 'default' : 'outline'}>
                        {retreat.is_published ? (
                          <>
                            <Eye className="mr-1 h-3 w-3" />
                            Published
                          </>
                        ) : (
                          <>
                            <EyeOff className="mr-1 h-3 w-3" />
                            Draft
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/retreats/${retreat.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(retreat.id)}
                          disabled={isDuplicating === retreat.id}
                          title="Duplicate retreat"
                        >
                          {isDuplicating === retreat.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              disabled={isDeleting === retreat.id}
                            >
                              {isDeleting === retreat.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Move to Trash?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will move &quot;{retreat.destination}&quot; to trash.
                                You can restore it within 30 days or delete it permanently from the Trash page.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(retreat.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Move to Trash
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
