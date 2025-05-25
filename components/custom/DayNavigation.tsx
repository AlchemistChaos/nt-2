'use client'

import { useUserDays } from '@/lib/supabase/client-cache'
import { formatDateForDisplay, getTodayDateString } from '@/lib/utils/date'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

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
  const today = getTodayDateString()

  // Ensure today is always in the list
  const allDays = userDays.includes(today) ? userDays : [today, ...userDays]

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
          {allDays.slice(0, 5).map((date) => (
            <Button
              key={date}
              variant={selectedDate === date ? "default" : "ghost"}
              size="icon"
              onClick={() => onDateSelect(date)}
              className="w-8 h-8 text-xs"
              title={formatDateForDisplay(date)}
            >
              <Calendar className="h-3 w-3" />
            </Button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="font-semibold text-gray-900">Days</h2>
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
              const displayName = formatDateForDisplay(date)
              
              return (
                <Button
                  key={date}
                  variant={isSelected ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start text-left h-auto py-3 px-3",
                    isSelected && "bg-blue-600 text-white hover:bg-blue-700",
                    !isSelected && "hover:bg-gray-100"
                  )}
                  onClick={() => onDateSelect(date)}
                >
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{displayName}</span>
                    <span className="text-xs opacity-70">
                      {date === today ? 'Current day' : date}
                    </span>
                  </div>
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onDateSelect(today)}
          className="w-full"
          disabled={selectedDate === today}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Go to Today
        </Button>
      </div>
    </div>
  )
} 