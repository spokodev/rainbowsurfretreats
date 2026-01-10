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
  Upload,
  X,
  Link,
  ArrowLeft,
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
  const [isUploading, setIsUploading] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size: 5MB')
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('bucket', 'page-images')

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      setNewImageUrl(result.data.url)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [])

  const handleFileDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(true)
  }, [])

  const handleFileDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
  }, [])

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileUpload(file)
    }
  }, [handleFileUpload])

  const handleUrlSubmit = useCallback(() => {
    const url = newImageUrl.trim()
    if (!url) {
      toast.error('Please enter a URL')
      return
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    // Convert Google Drive sharing links to direct image URLs
    let finalUrl = url

    // Handle Google Drive links: https://drive.google.com/file/d/FILE_ID/view
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    if (driveMatch) {
      const fileId = driveMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }

    // Handle Google Drive open links: https://drive.google.com/open?id=FILE_ID
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
    if (driveOpenMatch) {
      const fileId = driveOpenMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }

    setNewImageUrl(finalUrl)
    setShowUrlInput(false)
    toast.success('URL added')
  }, [newImageUrl])

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
                {/* Image source - file upload or URL */}
                {!newImageUrl ? (
                  showUrlInput ? (
                    // URL input mode
                    <div className="border-2 border-dashed rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowUrlInput(false)}
                        >
                          <ArrowLeft className="w-4 h-4 mr-1" />
                          Back
                        </Button>
                        <span className="text-sm text-gray-600">Paste image URL</span>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          type="url"
                          placeholder="https://drive.google.com/file/d/... or any image URL"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleUrlSubmit()
                            }
                          }}
                          className="flex-1"
                        />
                        <Button type="button" onClick={handleUrlSubmit}>
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports direct image URLs and Google Drive sharing links
                      </p>
                    </div>
                  ) : (
                    // File upload mode
                    <div className="space-y-3">
                      <div
                        className={`
                          relative border-2 border-dashed rounded-lg p-6
                          ${isDraggingFile ? 'border-primary bg-primary/5' : 'border-gray-300'}
                          ${isUploading ? 'pointer-events-none opacity-50' : ''}
                        `}
                        onDragOver={handleFileDragOver}
                        onDragLeave={handleFileDragLeave}
                        onDrop={handleFileDrop}
                      >
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          onChange={handleFileSelect}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          disabled={isUploading}
                        />
                        <div className="flex flex-col items-center justify-center text-center">
                          {isUploading ? (
                            <>
                              <Loader2 className="w-10 h-10 text-primary animate-spin mb-3" />
                              <p className="text-sm text-gray-600">Uploading...</p>
                            </>
                          ) : (
                            <>
                              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                                {isDraggingFile ? (
                                  <Upload className="w-6 h-6 text-primary" />
                                ) : (
                                  <ImageIcon className="w-6 h-6 text-gray-400" />
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                <span className="font-medium text-primary">Click to upload</span>
                                {' '}or drag and drop
                              </p>
                              <p className="text-xs text-gray-500">
                                PNG, JPG, WebP or GIF (max 5MB)
                              </p>
                            </>
                          )}
                        </div>
                      </div>

                      {/* URL option */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 border-t border-gray-200" />
                        <span className="text-xs text-gray-400">or</span>
                        <div className="flex-1 border-t border-gray-200" />
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        className="w-full"
                        onClick={() => setShowUrlInput(true)}
                      >
                        <Link className="w-4 h-4 mr-2" />
                        Paste image URL (Google Drive, etc.)
                      </Button>
                    </div>
                  )
                ) : (
                  // Image preview
                  <div className="relative">
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
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-8 w-8"
                      onClick={() => setNewImageUrl('')}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="sliderImageAlt">Alt Text</Label>
                  <Input
                    id="sliderImageAlt"
                    placeholder="Describe the image for accessibility"
                    value={newImageAlt}
                    onChange={(e) => setNewImageAlt(e.target.value)}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setAddDialogOpen(false)
                      setNewImageUrl('')
                      setNewImageAlt('')
                      setShowUrlInput(false)
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
