import { createClient } from './server'
import { User, Preference, Meal, MealItem, ChatMessage, MealWithItems } from '@/types'

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