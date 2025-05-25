import { redirect } from 'next/navigation'
import { getCurrentUser, getUserPreferences } from '@/lib/supabase/database'
import { PreferencesPageClient } from './PreferencesPageClient'

// Force dynamic rendering to avoid build-time issues
export const dynamic = 'force-dynamic'

export default async function PreferencesPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  const preferences = await getUserPreferences(user.id)

  return (
    <PreferencesPageClient 
      user={user}
      initialPreferences={preferences}
    />
  )
} 