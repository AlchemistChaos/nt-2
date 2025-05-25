import { getCurrentUser } from '@/lib/supabase/database'
import { GoalsPageClient } from './GoalsPageClient'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function GoalsPage() {
  const user = await getCurrentUser()
  
  if (!user) {
    redirect('/login')
  }

  // For now, use null values until we run the database migration
  const latestBiometric = null
  const activeGoal = null
  const todayTarget = null

  return (
    <GoalsPageClient 
      user={user}
      initialBiometric={latestBiometric}
      initialGoal={activeGoal}
      initialDailyTarget={todayTarget}
    />
  )
} 