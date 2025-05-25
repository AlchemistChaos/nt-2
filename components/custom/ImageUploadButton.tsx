'use client'

import { useRef } from 'react'
import { Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { convertImageToBase64 } from '@/lib/utils'

interface ImageUploadButtonProps {
  onImageSelect: (base64Image: string) => void
  disabled?: boolean
}

export function ImageUploadButton({ onImageSelect, disabled }: ImageUploadButtonProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size must be less than 10MB')
      return
    }

    try {
      const base64 = await convertImageToBase64(file)
      onImageSelect(base64)
    } catch (error) {
      console.error('Error converting image:', error)
      alert('Error processing image')
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        disabled={disabled}
        onClick={() => fileInputRef.current?.click()}
        className="h-10 w-10 rounded-full"
      >
        <Camera className="h-5 w-5" />
        <span className="sr-only">Upload image</span>
      </Button>
    </>
  )
} 