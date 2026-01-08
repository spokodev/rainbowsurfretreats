'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  Upload,
  X,
  ImageIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface GalleryImage {
  id: string
  image_url: string
  caption: string | null
  sort_order: number
}

interface GalleryManagerProps {
  retreatId: string
}

export default function GalleryManager({ retreatId }: GalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<GalleryImage | null>(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageCaption, setNewImageCaption] = useState('')
  const [draggedItem, setDraggedItem] = useState<number | null>(null)

  const fetchGallery = useCallback(async () => {
    try {
      const response = await fetch(`/api/retreats/${retreatId}/gallery`)
      const data = await response.json()
      if (data.data) {
        setImages(data.data)
      }
    } catch (error) {
      console.error('Error fetching gallery:', error)
    } finally {
      setLoading(false)
    }
  }, [retreatId])

  useEffect(() => {
    fetchGallery()
  }, [fetchGallery])

  const handleAddImage = async () => {
    if (!newImageUrl.trim()) return

    setSaving(true)
    try {
      const response = await fetch(`/api/retreats/${retreatId}/gallery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: newImageUrl.trim(),
          caption: newImageCaption.trim() || null,
          sort_order: images.length,
        }),
      })

      if (response.ok) {
        await fetchGallery()
        setNewImageUrl('')
        setNewImageCaption('')
        setAddDialogOpen(false)
      }
    } catch (error) {
      console.error('Error adding image:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteImage = async () => {
    if (!imageToDelete) return

    setSaving(true)
    try {
      const response = await fetch(
        `/api/retreats/${retreatId}/gallery?imageId=${imageToDelete.id}`,
        { method: 'DELETE' }
      )

      if (response.ok) {
        setImages(images.filter(img => img.id !== imageToDelete.id))
      }
    } catch (error) {
      console.error('Error deleting image:', error)
    } finally {
      setSaving(false)
      setDeleteDialogOpen(false)
      setImageToDelete(null)
    }
  }

  const handleDragStart = (index: number) => {
    setDraggedItem(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newImages = [...images]
    const [draggedImage] = newImages.splice(draggedItem, 1)
    newImages.splice(index, 0, draggedImage)

    setImages(newImages)
    setDraggedItem(index)
  }

  const handleDragEnd = async () => {
    setDraggedItem(null)

    // Save new order to database
    const updatedImages = images.map((img, index) => ({
      id: img.id,
      sort_order: index,
    }))

    try {
      await fetch(`/api/retreats/${retreatId}/gallery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: updatedImages }),
      })
    } catch (error) {
      console.error('Error updating order:', error)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="w-5 h-5" />
            Photo Gallery
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Photo Gallery ({images.length})
        </CardTitle>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Image
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Gallery Image</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="imageUrl">Image URL</Label>
                <Input
                  id="imageUrl"
                  placeholder="https://example.com/image.jpg"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Use a direct link to the image (Google Drive links work too)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="imageCaption">Caption (optional)</Label>
                <Input
                  id="imageCaption"
                  placeholder="Enter image caption..."
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                />
              </div>
              {newImageUrl && (
                <div className="relative aspect-video rounded-lg overflow-hidden border">
                  <Image
                    src={newImageUrl}
                    alt="Preview"
                    fill
                    className="object-cover"
                    unoptimized={newImageUrl.includes('drive.google.com')}
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setAddDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleAddImage}
                  disabled={!newImageUrl.trim() || saving}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  Add Image
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No gallery images yet</p>
            <p className="text-sm">Add images to show in the retreat gallery</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((image, index) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`relative aspect-square rounded-lg overflow-hidden border group cursor-move ${
                  draggedItem === index ? 'opacity-50 ring-2 ring-primary' : ''
                }`}
              >
                <Image
                  src={image.image_url}
                  alt={image.caption || `Gallery image ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 50vw, 25vw"
                  unoptimized={image.image_url.includes('drive.google.com')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <GripVertical className="w-5 h-5 text-white" />
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                    onClick={() => {
                      setImageToDelete(image)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                {image.caption && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs truncate">
                    {image.caption}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground mt-4">
          Drag images to reorder. Changes are saved automatically.
        </p>
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Image</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this image from the gallery? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
