import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, convertTodaysToYesterday } from '@/lib/supabase/database'

export async function POST(request: NextRequest) {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Convert today's meals and chat messages to yesterday
    const result = await convertTodaysToYesterday(user.id)

    console.log(
      `Converted ${result.movedMealsCount} meals and ${result.movedMessagesCount} chat messages to yesterday for user ${user.id}`
    )

    return NextResponse.json({
      success: true,
      movedMealsCount: result.movedMealsCount,
      movedMessagesCount: result.movedMessagesCount,
      meals: result.meals,
      messages: result.messages
    })

  } catch (error) {
    console.error('Convert to yesterday error:', error)
    return NextResponse.json({ 
      error: 'Failed to convert meals',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 