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
