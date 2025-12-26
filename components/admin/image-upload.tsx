'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { Upload, X, Loader2, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface ImageUploadProps {
  value?: string
  onChange: (url: string | null) => void
  bucket?: 'retreat-images' | 'blog-images'
  className?: string
}

export function ImageUpload({
  value,
  onChange,
  bucket = 'retreat-images',
  className = '',
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  const handleUpload = useCallback(async (file: File) => {
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
      formData.append('bucket', bucket)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed')
      }

      onChange(result.data.url)
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }, [bucket, onChange])

  const handleDelete = useCallback(async () => {
    if (!value) return

    // Extract path from URL
    const url = new URL(value)
    const path = url.pathname.split('/').slice(-1)[0]

    try {
      const response = await fetch(`/api/upload?path=${path}&bucket=${bucket}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Delete failed')
      }

      onChange(null)
      toast.success('Image deleted')
    } catch (error) {
      console.error('Delete error:', error)
      // Still remove from form even if delete fails
      onChange(null)
      toast.error('Failed to delete from storage, but removed from form')
    }
  }, [bucket, onChange, value])

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

  if (value) {
    return (
      <div className={`relative group ${className}`}>
        <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={value}
            alt="Uploaded image"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              <X className="w-4 h-4 mr-1" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8
        ${isDragging ? 'border-[var(--primary-teal)] bg-[var(--primary-teal)]/5' : 'border-gray-300'}
        ${isUploading ? 'pointer-events-none opacity-50' : ''}
        ${className}
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
            <Loader2 className="w-10 h-10 text-[var(--primary-teal)] animate-spin mb-4" />
            <p className="text-sm text-gray-600">Uploading...</p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              {isDragging ? (
                <Upload className="w-8 h-8 text-[var(--primary-teal)]" />
              ) : (
                <ImageIcon className="w-8 h-8 text-gray-400" />
              )}
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <span className="font-medium text-[var(--primary-teal)]">Click to upload</span>
              {' '}or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP or GIF (max 5MB)
            </p>
          </>
        )}
      </div>
    </div>
  )
}

export default ImageUpload
