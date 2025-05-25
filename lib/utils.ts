import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  })
}

export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function getMealTypeFromTime(): string {
  const hour = new Date().getHours()
  
  if (hour >= 5 && hour < 11) {
    return 'breakfast'
  } else if (hour >= 11 && hour < 16) {
    return 'lunch'
  } else if (hour >= 16 && hour < 22) {
    return 'dinner'
  } else {
    return 'snack'
  }
}

export function getMealTimeOrder(mealType: string): number {
  const mealTimes = {
    'breakfast': 8,  // 8:00 AM
    'lunch': 12,     // 12:00 PM  
    'dinner': 18,    // 6:00 PM
    'snack': 999     // Default for snacks (will be sorted by actual time)
  }
  return mealTimes[mealType as keyof typeof mealTimes] || 999
}

export function sortMealsByTime<T extends { meal_type?: string; logged_at?: string }>(meals: T[]): T[] {
  return meals.sort((a, b) => {
    const aOrder = getMealTimeOrder(a.meal_type || 'snack')
    const bOrder = getMealTimeOrder(b.meal_type || 'snack')
    
    // If both are snacks, sort by actual logged time
    if (aOrder === 999 && bOrder === 999) {
      if (!a.logged_at || !b.logged_at) return 0
      return new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    }
    
    // Otherwise sort by meal time order
    return aOrder - bOrder
  })
}
