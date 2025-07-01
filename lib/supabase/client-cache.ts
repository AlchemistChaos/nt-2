import { createBrowserClient } from '@supabase/ssr'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { User, Preference, MealWithItems, ChatMessage, DailyTarget, Brand, Biometric, Goal, BrandMenuItem } from '@/types'

// Create a singleton Supabase client for browser use
let supabaseClient: ReturnType<typeof createBrowserClient> | null = null

export function getSupabaseClient() {
  if (!supabaseClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    
    supabaseClient = createBrowserClient(supabaseUrl, supabaseAnonKey)
  }
  
  return supabaseClient
}

// Query keys for consistent caching
export const queryKeys = {
  user: ['user'] as const,
  preferences: (userId: string) => ['preferences', userId] as const,
  todaysMeals: (userId: string) => ['todaysMeals', userId] as const,
  mealsForDate: (userId: string, date: string) => ['mealsForDate', userId, date] as const,
  chatMessages: (userId: string, date: string, limit: number) => ['chatMessages', userId, date, limit] as const,
  dailyTarget: (userId: string) => ['dailyTarget', userId] as const,
  dailyTargetForDate: (userId: string, date: string) => ['dailyTargetForDate', userId, date] as const,
  userDays: (userId: string) => ['userDays', userId] as const,
  brands: ['brands'] as const,
  latestBiometric: (userId: string) => ['latestBiometric', userId] as const,
  activeGoal: (userId: string) => ['activeGoal', userId] as const,
  brandMenuItems: (brandId: string) => ['brandMenuItems', brandId] as const,
}

// Client-side data fetching hooks with caching
export function useCurrentUser() {
  const queryClient = useQueryClient()
  
  const query = useQuery({
    queryKey: queryKeys.user,
    queryFn: async (): Promise<User | null> => {
      const supabase = getSupabaseClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      
      if (!authUser) return null

      const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('auth_user_id', authUser.id)
        .single()

      return user
    },
    staleTime: 1 * 60 * 1000, // 1 minute (shorter for auth)
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry if it's an auth error
      if (error && typeof error === 'object' && 'code' in error) {
        return false
      }
      return failureCount < 2
    }
  })

  // Set up auth state listener to invalidate user query
  useEffect(() => {
    const supabase = getSupabaseClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        queryClient.invalidateQueries({ queryKey: queryKeys.user })
      }
    })

    return () => subscription.unsubscribe()
  }, [queryClient])

  return query
}

export function useUserPreferences(userId: string) {
  return useQuery({
    queryKey: queryKeys.preferences(userId),
    queryFn: async (): Promise<Preference[]> => {
      const supabase = getSupabaseClient()
      const { data: preferences } = await supabase
        .from('preferences')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      return preferences || []
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useTodaysMeals(userId: string) {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return useMealsForDate(userId, todayString)
}

export function useMealsForDate(userId: string, date: string) {
  return useQuery({
    queryKey: queryKeys.mealsForDate(userId, date),
    queryFn: async (): Promise<MealWithItems[]> => {
      const timestamp = new Date().toISOString()
      console.log(`🔍 useMealsForDate query executing at ${timestamp} for:`, { userId, date })
      const supabase = getSupabaseClient()
      
      const { data: meals, error } = await supabase
        .from('meals')
        .select(`
          *,
          meal_items (*)
        `)
        .eq('user_id', userId)
        .eq('date', date)
        .order('logged_at', { ascending: true })

      if (error) {
        console.error('❌ Error fetching meals:', error)
        throw error
      }

      console.log(`📊 useMealsForDate fetched ${meals?.length || 0} meals at ${timestamp}:`, 
        meals?.map(m => ({ id: m.id, name: m.meal_name, type: m.meal_type })) || []
      )
      return meals || []
    },
    enabled: !!userId && !!date,
    staleTime: 30 * 1000, // 30 seconds - allows optimistic updates to work
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useChatMessages(userId: string, date: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.chatMessages(userId, date, limit),
    queryFn: async (): Promise<ChatMessage[]> => {
      const supabase = getSupabaseClient()
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .order('created_at', { ascending: false })
        .limit(limit)

      return (messages || []).reverse()
    },
    enabled: !!userId && !!date,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}

export function useTodaysDailyTarget(userId: string, options?: { enabled?: boolean }) {
  const today = new Date()
  const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  return useDailyTargetForDate(userId, todayString, options)
}

export function useDailyTargetForDate(userId: string, date: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.dailyTargetForDate(userId, date),
    queryFn: async (): Promise<DailyTarget | null> => {
      const supabase = getSupabaseClient()
      
      const { data: target } = await supabase
        .from('daily_targets')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .eq('is_accepted', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return target
    },
    enabled: (options?.enabled ?? true) && !!userId && !!date,
    staleTime: 5 * 60 * 1000, // 5 minutes (targets don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useUserDays(userId: string) {
  return useQuery({
    queryKey: queryKeys.userDays(userId),
    queryFn: async (): Promise<string[]> => {
      const supabase = getSupabaseClient()
      
      // Get unique dates from meals and chat_messages
      const [mealsResult, chatResult] = await Promise.all([
        supabase
          .from('meals')
          .select('date')
          .eq('user_id', userId)
          .order('date', { ascending: false }),
        supabase
          .from('chat_messages')
          .select('date')
          .eq('user_id', userId)
          .order('date', { ascending: false })
      ])

      const mealDates = new Set(mealsResult.data?.map((m: any) => m.date as string) || [])
      const chatDates = new Set(chatResult.data?.map((c: any) => c.date as string) || [])
      
      // Combine and deduplicate dates
      const allDates = new Set([...mealDates, ...chatDates])
      
      // Always include today, even if no data exists yet
      const today = new Date()
      const todayString = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      allDates.add(todayString)
      
      // Convert to array and sort (most recent first)
      const datesArray: string[] = Array.from(allDates) as string[]
      const sortedDates = datesArray.sort((a, b) => b.localeCompare(a))
      

      
      return sortedDates
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute (shorter to catch new days faster)
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useLatestBiometric(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.latestBiometric(userId),
    queryFn: async (): Promise<Biometric | null> => {
      const supabase = getSupabaseClient()
      const { data: biometric } = await supabase
        .from('biometrics')
        .select('*')
        .eq('user_id', userId)
        .order('recorded_at', { ascending: false })
        .limit(1)
        .single()

      return biometric
    },
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

export function useActiveGoal(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.activeGoal(userId),
    queryFn: async (): Promise<Goal | null> => {
      const supabase = getSupabaseClient()
      const { data: goal } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      return goal
    },
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Mutation hooks for data updates
export function useAddPreference() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, type, foodName, notes }: {
      userId: string
      type: string
      foodName: string
      notes?: string
    }) => {
      const supabase = getSupabaseClient()
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
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch preferences
      queryClient.invalidateQueries({ queryKey: queryKeys.preferences(variables.userId) })
    },
  })
}

export function useAddMeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, mealData }: {
      userId: string
      mealData: any
    }) => {
      const supabase = getSupabaseClient()
      const { data: meal } = await supabase
        .from('meals')
        .insert({
          user_id: userId,
          ...mealData
        })
        .select()
        .single()

      return meal
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch today's meals
      queryClient.invalidateQueries({ queryKey: queryKeys.todaysMeals(variables.userId) })
    },
  })
}

export function useDeleteMeal() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ mealId, userId, date }: {
      mealId: string
      userId: string
      date: string
    }) => {
      console.log('🗑️ Deleting meal:', { mealId, userId, date })
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('meals')
        .delete()
        .eq('id', mealId)

      if (error) {
        console.error('Error deleting meal:', error)
        throw error
      }

      console.log('✅ Meal deleted successfully from database')
      return true
    },
    onMutate: async ({ mealId, userId, date }) => {
      // Cancel any outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.mealsForDate(userId, date) })
      
      // Snapshot the previous value
      const previousMeals = queryClient.getQueryData(queryKeys.mealsForDate(userId, date))
      
      // Optimistically update to remove the meal
      queryClient.setQueryData(
        queryKeys.mealsForDate(userId, date),
        (old: MealWithItems[] = []) => old.filter(meal => meal.id !== mealId)
      )
      
      console.log('🔄 Optimistically removed meal from UI')
      
      // Return a context object with the snapshotted value
      return { previousMeals }
    },
    onError: (_err, { userId, date }, context) => {
      // If the mutation fails, use the context returned from onMutate to roll back
      queryClient.setQueryData(queryKeys.mealsForDate(userId, date), context?.previousMeals)
      console.error('❌ Meal deletion failed, rolled back UI changes')
    },
    onSettled: (_data, _error, variables) => {
      // Delay the final refresh to allow optimistic update to be visible
      setTimeout(() => {
        console.log('🔄 Refreshing meal data after deletion (delayed)')
        queryClient.invalidateQueries({ queryKey: queryKeys.mealsForDate(variables.userId, variables.date) })
        queryClient.invalidateQueries({ queryKey: queryKeys.todaysMeals(variables.userId) })
        queryClient.invalidateQueries({ queryKey: queryKeys.userDays(variables.userId) })
      }, 500)
    }
  })
}

export function useAddChatMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, role, content, date }: {
      userId: string
      role: 'user' | 'assistant'
      content: string
      date?: string // Optional, defaults to today
    }) => {
      const supabase = getSupabaseClient()
      const messageDate = date || (() => {
        const today = new Date()
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      })()
      
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
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch chat messages for the message date
      const messageDate = variables.date || (() => {
        const today = new Date()
        return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
      })()
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(variables.userId, messageDate, 20) })
      // Also invalidate user days to update the sidebar
      queryClient.invalidateQueries({ queryKey: queryKeys.userDays(variables.userId) })
    },
  })
}

export function useClearChatMessages() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, date }: {
      userId: string
      date: string
    }) => {
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('user_id', userId)
        .eq('date', date)

      if (error) {
        console.error('Error clearing chat messages:', error)
        throw error
      }

      return true
    },
    onSuccess: (_data, variables) => {
      // Invalidate chat messages for the specific date
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(variables.userId, variables.date, 20) })
      // Also invalidate user days in case this was the last day with messages
      queryClient.invalidateQueries({ queryKey: queryKeys.userDays(variables.userId) })
    },
    onError: (error) => {
      console.error('useClearChatMessages onError called:', error)
    }
  })
}

export function useConvertMealsToYesterday() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (userId: string) => {
      const response = await fetch('/api/convert-to-yesterday', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to convert meals')
      }

      return await response.json()
    },
    onSuccess: (data, userId) => {
      // Invalidate queries for both today and yesterday to refresh the UI
      const today = new Date().toISOString().split('T')[0]
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      
      // Invalidate meals for both dates
      queryClient.invalidateQueries({ queryKey: queryKeys.mealsForDate(userId, today) })
      queryClient.invalidateQueries({ queryKey: queryKeys.mealsForDate(userId, yesterday) })
      
      // Invalidate chat messages for both dates  
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(userId, today, 20) })
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(userId, yesterday, 20) })
      
      // Also invalidate user days to update the sidebar
      queryClient.invalidateQueries({ queryKey: queryKeys.userDays(userId) })
      
      console.log(
        `Successfully moved ${data.movedMealsCount} meals and ${data.movedMessagesCount} chat messages to yesterday`
      )
    },
  })
}

// Quick Add Library hooks
export function useBrands(options?: { enabled?: boolean }) {
  const supabase = getSupabaseClient()
  return useQuery<Brand[]>({
    queryKey: queryKeys.brands,
    queryFn: async () => {
      const cacheBuster = Date.now();
      console.log(`[useBrands queryFn DEBUG] START - Fetching brands. CacheBuster: ${cacheBuster}. Simplified select.`);
      const { data, error } = await supabase
        .from('brands')
        .select('*')
        .order('name', { ascending: true })
        .order('id', { ascending: true });

      if (error) {
        console.error('[useBrands queryFn DEBUG] ERROR - Error fetching brands:', error);
        throw error;
      }
      const logData = data?.map((b: Brand) => ({ id: b.id, name: b.name, type: b.type }));
      console.log('[useBrands queryFn DEBUG] SUCCESS - Fetched brands data (simplified):', logData);
      console.log(`[useBrands queryFn DEBUG] Fetched ${data?.length || 0} brands.`);
      return data || [];
    },
    enabled: options?.enabled ?? true,
  });
}





export function useBrandMenuItems(brandId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: queryKeys.brandMenuItems(brandId),
    queryFn: async (): Promise<BrandMenuItem[]> => {
      const supabase = getSupabaseClient()
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
    },
    enabled: (options?.enabled ?? true) && !!brandId,
    staleTime: 5 * 60 * 1000, // 5 minutes (brand menu items don't change often)
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Brand mutations

export function useCreateBrand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (brandData: Omit<Brand, 'id' | 'created_at' | 'updated_at'>) => {
      const supabase = getSupabaseClient()
      const { data: brand } = await supabase
        .from('brands')
        .insert(brandData)
        .select()
        .single()

      return brand
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands })
    },
  })
}

export function useUpdateBrand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ brandId, brandData }: {
      brandId: string
      brandData: Partial<Omit<Brand, 'id' | 'created_at' | 'updated_at'>>
    }) => {
      console.log('useUpdateBrand mutation called with:', { brandId, brandData })
      const supabase = getSupabaseClient()
      const { data: brand, error } = await supabase
        .from('brands')
        .update(brandData)
        .eq('id', brandId)
        .select()
        .single()

      if (error) {
        console.error('Supabase error updating brand:', error)
        throw error
      }

      console.log('Brand updated successfully:', brand)
      return brand
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.brands })
      queryClient.invalidateQueries({ queryKey: ['brandMenuItems'] })
    },
  })
}

export function useDeleteBrand() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (brandId: string) => {
      console.log('useDeleteBrand mutation called with brandId:', brandId)
      const supabase = getSupabaseClient()
      
      // Check if there are any brand menu items using this brand
      const { data: menuItemsUsingBrand, error: checkError } = await supabase
        .from('brand_menu_items')
        .select('id')
        .eq('brand_id', brandId)
        .limit(1)

      if (checkError) {
        console.error('Error checking for menu items using brand:', checkError)
        throw checkError
      }

      if (menuItemsUsingBrand && menuItemsUsingBrand.length > 0) {
        throw new Error('Cannot delete brand that has menu items. Please delete the menu items first.')
      }

      const { error } = await supabase
        .from('brands')
        .delete()
        .eq('id', brandId)

      if (error) {
        console.error('Supabase error deleting brand:', error)
        throw error
      }

      console.log('Brand deleted from database')
      return true
    },
    onSuccess: () => {
      console.log('useDeleteBrand onSuccess called, invalidating queries')
      // Invalidate brands and related queries
      queryClient.invalidateQueries({ queryKey: ['brands'] })
      queryClient.invalidateQueries({ queryKey: ['brandStats'] })
      queryClient.invalidateQueries({ queryKey: ['brandMenuItems'] })
    },
    onError: (error) => {
      console.error('useDeleteBrand onError called:', error)
    }
  })
}

export function useBrandStats(userId: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['brandStats', userId],
    queryFn: async (): Promise<Record<string, { itemCount: number; totalUsage: number }>> => {
      const supabase = getSupabaseClient()
      const { data: items } = await supabase
        .from('brand_menu_items')
        .select('brand_id')
        .not('brand_id', 'is', null)

      const stats: Record<string, { itemCount: number; totalUsage: number }> = {}
      
      if (items) {
        items.forEach((item: { brand_id: string | null }) => {
          if (item.brand_id) {
            if (!stats[item.brand_id]) {
              stats[item.brand_id] = { itemCount: 0, totalUsage: 0 }
            }
            stats[item.brand_id].itemCount++
            // No usage tracking for brand menu items, just count
            stats[item.brand_id].totalUsage = 0
          }
        })
      }

      return stats
    },
    enabled: (options?.enabled ?? true) && !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

// Brand menu items mutations
export function useCreateBrandMenuItems() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, brandId, items, importSource, batchId }: {
      userId: string
      brandId: string
      items: Omit<BrandMenuItem, 'id' | 'brand_id' | 'imported_by' | 'created_at' | 'updated_at'>[]
      importSource: 'csv' | 'image' | 'manual'
      batchId?: string
    }) => {
      console.log('useCreateBrandMenuItems mutation called with:', { userId, brandId, itemCount: items.length, importSource })
      const supabase = getSupabaseClient()
      
      const importBatchId = batchId || crypto.randomUUID()
      
      const { data: menuItems, error } = await supabase
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

      if (error) {
        console.error('Supabase error creating brand menu items:', error)
        throw error
      }

      console.log('Brand menu items created in database:', menuItems?.length, 'items')
      return menuItems || []
    },
    onSuccess: (data, variables) => {
      console.log('useCreateBrandMenuItems onSuccess called, invalidating queries for brandId:', variables.brandId)
      console.log('Query key being invalidated:', queryKeys.brandMenuItems(variables.brandId))
      queryClient.invalidateQueries({ queryKey: queryKeys.brandMenuItems(variables.brandId) })
      // Also invalidate the general brands query to update counts
      queryClient.invalidateQueries({ queryKey: queryKeys.brands })
    },
    onError: (error) => {
      console.error('useCreateBrandMenuItems onError called:', error)
    }
  })
}

export function useUpdateBrandMenuItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ itemId, itemData }: {
      itemId: string
      itemData: Partial<Omit<BrandMenuItem, 'id' | 'brand_id' | 'imported_by' | 'created_at' | 'updated_at'>>
    }) => {
      console.log('useUpdateBrandMenuItem mutation called with:', { itemId, itemData })
      const supabase = getSupabaseClient()
      
      const { data: updatedItem, error } = await supabase
        .from('brand_menu_items')
        .update(itemData)
        .eq('id', itemId)
        .select(`
          *,
          brand:brands(*)
        `)
        .single()

      if (error) {
        console.error('Supabase error updating brand menu item:', error)
        throw error
      }

      console.log('Brand menu item updated successfully:', updatedItem)
      return updatedItem
    },
    onSuccess: (data) => {
      if (data?.brand_id) {
        console.log('useUpdateBrandMenuItem onSuccess called, invalidating queries for brandId:', data.brand_id)
        queryClient.invalidateQueries({ queryKey: queryKeys.brandMenuItems(data.brand_id) })
      }
      
      // Also invalidate brands query to update any counts
      queryClient.invalidateQueries({ queryKey: queryKeys.brands })
    },
    onError: (error) => {
      console.error('useUpdateBrandMenuItem onError called:', error)
    }
  })
} 