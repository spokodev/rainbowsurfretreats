'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Clock,
  Palmtree,
  FileText,
  Loader2,
  RefreshCw,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { TrashItem } from '@/lib/types/database'

export default function AdminTrashPage() {
  const [items, setItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [processingId, setProcessingId] = useState<string | null>(null)

  const fetchTrash = useCallback(async () => {
    try {
      setIsLoading(true)
      const url = filter === 'all'
        ? '/api/admin/trash'
        : `/api/admin/trash?type=${filter}`

      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch trash')
      }

      setItems(result.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load trash items')
    } finally {
      setIsLoading(false)
    }
  }, [filter])

  useEffect(() => {
    fetchTrash()
  }, [fetchTrash])

  const handleRestore = async (item: TrashItem) => {
    setProcessingId(item.id)
    try {
      const response = await fetch(`/api/admin/trash/${item.id}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_type: item.item_type }),
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to restore item')
      }

      toast.success(`${item.item_type === 'retreat' ? 'Retreat' : 'Post'} restored successfully`)
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (error) {
      console.error('Restore error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to restore item')
    } finally {
      setProcessingId(null)
    }
  }

  const handlePermanentDelete = async (item: TrashItem) => {
    setProcessingId(item.id)
    try {
      const response = await fetch(
        `/api/admin/trash/${item.id}/permanent?type=${item.item_type}`,
        { method: 'DELETE' }
      )

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete item')
      }

      toast.success('Item permanently deleted')
      setItems(prev => prev.filter(i => i.id !== item.id))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete item')
    } finally {
      setProcessingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getDaysRemainingBadge = (days: number) => {
    if (days <= 3) {
      return <Badge variant="destructive">{days} days left</Badge>
    }
    if (days <= 7) {
      return <Badge variant="outline" className="text-orange-600 border-orange-600">{days} days left</Badge>
    }
    return <Badge variant="secondary">{days} days left</Badge>
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Trash</h1>
          <p className="text-muted-foreground">
            Items are automatically deleted after 30 days
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items</SelectItem>
              <SelectItem value="retreat">Retreats Only</SelectItem>
              <SelectItem value="blog_post">Blog Posts Only</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchTrash} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Warning Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
        <div>
          <h3 className="font-medium text-amber-800">Auto-deletion enabled</h3>
          <p className="text-sm text-amber-700">
            Items in trash will be permanently deleted after 30 days.
            Restore items before the deadline to keep them.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Deleted Items ({items.length})</CardTitle>
          <CardDescription>
            Retreats and blog posts that have been moved to trash
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <Trash2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Trash is empty</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Deleted</TableHead>
                  <TableHead>Time Remaining</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.item_type}-${item.id}`}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {item.item_type === 'retreat' ? (
                          <Palmtree className="h-4 w-4 text-green-600" />
                        ) : (
                          <FileText className="h-4 w-4 text-blue-600" />
                        )}
                        <span className="capitalize">
                          {item.item_type === 'blog_post' ? 'Blog Post' : 'Retreat'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <div className="font-medium truncate">{item.title}</div>
                        {item.slug && (
                          <div className="text-xs text-muted-foreground">/{item.slug}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{formatDate(item.deleted_at)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getDaysRemainingBadge(item.days_remaining)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRestore(item)}
                          disabled={processingId === item.id}
                        >
                          {processingId === item.id ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <RotateCcw className="mr-2 h-4 w-4" />
                          )}
                          Restore
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={processingId === item.id}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Forever
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Permanently Delete?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete &quot;{item.title}&quot;.
                                This action CANNOT be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handlePermanentDelete(item)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Delete Forever
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
