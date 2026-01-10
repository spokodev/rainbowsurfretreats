'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import {
  Plus,
  Trash2,
  GripVertical,
  Loader2,
  ImageIcon,
  RotateCcw,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { toast } from 'sonner'
import type { SliderImage } from '@/lib/validations/page-images'

interface HomeSliderManagerProps {
  images: SliderImage[]
  defaultImages: SliderImage[]
  onUpdate: (images: SliderImage[]) => void
  minImages?: number
  maxImages?: number
  isLoading?: boolean
}

export function HomeSliderManager({
  images,
  defaultImages,
  onUpdate,
  minImages = 1,
  maxImages = 10,
  isLoading = false,
}: HomeSliderManagerProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [imageToDelete, setImageToDelete] = useState<number | null>(null)
  const [newImageUrl, setNewImageUrl] = useState('')
  const [newImageAlt, setNewImageAlt] = useState('')
  const [draggedItem, setDraggedItem] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  const handleAddImage = useCallback(() => {
    if (!newImageUrl.trim()) {
      toast.error('Please enter an image URL')
      return
    }

    try {
      new URL(newImageUrl.trim())
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    if (images.length >= maxImages) {
      toast.error(`Maximum ${maxImages} slides allowed`)
      return
    }

    // Convert Google Drive sharing links
    let finalUrl = newImageUrl.trim()
    const driveMatch = finalUrl.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    if (driveMatch) {
      const fileId = driveMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }
    const driveOpenMatch = finalUrl.match(/drive\.google\.com\/open\?id=([^&]+)/)
    if (driveOpenMatch) {
      const fileId = driveOpenMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }

    const newImage: SliderImage = {
      url: finalUrl,
      alt: newImageAlt.trim() || `Slide ${images.length + 1}`,
      sort_order: images.length,
    }

    onUpdate([...images, newImage])
    setNewImageUrl('')
    setNewImageAlt('')
    setAddDialogOpen(false)
    toast.success('Slide added')
  }, [newImageUrl, newImageAlt, images, maxImages, onUpdate])

  const handleDeleteImage = useCallback(() => {
    if (imageToDelete === null) return

    if (images.length <= minImages) {
      toast.error(`Minimum ${minImages} slide(s) required`)
      setDeleteDialogOpen(false)
      setImageToDelete(null)
      return
    }

    const newImages = images
      .filter((_, index) => index !== imageToDelete)
      .map((img, index) => ({ ...img, sort_order: index }))

    onUpdate(newImages)
    setDeleteDialogOpen(false)
    setImageToDelete(null)
    toast.success('Slide removed')
  }, [imageToDelete, images, minImages, onUpdate])

  const handleDragStart = useCallback((index: number) => {
    setDraggedItem(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedItem === null || draggedItem === index) return

    const newImages = [...images]
    const [draggedImage] = newImages.splice(draggedItem, 1)
    newImages.splice(index, 0, draggedImage)

    // Update sort_order
    const reorderedImages = newImages.map((img, i) => ({ ...img, sort_order: i }))

    onUpdate(reorderedImages)
    setDraggedItem(index)
  }, [draggedItem, images, onUpdate])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
  }, [])

  const handleResetToDefault = useCallback(() => {
    onUpdate(defaultImages)
    toast.success('Reset to default slides')
  }, [defaultImages, onUpdate])

  const handleAltChange = useCallback((index: number, newAlt: string) => {
    const newImages = images.map((img, i) =>
      i === index ? { ...img, alt: newAlt } : img
    )
    onUpdate(newImages)
  }, [images, onUpdate])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {images.length} / {maxImages} slides (minimum {minImages})
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToDefault}
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            Reset to Default
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={images.length >= maxImages}>
                <Plus className="w-4 h-4 mr-1" />
                Add Slide
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Slider Image</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="sliderImageUrl">Image URL</Label>
                  <Input
                    id="sliderImageUrl"
                    placeholder="https://drive.google.com/file/d/... or any image URL"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use a direct link to the image (Google Drive links work too)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sliderImageAlt">Alt Text</Label>
                  <Input
                    id="sliderImageAlt"
                    placeholder="Describe the image for accessibility"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                  />
                </div>
                {newImageUrl && (
                  <div className="relative aspect-video rounded-lg overflow-hidden border">
                    <Image
                      src={newImageUrl}
                      alt="Preview"
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddDialogOpen(false)
                      setNewImageUrl('')
                      setNewImageAlt('')
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddImage}
                    disabled={!newImageUrl.trim() || saving}
                  >
                    {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                    Add Slide
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Images Grid */}
      {images.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
          <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No slider images</p>
          <p className="text-sm">Add at least {minImages} slide(s)</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <div
              key={`${image.url}-${index}`}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`relative rounded-lg overflow-hidden border group cursor-move ${
                draggedItem === index ? 'opacity-50 ring-2 ring-primary' : ''
              }`}
            >
              <div className="relative aspect-video">
                <Image
                  src={image.url}
                  alt={image.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  unoptimized={image.url.includes('googleusercontent.com') || image.url.includes('drive.google.com')}
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                  <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="flex items-center gap-1 bg-white/90 rounded px-2 py-1">
                      <GripVertical className="w-4 h-4 text-gray-600" />
                      <span className="text-xs text-gray-600">Drag to reorder</span>
                    </div>
                  </div>
                  <div className="absolute top-2 right-2">
                    <div className="bg-black/60 text-white text-xs px-2 py-1 rounded">
                      #{index + 1}
                    </div>
                  </div>
                  {images.length > minImages && (
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation()
                        setImageToDelete(index)
                        setDeleteDialogOpen(true)
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-3 bg-white">
                <Label htmlFor={`alt-${index}`} className="text-xs text-muted-foreground">
                  Alt Text
                </Label>
                <Input
                  id={`alt-${index}`}
                  type="text"
                  value={image.alt}
                  onChange={(e) => handleAltChange(index, e.target.value)}
                  placeholder="Describe the image"
                  className="mt-1 text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Drag slides to reorder. The first slide will be shown initially.
      </p>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Slide</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this slide from the hero section?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImage}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default HomeSliderManager
