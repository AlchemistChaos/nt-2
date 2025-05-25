'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateBrand } from '@/lib/supabase/client-cache'

interface CreateBrandModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreateBrandModal({ isOpen, onClose }: CreateBrandModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'restaurant' as const,
    description: '',
    website: ''
  })

  const createBrand = useCreateBrand()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const brandData = {
      name: formData.name,
      type: formData.type,
      description: formData.description || undefined,
      website: formData.website || undefined,
    }

    try {
      await createBrand.mutateAsync(brandData)
      onClose()
      setFormData({
        name: '',
        type: 'restaurant',
        description: '',
        website: ''
      })
    } catch (error) {
      console.error('Error creating brand:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Brand</h2>
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
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
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
              disabled={createBrand.isPending || !formData.name}
            >
              {createBrand.isPending ? 'Creating...' : 'Create Brand'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 