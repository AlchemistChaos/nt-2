'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react'
import { useBrands } from '@/lib/supabase/client-cache'
import { Brand, ImportMenuRequest, ImportMenuResponse } from '@/types'

interface ImportBrandMenuModalProps {
  isOpen: boolean
  onClose: () => void
  onAnalysisComplete: (result: ImportMenuResponse, importSource: 'csv' | 'image') => void
}

export function ImportBrandMenuModal({ 
  isOpen, 
  onClose, 
  onAnalysisComplete
}: ImportBrandMenuModalProps) {
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null)
  const [newBrandName, setNewBrandName] = useState('')
  const [newBrandType, setNewBrandType] = useState('restaurant')
  const [instructions, setInstructions] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const { data: brands = [] } = useBrands()

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    const isImage = file.type.startsWith('image/')
    const isCSV = file.type === 'text/csv' || file.name.toLowerCase().endsWith('.csv')
    
    if (!isImage && !isCSV) {
      setError('Please upload an image file or CSV file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)
    setError(null)
  }

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = reader.result as string
        // Remove data URL prefix if present
        const base64 = result.includes(',') ? result.split(',')[1] : result
        resolve(base64)
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleImport = async () => {
    if (!selectedFile) {
      setError('Please select a file to import')
      return
    }

    if (!selectedBrand && !newBrandName.trim()) {
      setError('Please select an existing brand or enter a new brand name')
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      // Convert file to base64
      const fileBase64 = await convertFileToBase64(selectedFile)
      
      // Determine file type
      const fileType = selectedFile.type.startsWith('image/') ? 'image' : 'csv'
      
      // Prepare request
      const requestData: ImportMenuRequest = {
        brandId: selectedBrand?.id,
        brandName: selectedBrand?.name || newBrandName.trim(),
        brandType: selectedBrand?.type || newBrandType,
        file: fileBase64,
        fileType,
        instructions: instructions.trim() || undefined
      }

      console.log('Sending import request:', {
        brandId: requestData.brandId,
        brandName: requestData.brandName,
        brandType: requestData.brandType,
        selectedBrand: selectedBrand,
        fileType: requestData.fileType,
        hasInstructions: !!requestData.instructions,
        fileSize: selectedFile.size
      })

      // Call analysis API
      const response = await fetch('/api/import-brand-menu/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to analyze menu')
      }

      const result: ImportMenuResponse = await response.json()
      console.log('Analysis complete:', result.items.length, 'items found')

      // Pass result to parent for review
      onAnalysisComplete(result, fileType)
      
      // Reset form
      setSelectedFile(null)
      setSelectedBrand(null)
      setNewBrandName('')
      setInstructions('')
      setError(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Import error:', error)
      setError(error instanceof Error ? error.message : 'Failed to import menu')
    } finally {
      setIsUploading(false)
    }
  }

  const handleClose = () => {
    if (isUploading) return // Don't allow close during upload
    
    setSelectedFile(null)
    setSelectedBrand(null)
    setNewBrandName('')
    setInstructions('')
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Import Brand Menu</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              disabled={isUploading}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Brand Selection */}
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="brand-select" className="text-sm font-medium text-gray-700">
                Select Brand
              </Label>
              <select
                id="brand-select"
                value={selectedBrand?.id || ''}
                onChange={(e) => {
                  const brand = brands.find(b => b.id === e.target.value)
                  setSelectedBrand(brand || null)
                  if (brand) {
                    setNewBrandName('')
                  }
                }}
                disabled={isUploading}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select existing brand or create new...</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name} ({brand.type})
                  </option>
                ))}
              </select>
            </div>

            {/* New Brand Fields */}
            {!selectedBrand && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <Label htmlFor="new-brand-name" className="text-sm font-medium text-gray-700">
                    New Brand Name
                  </Label>
                  <Input
                    id="new-brand-name"
                    value={newBrandName}
                    onChange={(e) => setNewBrandName(e.target.value)}
                    placeholder="Enter brand name..."
                    disabled={isUploading}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="brand-type" className="text-sm font-medium text-gray-700">
                    Brand Type
                  </Label>
                  <select
                    id="brand-type"
                    value={newBrandType}
                    onChange={(e) => setNewBrandType(e.target.value)}
                    disabled={isUploading}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="restaurant">Restaurant</option>
                    <option value="cafe">Cafe</option>
                    <option value="food_brand">Food Brand</option>
                    <option value="supplement_brand">Supplement Brand</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* File Upload */}
          <div className="mb-6">
            <Label className="text-sm font-medium text-gray-700 mb-2 block">
              Upload Menu (Image or CSV)
            </Label>
            <div 
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                selectedFile 
                  ? 'border-green-400 bg-green-50' 
                  : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center space-x-3">
                  {selectedFile.type.startsWith('image/') ? (
                    <Image className="h-8 w-8 text-green-600" />
                  ) : (
                    <FileText className="h-8 w-8 text-green-600" />
                  )}
                  <div className="text-left">
                    <p className="font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-sm text-green-600">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedFile(null)
                      if (fileInputRef.current) {
                        fileInputRef.current.value = ''
                      }
                    }}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div>
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 mb-2">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-sm text-gray-500">
                    Images (JPG, PNG) or CSV files up to 10MB
                  </p>
                </div>
              )}
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.csv"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              
              {!selectedFile && (
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="mt-3"
                >
                  Choose File
                </Button>
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-6">
            <Label htmlFor="instructions" className="text-sm font-medium text-gray-700">
              Instructions (Optional)
            </Label>
            <textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., 'only breakfast items', 'items under $15', 'extract these specific items: salad, soup, sandwich'"
              disabled={isUploading}
              rows={3}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
            <p className="mt-1 text-xs text-gray-500">
              Specify what to focus on or filter from the menu
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!selectedFile || isUploading || (!selectedBrand && !newBrandName.trim())}
              className="min-w-[120px]"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                'Import Menu'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 