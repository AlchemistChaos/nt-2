'use client'

import { useEffect, useState } from 'react'
import { Clock, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DayTransitionNotificationProps {
  show: boolean
  onDismiss: () => void
  newDate: string
}

export function DayTransitionNotification({ 
  show, 
  onDismiss, 
  newDate 
}: DayTransitionNotificationProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (show) {
      setIsVisible(true)
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false)
        setTimeout(onDismiss, 300) // Wait for animation to complete
      }, 5000)

      return () => clearTimeout(timer)
    }
  }, [show, onDismiss])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(onDismiss, 300) // Wait for animation to complete
  }

  if (!show) return null

  return (
    <div className="fixed top-4 right-4 z-50">
      <div
        className={cn(
          "bg-green-50 border border-green-200 rounded-lg p-4 shadow-lg max-w-sm transition-all duration-300",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <Clock className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-green-800">
              Welcome to a new day! 🌅
            </h3>
            <p className="text-sm text-green-700 mt-1">
              You've been automatically switched to today's chat. Start logging your meals and tracking your nutrition!
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="flex-shrink-0 h-6 w-6 text-green-600 hover:text-green-800 hover:bg-green-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 