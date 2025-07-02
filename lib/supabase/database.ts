import { createClient } from './server'
import { User, Preference, Meal, MealItem, ChatMessage, MealWithItems, Biometric, Goal, DailyTarget, Brand, BrandMenuItem } from '@/types'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient()
  
  console.log('🔍 getCurrentUser: Getting auth user from Supabase...')
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
  
  if (authError) {
    console.error('❌ getCurrentUser: Auth error:', authError)
    return null
  }
  
  if (!authUser) {
    console.log('❌ getCurrentUser: No authenticated user found')
    return null
  }
  
  console.log('✅ getCurrentUser: Auth user found:', { id: authUser.id, email: authUser.email })

  console.log('🔍 getCurrentUser: Looking up user in users table...')
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()

  if (userError) {
    console.error('❌ getCurrentUser: Error fetching user from users table:', userError)
    return null
  }
  
  if (!user) {
    console.log('❌ getCurrentUser: No user found in users table for auth_user_id:', authUser.id)
    return null
  }
  
  console.log('✅ getCurrentUser: User found in users table:', { id: user.id, auth_user_id: user.auth_user_id })
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
  
  console.log('🔍 addMeal called with:', { userId, mealData })
  
  const { data: meal, error } = await supabase
    .from('meals')
    .insert({
      user_id: userId,
      ...mealData
    })
    .select()
    .single()

  if (error) {
    console.error('💥 Database error in addMeal:', error)
    console.error('💥 Failed meal data:', { userId, mealData })
    console.error('💥 Error details:', error.message, error.code)
    return null
  }

  console.log('✅ Meal saved successfully to database:', meal)
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
  content: string,
  date?: string
): Promise<ChatMessage | null> {
  const supabase = await createClient()
  
  // Use provided date or current date
  const messageDate = date || new Date().toISOString().split('T')[0]
  
  const { data: message } = await supabase
    .from('chat_messages')
    .insert({
      user_id: userId,
      role,
      content,
      date: messageDate
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

// Brand functions
export async function getAllBrands(): Promise<Brand[]> {
  const supabase = await createClient()
  
  const { data: brands } = await supabase
    .from('brands')
    .select('*')
    .order('name', { ascending: true })

  return brands || []
}

export async function getBrandByName(name: string): Promise<Brand | null> {
  const supabase = await createClient()
  
  const { data: brand } = await supabase
    .from('brands')
    .select('*')
    .ilike('name', name)
    .single()

  return brand
}

export async function createBrand(
  name: string,
  type: string,
  description?: string
): Promise<Brand | null> {
  const supabase = await createClient()
  
  const { data: brand } = await supabase
    .from('brands')
    .insert({
      name,
      type,
      description
    })
    .select()
    .single()

  return brand
}

export async function createBrandIfNotExists(
  name: string,
  type: string,
  description?: string
): Promise<Brand> {
  let brand = await getBrandByName(name)
  
  if (!brand) {
    brand = await createBrand(name, type, description)
    if (!brand) {
      throw new Error(`Failed to create brand: ${name}`)
    }
  }
  
  return brand
}

// Brand menu items functions
export async function getBrandMenuItems(brandId: string): Promise<BrandMenuItem[]> {
  const supabase = await createClient()
  
  const { data: items } = await supabase
    .from('brand_menu_items')
    .select(`
      *,
      brand:brands(*)
    `)
    .eq('brand_id', brandId)
    .eq('is_available', true)
    .order('category', { ascending: true })
    .order('name', { ascending: true })

  return items || []
}

export async function createBrandMenuItems(
  userId: string,
  brandId: string,
  items: Omit<BrandMenuItem, 'id' | 'brand_id' | 'imported_by' | 'created_at' | 'updated_at'>[],
  importSource: 'csv' | 'image' | 'manual',
  batchId?: string
): Promise<BrandMenuItem[]> {
  const supabase = await createClient()
  
  const importBatchId = batchId || crypto.randomUUID()
  
  const { data: menuItems } = await supabase
    .from('brand_menu_items')
    .insert(
      items.map(item => ({
        brand_id: brandId,
        imported_by: userId,
        import_source: importSource,
        import_batch_id: importBatchId,
        ...item
      }))
    )
    .select(`
      *,
      brand:brands(*)
    `)

  return menuItems || []
}

export async function updateBrandMenuItem(
  itemId: string,
  updates: Partial<BrandMenuItem>
): Promise<BrandMenuItem | null> {
  const supabase = await createClient()
  
  const { data: item } = await supabase
    .from('brand_menu_items')
    .update(updates)
    .eq('id', itemId)
    .select(`
      *,
      brand:brands(*)
    `)
    .single()

  return item
}

export async function deleteBrandMenuItem(itemId: string): Promise<boolean> {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('brand_menu_items')
    .delete()
    .eq('id', itemId)

  return !error
}

export async function searchBrandMenuItems(query: string): Promise<BrandMenuItem[]> {
  const supabase = await createClient()
  
  const { data: items } = await supabase
    .from('brand_menu_items')
    .select(`
      *,
      brand:brands(*)
    `)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .eq('is_available', true)
    .order('name', { ascending: true })
    .limit(20)

  return items || []
}

export async function convertMealsToDate(
  userId: string, 
  fromDate: string, 
  toDate: string
): Promise<{ movedCount: number; meals: Meal[] }> {
  const supabase = await createClient()
  
  // First, get all meals for the source date
  const { data: mealsToMove, error: fetchError } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', userId)
    .eq('date', fromDate)

  if (fetchError) {
    console.error('Error fetching meals to move:', fetchError)
    throw new Error('Failed to fetch meals')
  }

  if (!mealsToMove || mealsToMove.length === 0) {
    return { movedCount: 0, meals: [] }
  }

  // Update all meals to the new date
  const { data: updatedMeals, error: updateError } = await supabase
    .from('meals')
    .update({ date: toDate })
    .eq('user_id', userId)
    .eq('date', fromDate)
    .select()

  if (updateError) {
    console.error('Error updating meal dates:', updateError)
    throw new Error('Failed to move meals to new date')
  }

  return { 
    movedCount: updatedMeals?.length || 0, 
    meals: updatedMeals || [] 
  }
}

export async function convertTodaysToYesterday(userId: string): Promise<{ 
  movedMealsCount: number; 
  movedMessagesCount: number;
  meals: Meal[];
  messages: ChatMessage[];
}> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  
  // Move meals to yesterday
  const mealResult = await convertMealsToDate(userId, today, yesterday)
  
  // Also move chat messages to yesterday
  const { data: messagesToMove, error: fetchMessagesError } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)

  if (fetchMessagesError) {
    console.error('Error fetching chat messages to move:', fetchMessagesError)
    throw new Error('Failed to fetch chat messages')
  }

  let movedMessages: ChatMessage[] = []
  
  if (messagesToMove && messagesToMove.length > 0) {
    // Update all chat messages to yesterday's date
    const { data: updatedMessages, error: updateMessagesError } = await supabase
      .from('chat_messages')
      .update({ date: yesterday })
      .eq('user_id', userId)
      .eq('date', today)
      .select()

    if (updateMessagesError) {
      console.error('Error updating chat message dates:', updateMessagesError)
      throw new Error('Failed to move chat messages to new date')
    }

    movedMessages = updatedMessages || []
  }
  
  return { 
    movedMealsCount: mealResult.movedCount,
    movedMessagesCount: movedMessages.length,
    meals: mealResult.meals,
    messages: movedMessages
  }
} 