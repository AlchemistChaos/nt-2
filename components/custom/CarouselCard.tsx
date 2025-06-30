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
  meals?: MealWithItems[]
  isPlaceholder?: boolean
  mealType?: string
  onMealUpdated?: () => void
  onMealDeleted?: () => void
}

export function CarouselCard({ 
  meal, 
  meals,
  isPlaceholder, 
  mealType, 
  onMealUpdated,
  onMealDeleted 
}: CarouselCardProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Use meals array or fallback to single meal
  const mealsList = meals || (meal ? [meal] : [])
  const hasMeals = mealsList.length > 0
  
  // Debug logging
  if (mealType && mealsList.length > 0) {
    console.log(`🃏 [CARD ${mealType}] Received ${mealsList.length} meals:`, 
      mealsList.map(m => ({ name: m.meal_name, id: m.id, status: m.status }))
    )
  }

  // Aggregate nutrition data from all meals of this type
  const aggregatedData = mealsList.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.kcal_total || 0),
      protein: acc.protein + (m.g_protein || 0),
      carbs: acc.carbs + (m.g_carb || 0),
      fat: acc.fat + (m.g_fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const handleDelete = async (mealToDelete: MealWithItems) => {
    if (isDeleting) return
    
    if (confirm('Are you sure you want to delete this meal?')) {
      setIsDeleting(true)
      try {
        const success = await deleteMeal(mealToDelete.id)
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

  const handleEdit = (mealToEdit: MealWithItems) => {
    // For now, we'll edit the first meal, but this could be expanded
    // to show a list of meals to choose from
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

  if (!hasMeals && !isPlaceholder) return null

  const hasPlannedMeals = mealsList.some(m => m.status === 'planned')
  const hasLoggedMeals = mealsList.some(m => m.status === 'logged')
  const firstMeal = mealsList[0] // For edit modal

  return (
    <>
      <Card className="min-w-[150px] sm:min-w-[210px] min-h-[120px] sm:min-h-[140px] bg-white shadow-sm hover:shadow-md transition-shadow relative group">
        <CardContent className="p-2 sm:p-3 h-full flex flex-col">
          {/* Action buttons - show on hover, only if we have meals */}
          {hasMeals && (
            <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {firstMeal && (
                <button
                  onClick={() => handleEdit(firstMeal)}
                  className="p-0.5 bg-white rounded-full shadow-md hover:bg-gray-50 transition-colors"
                  title="Edit meal"
                >
                  <Edit3 className="h-2.5 w-2.5 text-gray-600" />
                </button>
              )}
            </div>
          )}

          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1">
              <Utensils className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-600 capitalize">
                {mealType || 'Meal'}
              </span>
            </div>
            <div className="flex gap-1">
              {hasPlannedMeals && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1 py-0.5 rounded-full">
                  {mealsList.filter(m => m.status === 'planned').length} planned
                </span>
              )}
              {hasLoggedMeals && (
                <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded-full">
                  {mealsList.filter(m => m.status === 'logged').length} logged
                </span>
              )}
            </div>
          </div>

          {/* Meal Items List */}
          <div className="flex-1 mb-1 overflow-y-auto">
            {hasMeals ? (
              <div className="space-y-1">
                {mealsList.map((singleMeal, index) => (
                  <div key={singleMeal.id} className="flex items-center justify-between bg-gray-50 rounded p-1">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium truncate">
                        {singleMeal.meal_name || 'Unnamed meal'}
                      </div>
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="h-2 w-2" />
                        <span>{formatTime(singleMeal.logged_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(singleMeal)}
                      disabled={isDeleting}
                      className="p-0.5 hover:bg-red-100 rounded transition-colors disabled:opacity-50"
                      title="Delete meal"
                    >
                      <X className="h-3 w-3 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-full bg-gray-100 rounded-md flex items-center justify-center">
                <Utensils className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400" />
              </div>
            )}
          </div>

          {/* Aggregated Nutrition Info */}
          {hasMeals && hasLoggedMeals && (
            <div className="border-t pt-1">
              <div className="text-xs font-medium text-gray-700 mb-0.5">Total:</div>
              <div className="flex gap-2 text-xs">
                {aggregatedData.calories > 0 && (
                  <span className="text-gray-600">
                    {aggregatedData.calories} cal
                  </span>
                )}
                {aggregatedData.protein > 0 && (
                  <span className="text-gray-600">
                    {aggregatedData.protein}g protein
                  </span>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Modal - only show for the first meal */}
      {isEditModalOpen && firstMeal && (
        <EditMealModal
          meal={firstMeal}
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onMealUpdated={handleMealUpdated}
        />
      )}
    </>
  )
} 