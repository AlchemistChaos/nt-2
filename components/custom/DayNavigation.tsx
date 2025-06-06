'use client'

import { useUserDays } from '@/lib/supabase/client-cache'
import { formatDateForDisplay, getTodayDateString } from '@/lib/utils/date'
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface DayNavigationProps {
  userId: string
  selectedDate: string
  onDateSelect: (date: string) => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function DayNavigation({ 
  userId, 
  selectedDate, 
  onDateSelect, 
  isCollapsed, 
  onToggleCollapse 
}: DayNavigationProps) {
  const { data: userDays = [], isLoading } = useUserDays(userId)
  const [currentToday, setCurrentToday] = useState(getTodayDateString())

  // Update today's date periodically to handle day transitions
  useEffect(() => {
    const updateToday = () => {
      const newToday = getTodayDateString()
      if (newToday !== currentToday) {
        setCurrentToday(newToday)
      }
    }

    // Check every minute for day changes
    const interval = setInterval(updateToday, 60 * 1000)
    
    // Also check when window regains focus
    const handleFocus = () => updateToday()
    window.addEventListener('focus', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
    }
  }, [currentToday])

  // Ensure today is always at the top of the list, even if no data exists yet
  const allDays = (() => {
    // Start with user days (which come from database)
    let days = [...userDays]
    
    // Remove today from the list if it exists (we'll add it at the top)
    days = days.filter(day => day !== currentToday)
    
    // Always put today at the top
    days.unshift(currentToday)
    
    // Sort the remaining days (excluding today) in descending order (newest first)
    const todayAtTop = days[0] // Save today
    const otherDays = days.slice(1).sort((a, b) => b.localeCompare(a))
    const finalDays = [todayAtTop, ...otherDays]
    
    return finalDays
  })()

  if (isCollapsed) {
    return (
      <div className="w-12 bg-gray-50 border-r border-gray-200 flex flex-col">
        <div className="p-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleCollapse}
            className="w-8 h-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 flex flex-col items-center gap-2 p-2">
          {allDays.slice(0, 5).map((date) => {
            const isToday = date === currentToday
            const isSelected = selectedDate === date
            
            return (
              <Button
                key={date}
                variant={isSelected ? "default" : "ghost"}
                size="icon"
                onClick={() => onDateSelect(date)}
                className={cn(
                  "w-8 h-8 text-xs relative",
                  isToday && !isSelected && "ring-2 ring-blue-200"
                )}
                title={formatDateForDisplay(date)}
              >
                {isToday ? (
                  <Clock className="h-3 w-3" />
                ) : (
                  <Calendar className="h-3 w-3" />
                )}
                {isToday && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />
                )}
              </Button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-end">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleCollapse}
          className="w-8 h-8"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Days List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-400 mx-auto mb-2"></div>
            Loading days...
          </div>
        ) : allDays.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No days yet. Start by logging a meal or sending a message!
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {allDays.map((date) => {
              const isSelected = selectedDate === date
              const isToday = date === currentToday
              const displayName = formatDateForDisplay(date)
              
              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 px-3 relative transition-all duration-200",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700 shadow-md",
                    !isSelected && isToday && "bg-green-50 border border-green-200 hover:bg-green-100 hover:border-green-300",
                    !isSelected && !isToday && "hover:bg-gray-100 hover:shadow-sm"
                  )}
                  onClick={() => onDateSelect(date)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <div className="flex-shrink-0">
                      {isToday ? (
                        <Clock className="h-4 w-4 text-green-600" />
                      ) : (
                        <Calendar className="h-4 w-4 text-gray-400" />
                      )}
                    </div>
                    <div className="flex flex-col items-start flex-1 min-w-0">
                      <span className={cn(
                        "font-medium truncate",
                        isToday && !isSelected && "text-green-700"
                      )}>
                        {displayName}
                      </span>
                      <span className={cn(
                        "text-xs opacity-70 truncate",
                        isToday && !isSelected && "text-green-600"
                      )}>
                        {isToday ? 'Current day' : `${date} • Click to view`}
                      </span>
                    </div>
                    {isToday && !isSelected && (
                      <div className="flex-shrink-0 w-2 h-2 bg-green-500 rounded-full" />
                    )}
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </div>


    </div>
  )
} 