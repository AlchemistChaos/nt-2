'use client'

import { useRef, useState } from 'react'
import { CarouselCard } from './CarouselCard'
import { MealWithItems, DailyTarget, User } from '@/types'
import { ChevronLeft, ChevronRight, Zap, Beef, Wheat, Droplets, Calendar, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useConvertMealsToYesterday, useChatMessages } from '@/lib/supabase/client-cache'
import { getTodayDateString } from '@/lib/utils/date'

interface CustomMealCarouselProps {
  meals: MealWithItems[]
  dailyTarget: DailyTarget | null
  user: User
  selectedDate: string
  onMealUpdated?: () => void
  onMealDeleted?: () => void
}

export function CustomMealCarousel({ meals, dailyTarget, user, selectedDate, onMealUpdated, onMealDeleted }: CustomMealCarouselProps) {
  const mainMealScrollRef = useRef<HTMLDivElement>(null)
  const snackScrollRef = useRef<HTMLDivElement>(null)
  const [isConverting, setIsConverting] = useState(false)
  
  const convertToYesterday = useConvertMealsToYesterday()
  const isToday = selectedDate === getTodayDateString()
  const hasMealsToday = meals.length > 0
  
  // Get today's chat messages to check if button should show
  const { data: todaysChatMessages = [] } = useChatMessages(user.id, selectedDate, 50)
  const hasChatMessagesToday = todaysChatMessages.length > 0
  
  // Show button if there are either meals OR chat messages for today
  const hasContentToMove = hasMealsToday || hasChatMessagesToday

  const scroll = (direction: 'left' | 'right', containerRef: React.RefObject<HTMLDivElement | null>) => {
    if (!containerRef.current) return
    
    const scrollAmount = 300
    const currentScroll = containerRef.current.scrollLeft
    const targetScroll = direction === 'left' 
      ? currentScroll - scrollAmount 
      : currentScroll + scrollAmount

    containerRef.current.scrollTo({
      left: targetScroll,
      behavior: 'smooth'
    })
  }

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
    
    // Group meals by type
  const groupMealsByType = () => {
    const grouped = meals.reduce((acc, meal) => {
      const mealType = meal.meal_type || 'snack'
      if (!acc[mealType]) acc[mealType] = []
      acc[mealType].push(meal)
      return acc
    }, {} as Record<string, MealWithItems[]>)

    // Create meal type cards for main meals
    const mainMealTypes = ['breakfast', 'lunch', 'dinner']
    const mainMealCards = mainMealTypes.map(type => ({
      type,
      meals: grouped[type] || [],
      isPlaceholder: !grouped[type] || grouped[type].length === 0
    }))

    // Create snack cards - group all snacks together
    const snackMeals = grouped['snack'] || []
    const snackCards = [{
      type: 'snack',
      meals: snackMeals,
      isPlaceholder: snackMeals.length === 0
    }]

    return { mainMealCards, snackCards }
  }

  const { mainMealCards, snackCards } = groupMealsByType()

  const handleConvertToYesterday = async () => {
    if (!hasContentToMove) return
    
    let confirmMessage = 'Move content from today to yesterday?\n\nThis will:\n'
    if (hasMealsToday) {
      confirmMessage += `• Move all ${meals.length} meals to yesterday\n`
    }
    if (hasChatMessagesToday) {
      confirmMessage += `• Move all ${todaysChatMessages.length} chat messages to yesterday\n`
    }
    confirmMessage += '• Clear today for a fresh start\n• This action cannot be undone'
    
    const confirmed = confirm(confirmMessage)
    
    if (!confirmed) return
    
    setIsConverting(true)
    try {
      const result = await convertToYesterday.mutateAsync(user.id)
      
      if (result.success && (result.movedMealsCount > 0 || result.movedMessagesCount > 0)) {
        let message = `Successfully moved ${result.movedMealsCount} meals`
        if (result.movedMessagesCount > 0) {
          message += ` and ${result.movedMessagesCount} chat messages`
        }
        message += ' to yesterday!'
        alert(message)
        onMealUpdated?.() // Refresh the meals data
      } else {
        alert('No meals or chat messages found to move.')
      }
    } catch (error) {
      console.error('Error converting meals to yesterday:', error)
      alert('Failed to move meals. Please try again.')
    } finally {
      setIsConverting(false)
    }
  }

  return (
    <div className="relative w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center gap-3 sm:gap-4">
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Meals</h2>
          <div className="flex gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {meals.filter(m => m.status === 'logged').length}
              </span>
              <span>logged</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="font-medium">
                {meals.filter(m => m.status === 'planned').length}
              </span>
              <span>planned</span>
            </div>
          </div>
        </div>
        
        {/* Convert to Yesterday Button - show for today with meals or chat messages */}
        {isToday && hasContentToMove && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleConvertToYesterday}
            disabled={isConverting}
            className="h-8 text-xs px-3 gap-1.5 border-orange-200 text-orange-700 hover:bg-orange-50 hover:border-orange-300"
            title="Move today's meals and chat messages to yesterday and start fresh"
          >
            <RotateCcw className="h-3 w-3" />
            {isConverting ? 'Moving...' : 'Convert to Yesterday'}
          </Button>
        )}
      </div>

      {/* Main Meals Row (Breakfast, Lunch, Dinner) */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Main Meals</h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left', mainMealScrollRef)}
              className="h-6 w-6"
          >
              <ChevronLeft className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
              onClick={() => scroll('right', mainMealScrollRef)}
              className="h-6 w-6"
          >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
        <div className="relative overflow-hidden">
          <div
            ref={mainMealScrollRef}
            className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {mainMealCards.map((mealCard) => (
              <CarouselCard
                key={mealCard.type}
                mealType={mealCard.type}
                meals={mealCard.meals}
                isPlaceholder={mealCard.isPlaceholder}
                onMealUpdated={onMealUpdated}
                onMealDeleted={onMealDeleted}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Snacks Row */}
      <div className="relative mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-700">Snacks</h3>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left', snackScrollRef)}
              className="h-6 w-6"
            >
              <ChevronLeft className="h-3 w-3" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right', snackScrollRef)}
              className="h-6 w-6"
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          </div>
        </div>
        
      <div className="relative overflow-hidden">
        <div
            ref={snackScrollRef}
          className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-hide pb-2"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
            {snackCards.map((mealCard, index) => (
            <CarouselCard
                key={`snack-${index}`}
                mealType={mealCard.type}
                meals={mealCard.meals}
                isPlaceholder={mealCard.isPlaceholder}
              onMealUpdated={onMealUpdated}
              onMealDeleted={onMealDeleted}
            />
          ))}
          </div>
        </div>
      </div>

      {/* Progress Stats */}
      <div className="mt-3 sm:mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-blue-50 rounded-lg">
          <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
          <div className="text-sm sm:text-base font-bold text-gray-900">{roundedTotals.calories}</div>
          <div className="text-xs text-gray-500">Calories</div>
        </div>
        
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-green-50 rounded-lg">
          <Beef className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
          <div className="text-sm sm:text-base font-bold text-gray-900">{roundedTotals.protein}g</div>
          <div className="text-xs text-gray-500">Protein</div>
        </div>
        
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-orange-50 rounded-lg">
          <Wheat className="h-4 w-4 sm:h-5 sm:w-5 text-orange-600" />
          <div className="text-sm sm:text-base font-bold text-gray-900">{roundedTotals.carbs}g</div>
          <div className="text-xs text-gray-500">Carbs</div>
        </div>
        
        <div className="flex items-center gap-2 p-2 sm:p-3 bg-purple-50 rounded-lg">
          <Droplets className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
          <div className="text-sm sm:text-base font-bold text-gray-900">{roundedTotals.fat}g</div>
          <div className="text-xs text-gray-500">Fat</div>
        </div>
      </div>
    </div>
  )
} 