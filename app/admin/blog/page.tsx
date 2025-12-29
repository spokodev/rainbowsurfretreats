'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Calendar,
  User,
  FileText,
  Globe,
  EyeOff,
  Loader2,
  RefreshCw,
  Clock,
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
import type { BlogPost, BlogStatus } from '@/lib/types/database'

const getStatusBadgeVariant = (status: BlogStatus): 'default' | 'secondary' | 'outline' => {
  switch (status) {
    case 'published':
      return 'default'
    case 'draft':
      return 'secondary'
    case 'scheduled':
      return 'outline'
    default:
      return 'outline'
  }
}

const getStatusIcon = (status: BlogStatus) => {
  switch (status) {
    case 'published':
      return <Globe className="mr-1 h-3 w-3" />
    case 'draft':
      return <EyeOff className="mr-1 h-3 w-3" />
    case 'scheduled':
      return <Clock className="mr-1 h-3 w-3" />
    case 'archived':
      return <FileText className="mr-1 h-3 w-3" />
    default:
      return null
  }
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null)

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/blog/posts')
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch posts')
      }

      setPosts(result.data || [])
    } catch (error) {
      console.error('Fetch error:', error)
      toast.error('Failed to load posts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      const response = await fetch(`/api/blog/posts/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to delete post')
      }

      toast.success('Post deleted successfully')
      setPosts(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to delete post')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    setIsDuplicating(id)
    try {
      const response = await fetch(`/api/blog/posts/${id}/duplicate`, {
        method: 'POST',
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to duplicate post')
      }

      toast.success('Post duplicated successfully')
      // Refresh the list to show the new post
      fetchPosts()
    } catch (error) {
      console.error('Duplicate error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate post')
    } finally {
      setIsDuplicating(null)
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  const publishedCount = posts.filter(p => p.status === 'published').length
  const draftCount = posts.filter(p => p.status === 'draft').length
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length
  const totalViews = posts.reduce((sum, p) => sum + p.views, 0)

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Blog</h1>
          <p className="text-muted-foreground">
            Manage blog posts and content
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchPosts} disabled={isLoading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/admin/blog/new">
              <Plus className="mr-2 h-4 w-4" />
              New Post
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-green-600" />
              <div className="text-2xl font-bold">{publishedCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Published</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-600" />
              <div className="text-2xl font-bold">{draftCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Drafts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              <div className="text-2xl font-bold">{scheduledCount}</div>
            </div>
            <p className="text-xs text-muted-foreground">Scheduled</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-600" />
              <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
            </div>
            <p className="text-xs text-muted-foreground">Total Views</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Posts</CardTitle>
          <CardDescription>
            Manage your blog content and articles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">No posts found</p>
              <Button asChild>
                <Link href="/admin/blog/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Write your first post
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Author</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Views</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {posts.map((post) => (
                  <TableRow key={post.id}>
                    <TableCell>
                      <div className="max-w-[300px]">
                        <div className="font-medium truncate">{post.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          /{post.slug}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{post.author_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {post.category ? (
                        <span
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
                          style={{ backgroundColor: post.category.color + '20', color: post.category.color }}
                        >
                          {post.category.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(post.status)}>
                        {getStatusIcon(post.status)}
                        {post.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {post.published_at ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{formatDate(post.published_at)}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-muted-foreground" />
                        <span>{post.views.toLocaleString()}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/blog/${post.slug}`} target="_blank">
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/admin/blog/${post.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDuplicate(post.id)}
                          disabled={isDuplicating === post.id}
                          title="Duplicate post"
                        >
                          {isDuplicating === post.id ? (
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
                              disabled={isDeleting === post.id}
                            >
                              {isDeleting === post.id ? (
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
                                This will move &quot;{post.title}&quot; to trash.
                                You can restore it within 30 days or delete it permanently from the Trash page.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(post.id)}
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
