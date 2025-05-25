// Date utility functions for day navigation

export function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  // Reset time to compare just dates
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate())

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today'
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday'
  } else {
    // Format as DD/MM/YYYY
    const day = date.getDate().toString().padStart(2, '0')
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const year = date.getFullYear()
    return `${day}/${month}/${year}`
  }
}

// Helper function to format date in local timezone as YYYY-MM-DD
function formatDateToLocalString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getTodayDateString(): string {
  return formatDateToLocalString(new Date())
}

export function getYesterdayDateString(): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return formatDateToLocalString(yesterday)
}

export function isToday(dateString: string): boolean {
  return dateString === getTodayDateString()
}

export function isPastDate(dateString: string): boolean {
  const date = new Date(dateString)
  const today = new Date()
  
  // Reset time to compare just dates
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  
  return dateOnly.getTime() < todayOnly.getTime()
} 