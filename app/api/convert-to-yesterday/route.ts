import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, convertTodaysToYesterday } from '@/lib/supabase/database'

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Convert today's meals to yesterday
    const result = await convertTodaysToYesterday(user.id)

    return NextResponse.json({
      success: true,
      movedCount: result.movedCount,
      meals: result.meals
    })

  } catch (error) {
    console.error('Convert to yesterday error:', error)
    return NextResponse.json({ 
      error: 'Failed to convert meals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 