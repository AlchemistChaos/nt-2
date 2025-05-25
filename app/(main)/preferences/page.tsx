'use client'

import { useCurrentUser, useUserPreferences } from '@/lib/supabase/client-cache'
import { PreferencesPageClient } from './PreferencesPageClient'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function OptimizedPreferencesPage() {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser()
  const { data: preferences = [], isLoading: preferencesLoading } = useUserPreferences(user?.id || '')

  // Handle authentication redirect
  useEffect(() => {
    if (!userLoading && !user && !userError) {
      redirect('/login')
    }
  }, [user, userLoading, userError])

  // Show loading state while fetching user data
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your preferences...</p>
        </div>
      </div>
    )
  }

  // Handle auth error or no user
  if (!user) {
    return null // Will redirect via useEffect
  }

  return (
    <PreferencesPageClient 
      user={user}
      initialPreferences={preferences}
    />
  )
} 