'use client'

import { useState } from 'react'
import { Brand } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TagInput } from '@/components/ui/tag-input'
import { BrandInput } from '@/components/ui/brand-input'
import { useCreateSavedItem } from '@/lib/supabase/client-cache'

interface CreateSavedItemModalProps {
  isOpen: boolean
  onClose: () => void
  userId: string
  brands: Brand[]
}

// Common ingredients and allergens for autocomplete
const COMMON_INGREDIENTS = [
  'salmon', 'chicken', 'beef', 'pork', 'turkey', 'tuna', 'shrimp', 'eggs',
  'avocado', 'spinach', 'kale', 'broccoli', 'carrots', 'tomatoes', 'onions', 'garlic',
  'rice', 'quinoa', 'bread', 'pasta', 'oats', 'potatoes', 'sweet potatoes',
  'olive oil', 'coconut oil', 'butter', 'cheese', 'yogurt', 'milk', 'almonds', 'walnuts',
  'black beans', 'chickpeas', 'lentils', 'tofu', 'tempeh',
  'bell peppers', 'mushrooms', 'zucchini', 'cucumber', 'lettuce', 'arugula'
]

const COMMON_ALLERGENS = [
  'milk', 'eggs', 'fish', 'shellfish', 'tree nuts', 'peanuts', 'wheat', 'soybeans',
  'sesame', 'gluten', 'dairy', 'lactose', 'casein', 'whey'
]

export function CreateSavedItemModal({ isOpen, onClose, userId, brands }: CreateSavedItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: 'meal' as const,
    brand_id: '',
    brand_name: '',
    serving_size: '',
    kcal_per_serving: '',
    g_protein_per_serving: '',
    g_carb_per_serving: '',
    g_fat_per_serving: '',
    notes: '',
    ingredients: [] as string[],
    allergens: [] as string[]
  })

  const createSavedItem = useCreateSavedItem()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const itemData = {
      name: formData.name,
      category: formData.category,
      brand_id: formData.brand_id && formData.brand_id.trim() !== '' ? formData.brand_id : undefined,
      serving_size: formData.serving_size && formData.serving_size.trim() !== '' ? formData.serving_size : undefined,
      kcal_per_serving: formData.kcal_per_serving ? parseInt(formData.kcal_per_serving) : undefined,
      g_protein_per_serving: formData.g_protein_per_serving ? parseFloat(formData.g_protein_per_serving) : undefined,
      g_carb_per_serving: formData.g_carb_per_serving ? parseFloat(formData.g_carb_per_serving) : undefined,
      g_fat_per_serving: formData.g_fat_per_serving ? parseFloat(formData.g_fat_per_serving) : undefined,
      notes: formData.notes && formData.notes.trim() !== '' ? formData.notes : undefined,
      ingredients: formData.ingredients.length > 0 ? formData.ingredients : undefined,
      allergens: formData.allergens.length > 0 ? formData.allergens : undefined,
    }

    try {
      console.log('Creating saved item with data:', { userId, itemData })
      const result = await createSavedItem.mutateAsync({ userId, itemData })
      console.log('Saved item created successfully:', result)
      onClose()
      setFormData({
        name: '',
        category: 'meal',
        brand_id: '',
        brand_name: '',
        serving_size: '',
        kcal_per_serving: '',
        g_protein_per_serving: '',
        g_carb_per_serving: '',
        g_fat_per_serving: '',
        notes: '',
        ingredients: [],
        allergens: []
      })
    } catch (error) {
      console.error('Error creating saved item:', error)
      alert('Error creating saved item: ' + (error as Error).message)
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
            <BrandInput
              value={formData.brand_id}
              onChange={(brandId, brandName) => setFormData(prev => ({ 
                ...prev, 
                brand_id: brandId || '', 
                brand_name: brandName || '' 
              }))}
              brands={brands}
              placeholder="Type brand name..."
            />
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
            <TagInput
              value={formData.ingredients}
              onChange={(ingredients) => setFormData(prev => ({ ...prev, ingredients }))}
              suggestions={COMMON_INGREDIENTS}
              placeholder="Type ingredient and press Enter..."
            />
          </div>

          <div>
            <Label htmlFor="allergens">Allergens</Label>
            <TagInput
              value={formData.allergens}
              onChange={(allergens) => setFormData(prev => ({ ...prev, allergens }))}
              suggestions={COMMON_ALLERGENS}
              placeholder="Type allergen and press Enter..."
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