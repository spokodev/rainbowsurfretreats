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
  ImageIcon,
  Link,
  ArrowLeft,
} from 'lucide-react'
import { toast } from 'sonner'
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
  const [isUploading, setIsUploading] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [showUrlInput, setShowUrlInput] = useState(false)

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
      formData.append('bucket', 'retreat-images')

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
      finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
    }

    // Handle Google Drive open links: https://drive.google.com/open?id=FILE_ID
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
    if (driveOpenMatch) {
      const fileId = driveOpenMatch[1]
      finalUrl = `https://drive.google.com/uc?export=view&id=${fileId}`
    }

    setNewImageUrl(finalUrl)
    setShowUrlInput(false)
    toast.success('URL added')
  }, [newImageUrl])

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
                      unoptimized={newImageUrl.includes('drive.google.com')}
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
                <Label htmlFor="imageCaption">Caption (optional)</Label>
                <Input
                  id="imageCaption"
                  placeholder="Enter image caption..."
                  value={newImageCaption}
                  onChange={(e) => setNewImageCaption(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setAddDialogOpen(false)
                    setNewImageUrl('')
                    setNewImageCaption('')
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
