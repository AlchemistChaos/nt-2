'use client'

import { Card, CardContent } from '@/components/ui/card'
import { MealWithItems } from '@/types'
import { formatTime } from '@/lib/utils'
import { Clock, Utensils, Plus, X, Edit3 } from 'lucide-react'
import { useState } from 'react'
import { deleteMeal } from '@/lib/supabase/database-client'
import { EditMealModal } from './EditMealModal'

interface CarouselCardProps {
  meal?: MealWithItems
  isPlaceholder?: boolean
  mealType?: string
  onMealUpdated?: () => void
  onMealDeleted?: () => void
}

export function CarouselCard({ 
  meal, 
  isPlaceholder, 
  mealType, 
  onMealUpdated,
  onMealDeleted 
}: CarouselCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    if (!meal || isDeleting) return
    
    if (confirm('Are you sure you want to delete this meal?')) {
      setIsDeleting(true)
      try {
        const success = await deleteMeal(meal.id)
        if (success) {
          onMealDeleted?.()
        } else {
          alert('Failed to delete meal. Please try again.')
        }
      } catch (error) {
        console.error('Error deleting meal:', error)
        alert('Failed to delete meal. Please try again.')
      } finally {
        setIsDeleting(false)
      }
    }
  }

  const handleEdit = () => {
    setIsEditModalOpen(true)
  }

  const handleMealUpdated = () => {
    setIsEditModalOpen(false)
    onMealUpdated?.()
  }

  if (isPlaceholder) {
    return (
      <Card className="min-w-[150px] sm:min-w-[210px] h-[80px] sm:h-[100px] border-dashed border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer">
        <CardContent className="p-2 sm:p-3 h-full flex flex-col items-center justify-center text-gray-500">
          <Plus className="h-4 w-4 sm:h-6 sm:w-6 mb-1" />
          <p className="text-xs font-medium text-center">Plan your {mealType || 'meal'}</p>
          <p className="text-xs text-gray-400 mt-0.5">Click to add</p>
        </CardContent>
      </Card>
    )
  }

  if (!meal) return null

  const isPlanned = meal.status === 'planned'

  return (
    <>
      <Card className="min-w-[150px] sm:min-w-[210px] h-[80px] sm:h-[100px] bg-white shadow-sm hover:shadow-md transition-shadow relative group">
        <CardContent className="p-2 sm:p-3 h-full flex flex-col">
          {/* Action buttons - show on hover */}
          <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleEdit}
              className="p-0.5 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
              title="Edit meal"
            >
              <Edit3 className="h-2.5 w-2.5 text-gray-600" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="p-0.5 bg-white rounded-full shadow-md hover:bg-red-50 transition-colors disabled:opacity-50"
              title="Delete meal"
            >
              <X className="h-2.5 w-2.5 text-red-600" />
            </button>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600 capitalize">
                {meal.meal_type || 'Meal'}
              </span>
            </div>
            {isPlanned && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                Planned
              </span>
            )}
          </div>

          {/* Image or placeholder */}
          <div className="flex-1 mb-1">
            {meal.image_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={meal.image_url}
                alt={meal.meal_name || 'Meal'}
                className="w-full h-8 sm:h-10 object-cover rounded-md"
              />
            ) : (
              <div className="w-full h-8 sm:h-10 bg-gray-100 rounded-md flex items-center justify-center">
                <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Meal info */}
          <div className="space-y-0.5">
            <h3 className="font-medium text-xs line-clamp-1">
              {meal.meal_name || 'Unnamed meal'}
            </h3>
            
            <div className="flex items-center gap-1 text-xs text-gray-500">
              <Clock className="h-2.5 w-2.5" />
              <span>{formatTime(meal.logged_at)}</span>
            </div>

            {/* Nutrition info - only show for logged meals */}
            {!isPlanned && (meal.kcal_total || meal.g_protein) && (
              <div className="flex gap-2 text-xs">
                {meal.kcal_total && (
                  <span className="text-gray-600">
                    {meal.kcal_total} cal
                  </span>
                )}
                {meal.g_protein && (
                  <span className="text-gray-600">
                    {meal.g_protein}g protein
                  </span>
                )}

              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Modal */}
      {isEditModalOpen && meal && (
        <EditMealModal
          meal={meal}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onMealUpdated={handleMealUpdated}
        />
      )}
    </>
  )
} 