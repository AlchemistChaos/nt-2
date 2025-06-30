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

    const { mealId, newMealType } = await request.json()

    if (!mealId || !newMealType) {
      return NextResponse.json({ error: 'Missing mealId or newMealType' }, { status: 400 })
    }

    const supabase = await createClient()

    // Update the meal type
    const { data: updatedMeal, error } = await supabase
      .from('meals')
      .update({ meal_type: newMealType })
      .eq('id', mealId)
      .eq('user_id', user.id) // Ensure user can only update their own meals
      .select()
      .single()

    if (error) {
      console.error('Error updating meal type:', error)
      return NextResponse.json({ error: 'Failed to update meal type' }, { status: 500 })
    }

    console.log(`Updated meal ${mealId} to meal_type: ${newMealType} for user ${user.id}`)

    return NextResponse.json({ 
      message: `Successfully updated meal type to ${newMealType}`,
      updatedMeal: updatedMeal
    })

  } catch (error) {
    console.error('Fix meal type error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 