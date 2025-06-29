'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, Loader2 } from 'lucide-react'
import { Brand, BrandMenuItem } from '@/types'
import { useCreateBrandMenuItems } from '@/lib/supabase/client-cache'
import { useCurrentUser } from '@/lib/supabase/client-cache'

interface CreateBrandMenuItemModalProps {
  isOpen: boolean
  onClose: () => void
  brand: Brand
}

export function CreateBrandMenuItemModal({ 
  isOpen, 
  onClose, 
  brand
}: CreateBrandMenuItemModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'meal',
    price_cents: '',
    serving_size: '',
    kcal_per_serving: '',
    g_protein_per_serving: '',
    g_carb_per_serving: '',
    g_fat_per_serving: '',
    g_fiber_per_serving: '',
    g_sugar_per_serving: '',
    mg_sodium_per_serving: '',
    ingredients: '',
    allergens: '',
    dietary_tags: '',
    is_available: true,
    is_seasonal: false
  })

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { data: user } = useCurrentUser()
  const createBrandMenuItems = useCreateBrandMenuItems()

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Item name is required')
      return
    }

    if (!user) {
      setError('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      // Prepare the menu item data
      const menuItemData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category,
        price_cents: formData.price_cents ? parseInt(formData.price_cents) : undefined,
        serving_size: formData.serving_size.trim() || undefined,
        kcal_per_serving: formData.kcal_per_serving ? parseInt(formData.kcal_per_serving) : undefined,
        g_protein_per_serving: formData.g_protein_per_serving ? parseFloat(formData.g_protein_per_serving) : undefined,
        g_carb_per_serving: formData.g_carb_per_serving ? parseFloat(formData.g_carb_per_serving) : undefined,
        g_fat_per_serving: formData.g_fat_per_serving ? parseFloat(formData.g_fat_per_serving) : undefined,
        g_fiber_per_serving: formData.g_fiber_per_serving ? parseFloat(formData.g_fiber_per_serving) : undefined,
        g_sugar_per_serving: formData.g_sugar_per_serving ? parseFloat(formData.g_sugar_per_serving) : undefined,
        mg_sodium_per_serving: formData.mg_sodium_per_serving ? parseInt(formData.mg_sodium_per_serving) : undefined,
        ingredients: formData.ingredients.trim() ? formData.ingredients.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        allergens: formData.allergens.trim() ? formData.allergens.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        dietary_tags: formData.dietary_tags.trim() ? formData.dietary_tags.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        is_available: formData.is_available,
        is_seasonal: formData.is_seasonal
      }

      // Create the menu item using the mutation
      await createBrandMenuItems.mutateAsync({
        userId: user.id,
        brandId: brand.id,
        items: [menuItemData],
        importSource: 'manual'
      })

      // Reset form and close modal
      setFormData({
        name: '',
        description: '',
        category: 'meal',
        price_cents: '',
        serving_size: '',
        kcal_per_serving: '',
        g_protein_per_serving: '',
        g_carb_per_serving: '',
        g_fat_per_serving: '',
        g_fiber_per_serving: '',
        g_sugar_per_serving: '',
        mg_sodium_per_serving: '',
        ingredients: '',
        allergens: '',
        dietary_tags: '',
        is_available: true,
        is_seasonal: false
      })
      onClose()

    } catch (error) {
      console.error('Error creating menu item:', error)
      setError(error instanceof Error ? error.message : 'Failed to create menu item')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (isSubmitting) return
    
    // Reset form
    setFormData({
      name: '',
      description: '',
      category: 'meal',
      price_cents: '',
      serving_size: '',
      kcal_per_serving: '',
      g_protein_per_serving: '',
      g_carb_per_serving: '',
      g_fat_per_serving: '',
      g_fiber_per_serving: '',
      g_sugar_per_serving: '',
      mg_sodium_per_serving: '',
      ingredients: '',
      allergens: '',
      dietary_tags: '',
      is_available: true,
      is_seasonal: false
    })
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Add Menu Item</h2>
                <p className="text-sm text-gray-600 mt-1">Add a new item to {brand.name}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={handleClose}
                disabled={isSubmitting}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-sm font-medium text-gray-700">
                    Item Name *
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Big Mac, Chicken Sandwich"
                    disabled={isSubmitting}
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                    Category
                  </Label>
                  <select
                    id="category"
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    disabled={isSubmitting}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="meal">Meal</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                    <option value="snack">Snack</option>
                    <option value="beverage">Beverage</option>
                    <option value="appetizer">Appetizer</option>
                    <option value="dessert">Dessert</option>
                    <option value="supplement">Supplement</option>
                  </select>
                </div>
              </div>

              <div>
                <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                  Description
                </Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of the item..."
                  disabled={isSubmitting}
                  rows={2}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none"
                />
              </div>

              {/* Price and Serving */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price" className="text-sm font-medium text-gray-700">
                    Price ($)
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price_cents ? (parseInt(formData.price_cents) / 100).toFixed(2) : ''}
                    onChange={(e) => handleInputChange('price_cents', Math.round(parseFloat(e.target.value || '0') * 100).toString())}
                    placeholder="0.00"
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="serving_size" className="text-sm font-medium text-gray-700">
                    Serving Size
                  </Label>
                  <Input
                    id="serving_size"
                    value={formData.serving_size}
                    onChange={(e) => handleInputChange('serving_size', e.target.value)}
                    placeholder="e.g., 1 item, 12 oz, 100g"
                    disabled={isSubmitting}
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Nutrition Facts */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700">Nutrition Facts (per serving)</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="calories" className="text-xs text-gray-600">
                      Calories
                    </Label>
                    <Input
                      id="calories"
                      type="number"
                      value={formData.kcal_per_serving}
                      onChange={(e) => handleInputChange('kcal_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="protein" className="text-xs text-gray-600">
                      Protein (g)
                    </Label>
                    <Input
                      id="protein"
                      type="number"
                      step="0.1"
                      value={formData.g_protein_per_serving}
                      onChange={(e) => handleInputChange('g_protein_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="carbs" className="text-xs text-gray-600">
                      Carbs (g)
                    </Label>
                    <Input
                      id="carbs"
                      type="number"
                      step="0.1"
                      value={formData.g_carb_per_serving}
                      onChange={(e) => handleInputChange('g_carb_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="fat" className="text-xs text-gray-600">
                      Fat (g)
                    </Label>
                    <Input
                      id="fat"
                      type="number"
                      step="0.1"
                      value={formData.g_fat_per_serving}
                      onChange={(e) => handleInputChange('g_fat_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fiber" className="text-xs text-gray-600">
                      Fiber (g)
                    </Label>
                    <Input
                      id="fiber"
                      type="number"
                      step="0.1"
                      value={formData.g_fiber_per_serving}
                      onChange={(e) => handleInputChange('g_fiber_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sugar" className="text-xs text-gray-600">
                      Sugar (g)
                    </Label>
                    <Input
                      id="sugar"
                      type="number"
                      step="0.1"
                      value={formData.g_sugar_per_serving}
                      onChange={(e) => handleInputChange('g_sugar_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sodium" className="text-xs text-gray-600">
                      Sodium (mg)
                    </Label>
                    <Input
                      id="sodium"
                      type="number"
                      value={formData.mg_sodium_per_serving}
                      onChange={(e) => handleInputChange('mg_sodium_per_serving', e.target.value)}
                      placeholder="0"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-3">
                <div>
                  <Label htmlFor="ingredients" className="text-sm font-medium text-gray-700">
                    Ingredients (comma-separated)
                  </Label>
                  <textarea
                    id="ingredients"
                    value={formData.ingredients}
                    onChange={(e) => handleInputChange('ingredients', e.target.value)}
                    placeholder="e.g., chicken breast, lettuce, mayo, bun"
                    disabled={isSubmitting}
                    rows={2}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 resize-none text-sm"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="allergens" className="text-sm font-medium text-gray-700">
                      Allergens (comma-separated)
                    </Label>
                    <Input
                      id="allergens"
                      value={formData.allergens}
                      onChange={(e) => handleInputChange('allergens', e.target.value)}
                      placeholder="e.g., gluten, dairy, nuts"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dietary_tags" className="text-sm font-medium text-gray-700">
                      Dietary Tags (comma-separated)
                    </Label>
                    <Input
                      id="dietary_tags"
                      value={formData.dietary_tags}
                      onChange={(e) => handleInputChange('dietary_tags', e.target.value)}
                      placeholder="e.g., vegetarian, gluten-free"
                      disabled={isSubmitting}
                      className="mt-1 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Availability */}
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <input
                    id="is_available"
                    type="checkbox"
                    checked={formData.is_available}
                    onChange={(e) => handleInputChange('is_available', e.target.checked)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="is_available" className="ml-2 text-sm text-gray-700">
                    Available
                  </Label>
                </div>
                <div className="flex items-center">
                  <input
                    id="is_seasonal"
                    type="checkbox"
                    checked={formData.is_seasonal}
                    onChange={(e) => handleInputChange('is_seasonal', e.target.checked)}
                    disabled={isSubmitting}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="is_seasonal" className="ml-2 text-sm text-gray-700">
                    Seasonal Item
                  </Label>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!formData.name.trim() || isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Add Item
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
} 