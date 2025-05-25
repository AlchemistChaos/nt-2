'use client'

import { useCurrentUser } from '@/lib/supabase/client-cache'
import { LibraryPageClient } from './LibraryPageClient'
import { redirect } from 'next/navigation'
import { useEffect } from 'react'

export default function OptimizedLibraryPage() {
  const { data: user, isLoading: userLoading, error: userError } = useCurrentUser()

  // Handle authentication redirect
  useEffect(() => {
    if (!userLoading && !user && !userError) {
      redirect('/login')
    }
  }, [user, userLoading, userError])

  // Show loading state while fetching user data
  if (userLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your library...</p>
        </div>
      </div>
    )
  }

  // Handle auth error or no user
  if (!user) {
    return null // Will redirect via useEffect
  }

  return <LibraryPageClient user={user} />
} 