'use client'

import { useRef } from 'react'
import { CarouselCard } from './CarouselCard'
import { MealWithItems } from '@/types'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CustomMealCarouselProps {
  meals: MealWithItems[]
}

export function CustomMealCarousel({ meals }: CustomMealCarouselProps) {
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

  // Generate placeholder cards to fill up to 10 slots
  const placeholderTypes = ['breakfast', 'snack', 'lunch', 'snack', 'dinner', 'snack']
  const totalSlots = 10
  const placeholdersNeeded = Math.max(0, totalSlots - meals.length)
  
  const placeholders = Array.from({ length: placeholdersNeeded }, (_, index) => ({
    id: `placeholder-${index}`,
    type: placeholderTypes[index % placeholderTypes.length]
  }))

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Today&apos;s Meals</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative overflow-hidden">
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {/* Actual meals */}
          {meals.map((meal) => (
            <CarouselCard key={meal.id} meal={meal} />
          ))}
          
          {/* Placeholder cards */}
          {placeholders.map((placeholder) => (
            <CarouselCard
              key={placeholder.id}
              isPlaceholder
              mealType={placeholder.type}
            />
          ))}
        </div>
      </div>

      {/* Summary stats */}
      <div className="mt-4 flex gap-6 text-sm text-gray-600">
        <div>
          <span className="font-medium">
            {meals.filter(m => m.status === 'logged').length}
          </span>
          <span className="ml-1">meals logged</span>
        </div>
        <div>
          <span className="font-medium">
            {meals.filter(m => m.status === 'planned').length}
          </span>
          <span className="ml-1">meals planned</span>
        </div>
        <div>
          <span className="font-medium">
            {meals.reduce((sum, meal) => sum + (meal.kcal_total || 0), 0)}
          </span>
          <span className="ml-1">calories</span>
        </div>
      </div>


    </div>
  )
} 