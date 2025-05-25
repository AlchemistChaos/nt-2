'use client'

import { useState, useEffect } from 'react'
import { Brand } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useUpdateBrand } from '@/lib/supabase/client-cache'

interface EditBrandModalProps {
  isOpen: boolean
  onClose: () => void
  brand: Brand | null
}

export function EditBrandModal({ isOpen, onClose, brand }: EditBrandModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'restaurant' as Brand['type'],
    description: '',
    website: ''
  })

  const updateBrand = useUpdateBrand()

  // Update form data when brand changes
  useEffect(() => {
    if (brand) {
      setFormData({
        name: brand.name,
        type: brand.type,
        description: brand.description || '',
        website: brand.website || ''
      })
    }
  }, [brand])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!brand) return

    const brandData = {
      name: formData.name,
      type: formData.type,
      description: formData.description || undefined,
      website: formData.website || undefined,
    }

    try {
      await updateBrand.mutateAsync({ brandId: brand.id, brandData })
      onClose()
    } catch (error) {
      console.error('Error updating brand:', error)
      alert('Error updating brand: ' + (error as Error).message)
    }
  }

  if (!isOpen || !brand) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Edit Brand</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="brand-name">Name *</Label>
            <Input
              id="brand-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Watchouse, Thorne"
              required
            />
          </div>

          <div>
            <Label htmlFor="brand-type">Type *</Label>
            <select
              id="brand-type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as Brand['type'] }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="restaurant">Restaurant</option>
              <option value="supplement_brand">Supplement Brand</option>
              <option value="food_brand">Food Brand</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <Label htmlFor="brand-description">Description</Label>
            <Input
              id="brand-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the brand"
            />
          </div>

          <div>
            <Label htmlFor="brand-website">Website</Label>
            <Input
              id="brand-website"
              type="url"
              value={formData.website}
              onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
              placeholder="https://example.com"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={updateBrand.isPending || !formData.name}
            >
              {updateBrand.isPending ? 'Updating...' : 'Update Brand'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 