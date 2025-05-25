import { createClient } from './client'
import { Meal } from '@/types'

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