import { createClient } from './client'
import { Meal, Biometric, Goal, DailyTarget, SavedItem, Brand, SupplementSchedule } from '@/types'

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

// Quick Add Library client functions
export async function createSavedItemClient(itemData: Omit<SavedItem, 'id' | 'times_used' | 'created_at' | 'updated_at'>): Promise<SavedItem | null> {
  const supabase = createClient()
  
  const { data: item } = await supabase
    .from('saved_items')
    .insert({
      ...itemData,
      times_used: 0
    })
    .select(`
      *,
      brand:brands(*)
    `)
    .single()

  return item
}

export async function updateSavedItemClient(itemId: string, updates: Partial<SavedItem>): Promise<SavedItem | null> {
  const supabase = createClient()
  
  const { data: item } = await supabase
    .from('saved_items')
    .update(updates)
    .eq('id', itemId)
    .select(`
      *,
      brand:brands(*)
    `)
    .single()

  return item
}

export async function deleteSavedItemClient(itemId: string): Promise<boolean> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('saved_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Error deleting saved item:', error)
    return false
  }

  return true
}

export async function createBrandClient(brandData: Omit<Brand, 'id' | 'created_at' | 'updated_at'>): Promise<Brand | null> {
  const supabase = createClient()
  
  const { data: brand } = await supabase
    .from('brands')
    .insert(brandData)
    .select()
    .single()

  return brand
}

export async function updateItemUsageClient(itemId: string): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase.rpc('update_item_usage', {
    item_id: itemId
  })

  if (error) {
    console.error('Error updating item usage:', error)
  }
}

export async function createSupplementScheduleClient(scheduleData: Omit<SupplementSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<SupplementSchedule | null> {
  const supabase = createClient()
  
  const { data: schedule } = await supabase
    .from('supplement_schedules')
    .insert(scheduleData)
    .select(`
      *,
      saved_item:saved_items(
        *,
        brand:brands(*)
      )
    `)
    .single()

  return schedule
} 