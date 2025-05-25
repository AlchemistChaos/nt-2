'use client'

import { useState } from 'react'
import { Brand } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCreateSavedItem } from '@/lib/supabase/client-cache'

interface CreateSavedItemModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  brands: Brand[]
}

export function CreateSavedItemModal({ isOpen, onClose, userId, brands }: CreateSavedItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'meal' as const,
    brand_id: '',
    serving_size: '',
    kcal_per_serving: '',
    g_protein_per_serving: '',
    g_carb_per_serving: '',
    g_fat_per_serving: '',
    notes: '',
    ingredients: '',
    allergens: ''
  })

  const createSavedItem = useCreateSavedItem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const itemData = {
      name: formData.name,
      category: formData.category,
      brand_id: formData.brand_id || undefined,
      serving_size: formData.serving_size || undefined,
      kcal_per_serving: formData.kcal_per_serving ? parseInt(formData.kcal_per_serving) : undefined,
      g_protein_per_serving: formData.g_protein_per_serving ? parseFloat(formData.g_protein_per_serving) : undefined,
      g_carb_per_serving: formData.g_carb_per_serving ? parseFloat(formData.g_carb_per_serving) : undefined,
      g_fat_per_serving: formData.g_fat_per_serving ? parseFloat(formData.g_fat_per_serving) : undefined,
      notes: formData.notes || undefined,
      ingredients: formData.ingredients ? formData.ingredients.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      allergens: formData.allergens ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : undefined,
    }

    try {
      await createSavedItem.mutateAsync({ userId, itemData })
      onClose()
      setFormData({
        name: '',
        category: 'meal',
        brand_id: '',
        serving_size: '',
        kcal_per_serving: '',
        g_protein_per_serving: '',
        g_carb_per_serving: '',
        g_fat_per_serving: '',
        notes: '',
        ingredients: '',
        allergens: ''
      })
    } catch (error) {
      console.error('Error creating saved item:', error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Add Saved Item</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Salmon Avocado Toast"
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <select
              id="category"
              value={formData.category}
              onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as any }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="meal">Meal</option>
              <option value="snack">Snack</option>
              <option value="supplement">Supplement</option>
              <option value="drink">Drink</option>
              <option value="ingredient">Ingredient</option>
            </select>
          </div>

          <div>
            <Label htmlFor="brand">Brand</Label>
            <select
              id="brand"
              value={formData.brand_id}
              onChange={(e) => setFormData(prev => ({ ...prev, brand_id: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a brand (optional)</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="serving_size">Serving Size</Label>
            <Input
              id="serving_size"
              value={formData.serving_size}
              onChange={(e) => setFormData(prev => ({ ...prev, serving_size: e.target.value }))}
              placeholder="e.g., 1 slice, 1 scoop, 1 teaspoon"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                value={formData.kcal_per_serving}
                onChange={(e) => setFormData(prev => ({ ...prev, kcal_per_serving: e.target.value }))}
                placeholder="280"
              />
            </div>
            <div>
              <Label htmlFor="protein">Protein (g)</Label>
              <Input
                id="protein"
                type="number"
                step="0.1"
                value={formData.g_protein_per_serving}
                onChange={(e) => setFormData(prev => ({ ...prev, g_protein_per_serving: e.target.value }))}
                placeholder="25"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="carbs">Carbs (g)</Label>
              <Input
                id="carbs"
                type="number"
                step="0.1"
                value={formData.g_carb_per_serving}
                onChange={(e) => setFormData(prev => ({ ...prev, g_carb_per_serving: e.target.value }))}
                placeholder="8"
              />
            </div>
            <div>
              <Label htmlFor="fat">Fat (g)</Label>
              <Input
                id="fat"
                type="number"
                step="0.1"
                value={formData.g_fat_per_serving}
                onChange={(e) => setFormData(prev => ({ ...prev, g_fat_per_serving: e.target.value }))}
                placeholder="18"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="ingredients">Ingredients</Label>
            <Input
              id="ingredients"
              value={formData.ingredients}
              onChange={(e) => setFormData(prev => ({ ...prev, ingredients: e.target.value }))}
              placeholder="salmon, avocado, bread, olive oil (comma separated)"
            />
          </div>

          <div>
            <Label htmlFor="allergens">Allergens</Label>
            <Input
              id="allergens"
              value={formData.allergens}
              onChange={(e) => setFormData(prev => ({ ...prev, allergens: e.target.value }))}
              placeholder="fish, gluten (comma separated)"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Any additional notes..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createSavedItem.isPending || !formData.name}
            >
              {createSavedItem.isPending ? 'Creating...' : 'Create Item'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
} 