'use client'

import { MealWithItems, DailyTarget } from '@/types'
import { TrendingUp, Target } from 'lucide-react'

interface DailyProgressProps {
  meals: MealWithItems[]
  dailyTarget: DailyTarget | null
}

export function DailyProgress({ meals, dailyTarget }: DailyProgressProps) {
  // Calculate totals from today's meals
  const totals = meals.reduce(
    (acc, meal) => ({
      calories: acc.calories + (meal.kcal_total || 0),
      protein: acc.protein + (meal.g_protein || 0),
      carbs: acc.carbs + (meal.g_carb || 0),
      fat: acc.fat + (meal.g_fat || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  // Round up all totals for display
  const roundedTotals = {
    calories: Math.ceil(totals.calories),
    protein: Math.ceil(totals.protein),
    carbs: Math.ceil(totals.carbs),
    fat: Math.ceil(totals.fat)
  }

  // If no daily target is set, show basic totals
  if (!dailyTarget) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Today's Progress</h3>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{roundedTotals.calories}</div>
            <div className="text-xs sm:text-sm text-gray-500">Calories</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{roundedTotals.protein}g</div>
            <div className="text-xs sm:text-sm text-gray-500">Protein</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{roundedTotals.carbs}g</div>
            <div className="text-xs sm:text-sm text-gray-500">Carbs</div>
          </div>
          <div className="text-center p-2 sm:p-3 bg-gray-50 rounded-lg">
            <div className="text-lg sm:text-2xl font-bold text-gray-900">{roundedTotals.fat}g</div>
            <div className="text-xs sm:text-sm text-gray-500">Fat</div>
          </div>
        </div>
        <div className="mt-3 text-center">
          <p className="text-xs sm:text-sm text-gray-500">
            Set your goals to track progress against targets
          </p>
        </div>
      </div>
    )
  }

  // Calculate progress percentages using rounded totals
  const calorieProgress = dailyTarget.calories_target ? (roundedTotals.calories / dailyTarget.calories_target) * 100 : 0

  const ProgressBar = ({ current, target, label, color = 'blue' }: {
    current: number
    target: number
    label: string
    color?: string
  }) => {
    const percentage = Math.min((current / target) * 100, 100)
    const isOver = current > target
    
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-gray-900'}`}>
            {Math.round(current)}/{target}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              isOver 
                ? 'bg-red-500' 
                : color === 'green' 
                  ? 'bg-green-500' 
                  : color === 'orange'
                    ? 'bg-orange-500'
                    : color === 'purple'
                      ? 'bg-purple-500'
                      : 'bg-blue-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <div className="text-xs text-gray-500 text-center">
          {Math.round(percentage)}% of target
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3 sm:p-4">
      <div className="flex items-center gap-2 mb-4">
        <Target className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900 text-sm sm:text-base">Daily Progress</h3>
      </div>
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {dailyTarget.calories_target && (
          <ProgressBar
            current={roundedTotals.calories}
            target={dailyTarget.calories_target}
            label="Calories"
            color="blue"
          />
        )}
        
        {dailyTarget.protein_target && (
          <ProgressBar
            current={roundedTotals.protein}
            target={dailyTarget.protein_target}
            label="Protein (g)"
            color="green"
          />
        )}
        
        {dailyTarget.carbs_target && (
          <ProgressBar
            current={roundedTotals.carbs}
            target={dailyTarget.carbs_target}
            label="Carbs (g)"
            color="orange"
          />
        )}
        
        {dailyTarget.fat_target && (
          <ProgressBar
            current={roundedTotals.fat}
            target={dailyTarget.fat_target}
            label="Fat (g)"
            color="purple"
          />
        )}
      </div>
      
      {/* Overall progress summary */}
      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between text-xs sm:text-sm">
          <span className="text-gray-600">Overall Progress:</span>
          <span className={`font-semibold ${
            calorieProgress >= 90 && calorieProgress <= 110 
              ? 'text-green-600' 
              : calorieProgress > 110 
                ? 'text-red-600' 
                : 'text-blue-600'
          }`}>
            {Math.round(calorieProgress)}% of calorie target
          </span>
        </div>
      </div>
    </div>
  )
} 