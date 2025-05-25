import { createClient } from './client'
import { Meal, Biometric, Goal, DailyTarget } from '@/types'

export async function updateMeal(
  mealId: string,
  updates: Partial<Meal>
): Promise<Meal | null> {
  const supabase = createClient()
  
  const { data: meal, error } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single()

  if (error) {
    console.error('Error updating meal:', error)
    return null
  }

  return meal
}

export async function deleteMeal(mealId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)

  if (error) {
    console.error('Error deleting meal:', error)
    return false
  }

  return true
}

// Client-side database functions for goals page
export async function addBiometricClient(
  userId: string,
  biometricData: Omit<Biometric, 'id' | 'user_id' | 'created_at'>
): Promise<Biometric | null> {
  const supabase = createClient()
  
  const { data: biometric } = await supabase
    .from('biometrics')
    .insert({
      user_id: userId,
      ...biometricData
    })
    .select()
    .single()

  return biometric
}

export async function addGoalClient(
  userId: string,
  goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Goal | null> {
  const supabase = createClient()
  
  // Deactivate existing goals first
  await supabase
    .from('goals')
    .update({ is_active: false })
    .eq('user_id', userId)
    .eq('is_active', true)
  
  const { data: goal } = await supabase
    .from('goals')
    .insert({
      user_id: userId,
      ...goalData
    })
    .select()
    .single()

  return goal
}

export async function addDailyTargetClient(
  userId: string,
  targetData: Omit<DailyTarget, 'id' | 'user_id' | 'created_at'>
): Promise<DailyTarget | null> {
  const supabase = createClient()
  
  const { data: target } = await supabase
    .from('daily_targets')
    .upsert({
      user_id: userId,
      ...targetData
    })
    .select()
    .single()

  return target
}

export async function getTodaysDailyTargetClient(userId: string): Promise<DailyTarget | null> {
  const supabase = createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: target } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('is_accepted', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return target
} 