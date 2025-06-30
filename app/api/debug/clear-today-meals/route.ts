import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()
    const today = new Date().toISOString().split('T')[0]

    // Delete today's meals for the current user
    const { data: deletedMeals, error } = await supabase
      .from('meals')
      .delete()
      .eq('user_id', user.id)
      .eq('date', today)
      .select()

    if (error) {
      console.error('Error deleting meals:', error)
      return NextResponse.json({ error: 'Failed to delete meals' }, { status: 500 })
    }

    console.log(`Deleted ${deletedMeals?.length || 0} meals for user ${user.id} on ${today}`)

    return NextResponse.json({ 
      message: `Successfully deleted ${deletedMeals?.length || 0} meals for today`,
      deletedMeals: deletedMeals || []
    })

  } catch (error) {
    console.error('Clear meals error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 