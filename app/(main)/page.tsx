'use client'

import { useCurrentUser, useTodaysMeals, useChatMessages } from '@/lib/supabase/client-cache'
import { MainPageClient } from './MainPageClient'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'
import { getTodayDateString } from '@/lib/utils/date'

export default function OptimizedMainPage() {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser()
  const { data: todaysMeals = [] } = useTodaysMeals(user?.id || '')
  const today = getTodayDateString()
  const { data: chatMessages = [] } = useChatMessages(user?.id || '', today, 20)

  // Handle authentication redirect
  useEffect(() => {
    if (!userLoading && !user && !userError) {
      // Use window.location for more reliable redirect in production
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      } else {
        redirect('/login')
      }
    }
  }, [user, userLoading, userError])

  // Show loading state while fetching user data
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your nutrition dashboard...</p>
        </div>
      </div>
    )
  }

  // Handle auth error or no user
  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <MainPageClient 
      user={user}
      initialMeals={todaysMeals}
      initialMessages={chatMessages}
    />
  )
} 