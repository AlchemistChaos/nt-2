import { redirect } from 'next/navigation'
import { getCurrentUser, getTodaysMeals, getChatMessages } from '@/lib/supabase/database'
import { MainPageClient } from './MainPageClient'

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'

export default async function MainPage() {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      redirect('/login')
    }

    // Get initial data with error handling
    const [todaysMeals, chatMessages] = await Promise.all([
      getTodaysMeals(user.id).catch(() => []),
      getChatMessages(user.id, 20).catch(() => [])
    ])

    return (
      <MainPageClient 
        user={user}
        initialMeals={todaysMeals}
        initialMessages={chatMessages}
      />
    )
  } catch (error) {
    // During build time or if there's an auth error, redirect to login
    console.error('Main page error:', error)
    redirect('/login')
  }
} 