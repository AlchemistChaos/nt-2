'use client'

import { useRef } from 'react'
import { CarouselCard } from './CarouselCard'
import { MealWithItems } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { sortMealsByTime, getMealTimeOrder } from '@/lib/utils'

interface CustomMealCarouselProps {
  meals: MealWithItems[]
  onMealUpdated?: () => void
  onMealDeleted?: () => void
}

export function CustomMealCarousel({ meals, onMealUpdated, onMealDeleted }: CustomMealCarouselProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return
    
    const scrollAmount = 300
    const currentScroll = scrollContainerRef.current.scrollLeft
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount

    scrollContainerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

  // Create chronological meal slots
  const createChronologicalSlots = () => {
    const slots = []
    const sortedMeals = sortMealsByTime(meals)
    
    // Group meals by type
    const mealsByType = sortedMeals.reduce((acc, meal) => {
      const mealType = meal.meal_type || 'snack'
      if (!acc[mealType]) acc[mealType] = []
      acc[mealType].push(meal)
      return acc
    }, {} as Record<string, MealWithItems[]>)

    // Define the chronological order
    const timeSlots = [
      { type: 'breakfast', time: '8:00 AM' },
      { type: 'snack', time: '10:00 AM', label: 'Morning Snack' },
      { type: 'lunch', time: '12:00 PM' },
      { type: 'snack', time: '3:00 PM', label: 'Afternoon Snack' },
      { type: 'dinner', time: '6:00 PM' },
      { type: 'snack', time: '8:00 PM', label: 'Evening Snack' }
    ]

    let snackIndex = 0
    
    for (const slot of timeSlots) {
      if (slot.type === 'snack') {
        // For snacks, show the next available snack or placeholder
        const availableSnacks = mealsByType['snack'] || []
        if (availableSnacks[snackIndex]) {
          slots.push({
            meal: availableSnacks[snackIndex],
            isPlaceholder: false
          })
          snackIndex++
        } else {
          slots.push({
            meal: null,
            isPlaceholder: true,
            mealType: 'snack',
            label: slot.label
          })
        }
      } else {
        // For main meals, show the meal or placeholder
        const mealsOfType = mealsByType[slot.type] || []
        if (mealsOfType.length > 0) {
          slots.push({
            meal: mealsOfType[0], // Take the first (and usually only) meal of this type
            isPlaceholder: false
          })
        } else {
          slots.push({
            meal: null,
            isPlaceholder: true,
            mealType: slot.type
          })
        }
      }
    }

    return slots
  }

  const mealSlots = createChronologicalSlots()

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900">Today&apos;s Meals</h2>
        <div className="flex gap-1 sm:gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-7 w-7 sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Chronological meal slots */}
          {mealSlots.map((slot, index) => (
            <CarouselCard
              key={slot.meal?.id || `slot-${index}`}
              meal={slot.meal || undefined}
              isPlaceholder={slot.isPlaceholder}
              mealType={slot.mealType}
              onMealUpdated={onMealUpdated}
              onMealDeleted={onMealDeleted}
            />
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-3 sm:mt-4 flex flex-wrap gap-3 sm:gap-6 text-xs sm:text-sm text-gray-600">
        <div className="flex items-center gap-1">
          <span className="font-medium">
            {meals.filter(m => m.status === 'logged').length}
          </span>
          <span>meals logged</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">
            {meals.filter(m => m.status === 'planned').length}
          </span>
          <span>meals planned</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">
            {meals.reduce((sum, meal) => sum + (meal.kcal_total || 0), 0)}
          </span>
          <span>calories</span>
        </div>
      </div>


    </div>
  )
} 