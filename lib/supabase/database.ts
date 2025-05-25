import { createClient } from './server'
import { User, Preference, Meal, MealItem, ChatMessage, MealWithItems, Biometric, Goal, DailyTarget } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  
  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  return user
}

export async function getUserPreferences(userId: string): Promise<Preference[]> {
  const supabase = await createClient()
  
  const { data: preferences } = await supabase
    .from('preferences')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return preferences || []
}

export async function addUserPreference(
  userId: string,
  type: string,
  foodName: string,
  notes?: string
): Promise<Preference | null> {
  const supabase = await createClient()
  
  const { data: preference } = await supabase
    .from('preferences')
    .insert({
      user_id: userId,
      type,
      food_name: foodName,
      notes
    })
    .select()
    .single()

  return preference
}

export async function getTodaysMeals(userId: string): Promise<MealWithItems[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: meals } = await supabase
    .from('meals')
    .select(`
      *,
      meal_items (*)
    `)
    .eq('user_id', userId)
    .eq('date', today)
    .order('logged_at', { ascending: true })

  return meals || []
}

export async function addMeal(
  userId: string,
  mealData: Partial<Meal>
): Promise<Meal | null> {
  const supabase = await createClient()
  
  const { data: meal } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      ...mealData
    })
    .select()
    .single()

  return meal
}

export async function updateMeal(
  mealId: string,
  updates: Partial<Meal>
): Promise<Meal | null> {
  const supabase = await createClient()
  
  const { data: meal } = await supabase
    .from('meals')
    .update(updates)
    .eq('id', mealId)
    .select()
    .single()

  return meal
}

export async function deleteMeal(mealId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('meals')
    .delete()
    .eq('id', mealId)

  return !error
}

export async function addMealItems(
  mealId: string,
  items: Omit<MealItem, 'id' | 'meal_id' | 'created_at'>[]
): Promise<MealItem[]> {
  const supabase = await createClient()
  
  const { data: mealItems } = await supabase
    .from('meal_items')
    .insert(
      items.map(item => ({
        meal_id: mealId,
        ...item
      }))
    )
    .select()

  return mealItems || []
}

export async function getChatMessages(userId: string, limit: number = 10): Promise<ChatMessage[]> {
  const supabase = await createClient()
  
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (messages || []).reverse()
}

export async function addChatMessage(
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage | null> {
  const supabase = await createClient()
  
  const { data: message } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role,
      content
    })
    .select()
    .single()

  return message
}

// Biometrics functions
export async function getUserBiometrics(userId: string): Promise<Biometric[]> {
  const supabase = await createClient()
  
  const { data: biometrics } = await supabase
    .from('biometrics')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })

  return biometrics || []
}

export async function getLatestBiometric(userId: string): Promise<Biometric | null> {
  const supabase = await createClient()
  
  const { data: biometric } = await supabase
    .from('biometrics')
    .select('*')
    .eq('user_id', userId)
    .order('recorded_at', { ascending: false })
    .limit(1)
    .single()

  return biometric
}

export async function addBiometric(
  userId: string,
  biometricData: Omit<Biometric, 'id' | 'user_id' | 'created_at'>
): Promise<Biometric | null> {
  const supabase = await createClient()
  
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

// Goals functions
export async function getUserGoals(userId: string): Promise<Goal[]> {
  const supabase = await createClient()
  
  const { data: goals } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  return goals || []
}

export async function getActiveGoal(userId: string): Promise<Goal | null> {
  const supabase = await createClient()
  
  const { data: goal } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return goal
}

export async function addGoal(
  userId: string,
  goalData: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>
): Promise<Goal | null> {
  const supabase = await createClient()
  
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

export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>
): Promise<Goal | null> {
  const supabase = await createClient()
  
  const { data: goal } = await supabase
    .from('goals')
    .update(updates)
    .eq('id', goalId)
    .select()
    .single()

  return goal
}

// Daily targets functions
export async function getTodaysDailyTarget(userId: string): Promise<DailyTarget | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  
  const { data: target } = await supabase
    .from('daily_targets')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  return target
}

export async function addDailyTarget(
  userId: string,
  targetData: Omit<DailyTarget, 'id' | 'user_id' | 'created_at'>
): Promise<DailyTarget | null> {
  const supabase = await createClient()
  
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

export async function acceptDailyTarget(userId: string, date: string): Promise<DailyTarget | null> {
  const supabase = await createClient()
  
  const { data: target } = await supabase
    .from('daily_targets')
    .update({ is_accepted: true })
    .eq('user_id', userId)
    .eq('date', date)
    .select()
    .single()

  return target
} 