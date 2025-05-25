'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { MealWithItems } from '@/types'
import { updateMeal } from '@/lib/supabase/database-client'
import { Upload, X } from 'lucide-react'

interface EditMealModalProps {
  meal: MealWithItems
  isOpen: boolean
  onClose: () => void
  onMealUpdated: () => void
}

export function EditMealModal({ meal, isOpen, onClose, onMealUpdated }: EditMealModalProps) {
  const [formData, setFormData] = useState({
    meal_name: meal.meal_name || '',
    kcal_total: meal.kcal_total?.toString() || '',
    g_protein: meal.g_protein?.toString() || '',
    g_carb: meal.g_carb?.toString() || '',
    g_fat: meal.g_fat?.toString() || '',
    image_url: meal.image_url || ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(meal.image_url || null)

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const removeImage = () => {
    setImageFile(null)
    setImagePreview(null)
    setFormData(prev => ({ ...prev, image_url: '' }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Convert string values to numbers for nutrition fields
      const updateData = {
        meal_name: formData.meal_name.trim(),
        kcal_total: formData.kcal_total ? parseInt(formData.kcal_total) : undefined,
        g_protein: formData.g_protein ? parseInt(formData.g_protein) : undefined,
        g_carb: formData.g_carb ? parseInt(formData.g_carb) : undefined,
        g_fat: formData.g_fat ? parseInt(formData.g_fat) : undefined,
        image_url: imagePreview || undefined
      }

      const updatedMeal = await updateMeal(meal.id, updateData)
      
      if (updatedMeal) {
        onMealUpdated()
      } else {
        alert('Failed to update meal. Please try again.')
      }
    } catch (error) {
      console.error('Error updating meal:', error)
      alert('Failed to update meal. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Edit Meal</h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Meal Name */}
            <div className="space-y-2">
              <label htmlFor="meal_name" className="block text-sm font-medium text-gray-700">
                Meal Name
              </label>
              <Input
                id="meal_name"
                value={formData.meal_name}
                onChange={(e) => handleInputChange('meal_name', e.target.value)}
                placeholder="Enter meal name"
                required
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Meal Image</label>
              {imagePreview ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
                    alt="Meal preview"
                    className="w-full h-32 object-cover rounded-md"
                  />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4">
                  <label htmlFor="image-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                    <span className="text-sm text-gray-500">Click to upload image</span>
                  </label>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              )}
            </div>

            {/* Nutrition Information */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label htmlFor="kcal_total" className="block text-sm font-medium text-gray-700">
                  Calories
                </label>
                <Input
                  id="kcal_total"
                  type="number"
                  value={formData.kcal_total}
                  onChange={(e) => handleInputChange('kcal_total', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g_protein" className="block text-sm font-medium text-gray-700">
                  Protein (g)
                </label>
                <Input
                  id="g_protein"
                  type="number"
                  value={formData.g_protein}
                  onChange={(e) => handleInputChange('g_protein', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g_carb" className="block text-sm font-medium text-gray-700">
                  Carbs (g)
                </label>
                <Input
                  id="g_carb"
                  type="number"
                  value={formData.g_carb}
                  onChange={(e) => handleInputChange('g_carb', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="g_fat" className="block text-sm font-medium text-gray-700">
                  Fat (g)
                </label>
                <Input
                  id="g_fat"
                  type="number"
                  value={formData.g_fat}
                  onChange={(e) => handleInputChange('g_fat', e.target.value)}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
} 