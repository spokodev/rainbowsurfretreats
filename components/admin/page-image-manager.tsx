'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon, Link, ArrowLeft, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import type { SingleImage } from '@/lib/validations/page-images'

interface PageImageManagerProps {
  pageKey: string
  pageName: string
  currentImage: SingleImage | null
  defaultImage: SingleImage
  onUpdate: (image: SingleImage | null) => void
  isLoading?: boolean
}

export function PageImageManager({
  pageName,
  currentImage,
  defaultImage,
  onUpdate,
  isLoading = false,
}: PageImageManagerProps) {
  const [showUrlInput, setShowUrlInput] = useState(false)
  const [urlInputValue, setUrlInputValue] = useState('')
  const [altInputValue, setAltInputValue] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const isUsingDefault = !currentImage || currentImage.url === defaultImage.url

  const handleUpload = useCallback(async (file: File) => {
    if (!file) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid file type. Allowed: JPEG, PNG, WebP, GIF')
      return
    }

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

      onUpdate({ url: result.data.url, alt: currentImage?.alt || defaultImage.alt })
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [currentImage?.alt, defaultImage.alt, onUpdate])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }, [handleUpload])

  const handleUrlSubmit = useCallback(() => {
    const url = urlInputValue.trim()
    if (!url) {
      toast.error('Please enter a URL')
      return
    }

    try {
      new URL(url)
    } catch {
      toast.error('Please enter a valid URL')
      return
    }

    // Convert Google Drive sharing links
    let finalUrl = url
    const driveMatch = url.match(/drive\.google\.com\/file\/d\/([^/]+)/)
    if (driveMatch) {
      const fileId = driveMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }
    const driveOpenMatch = url.match(/drive\.google\.com\/open\?id=([^&]+)/)
    if (driveOpenMatch) {
      const fileId = driveOpenMatch[1]
      finalUrl = `https://lh3.googleusercontent.com/d/${fileId}`
    }

    onUpdate({ url: finalUrl, alt: altInputValue.trim() || defaultImage.alt })
    setUrlInputValue('')
    setAltInputValue('')
    setShowUrlInput(false)
    toast.success('Image URL added')
  }, [urlInputValue, altInputValue, defaultImage.alt, onUpdate])

  const handleResetToDefault = useCallback(() => {
    onUpdate(null)
    toast.success('Reset to default image')
  }, [onUpdate])

  const handleAltChange = useCallback((newAlt: string) => {
    if (currentImage) {
      onUpdate({ ...currentImage, alt: newAlt })
    }
  }, [currentImage, onUpdate])

  const displayImage = currentImage || defaultImage

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Current Image Preview */}
      <div className="relative group">
        <div className="relative aspect-[21/9] rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={displayImage.url}
            alt={displayImage.alt}
            fill
            className="object-cover"
            unoptimized={displayImage.url.includes('googleusercontent.com') || displayImage.url.includes('drive.google.com')}
          />
          {isUsingDefault && (
            <div className="absolute top-2 left-2 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
              Using Default
            </div>
          )}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setShowUrlInput(true)}
            >
              <Link className="w-4 h-4 mr-1" />
              Change URL
            </Button>
            {!isUsingDefault && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleResetToDefault}
              >
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset to Default
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* URL Input Mode */}
      {showUrlInput && (
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInputValue('')
                setAltInputValue('')
              }}
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <span className="text-sm text-gray-600">Enter new image URL</span>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={`url-${pageName}`}>Image URL</Label>
              <Input
                id={`url-${pageName}`}
                type="url"
                placeholder="https://drive.google.com/file/d/... or any image URL"
                value={urlInputValue}
                onChange={(e) => setUrlInputValue(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor={`alt-${pageName}`}>Alt Text</Label>
              <Input
                id={`alt-${pageName}`}
                type="text"
                placeholder={defaultImage.alt}
                value={altInputValue}
                onChange={(e) => setAltInputValue(e.target.value)}
              />
            </div>

            {urlInputValue && (
              <div className="relative aspect-[21/9] rounded-lg overflow-hidden border">
                <Image
                  src={urlInputValue}
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
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowUrlInput(false)
                setUrlInputValue('')
                setAltInputValue('')
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUrlSubmit} disabled={!urlInputValue.trim()}>
              Save
            </Button>
          </div>
        </div>
      )}

      {/* File Upload Area (only when not in URL mode) */}
      {!showUrlInput && (
        <>
          <div
            className={`
              relative border-2 border-dashed rounded-lg p-6
              ${isDragging ? 'border-[var(--primary-teal)] bg-[var(--primary-teal)]/5' : 'border-gray-300'}
              ${isUploading ? 'pointer-events-none opacity-50' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
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
                  <Loader2 className="w-8 h-8 text-[var(--primary-teal)] animate-spin mb-2" />
                  <p className="text-sm text-gray-600">Uploading...</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-2">
                    {isDragging ? (
                      <Upload className="w-6 h-6 text-[var(--primary-teal)]" />
                    ) : (
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">
                    <span className="font-medium text-[var(--primary-teal)]">Click to upload</span>
                    {' '}or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">PNG, JPG, WebP or GIF (max 5MB)</p>
                </>
              )}
            </div>
          </div>

          {/* Alt Text Edit (when image is set) */}
          {currentImage && (
            <div className="space-y-2">
              <Label htmlFor={`current-alt-${pageName}`}>Alt Text</Label>
              <Input
                id={`current-alt-${pageName}`}
                type="text"
                value={currentImage.alt}
                onChange={(e) => handleAltChange(e.target.value)}
                placeholder="Describe the image for accessibility"
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default PageImageManager
