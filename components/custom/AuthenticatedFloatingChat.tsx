'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FloatingChatButton } from './FloatingChatButton'
import { usePathname } from 'next/navigation'

export function AuthenticatedFloatingChat() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const pathname = usePathname()
  
  // Don't show on login page
  const isLoginPage = pathname === '/login'
  
  useEffect(() => {
    const checkAuth = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    
    checkAuth()
    
    // Listen for auth changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session?.user)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])
  
  // Only show if authenticated and not on login page
  if (!isAuthenticated || isLoginPage) {
    return null
  }
  
  return <FloatingChatButton />
} 