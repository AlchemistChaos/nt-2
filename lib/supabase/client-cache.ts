import { createBrowserClient } from '@supabase/ssr'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Preference, MealWithItems, ChatMessage, DailyTarget, Brand, SavedItem, SupplementSchedule } from '@/types'

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
  chatMessages: (userId: string, limit: number) => ['chatMessages', userId, limit] as const,
  dailyTarget: (userId: string) => ['dailyTarget', userId] as const,
  brands: ['brands'] as const,
  savedItems: (userId: string) => ['savedItems', userId] as const,
  supplementSchedules: (userId: string) => ['supplementSchedules', userId] as const,
}

// Client-side data fetching hooks with caching
export function useCurrentUser() {
  return useQuery({
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
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
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
  return useQuery({
    queryKey: queryKeys.todaysMeals(userId),
    queryFn: async (): Promise<MealWithItems[]> => {
      const supabase = getSupabaseClient()
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
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds (meals change frequently)
    gcTime: 2 * 60 * 1000, // 2 minutes
  })
}

export function useChatMessages(userId: string, limit: number = 10) {
  return useQuery({
    queryKey: queryKeys.chatMessages(userId, limit),
    queryFn: async (): Promise<ChatMessage[]> => {
      const supabase = getSupabaseClient()
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)

      return (messages || []).reverse()
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000, // 3 minutes
  })
}

export function useTodaysDailyTarget(userId: string) {
  return useQuery({
    queryKey: queryKeys.dailyTarget(userId),
    queryFn: async (): Promise<DailyTarget | null> => {
      const supabase = getSupabaseClient()
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
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes (targets don't change often)
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

export function useAddChatMessage() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, role, content }: {
      userId: string
      role: 'user' | 'assistant'
      content: string
    }) => {
      const supabase = getSupabaseClient()
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
    },
    onSuccess: (_data, variables) => {
      // Invalidate and refetch chat messages
      queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(variables.userId, 20) })
    },
  })
}

// Quick Add Library hooks
export function useBrands() {
  return useQuery({
    queryKey: queryKeys.brands,
    queryFn: async (): Promise<Brand[]> => {
      const supabase = getSupabaseClient()
      const { data: brands } = await supabase
        .from('brands')
        .select('*')
        .order('name')

      return brands || []
    },
    staleTime: 10 * 60 * 1000, // 10 minutes (brands don't change often)
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}

export function useSavedItems(userId: string) {
  return useQuery({
    queryKey: queryKeys.savedItems(userId),
    queryFn: async (): Promise<SavedItem[]> => {
      const supabase = getSupabaseClient()
      const { data: items } = await supabase
        .from('saved_items')
        .select(`
          *,
          brand:brands(*)
        `)
        .eq('user_id', userId)
        .order('times_used', { ascending: false })

      return items || []
    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  })
}

export function useSupplementSchedules(userId: string) {
  return useQuery({
    queryKey: queryKeys.supplementSchedules(userId),
    queryFn: async (): Promise<SupplementSchedule[]> => {
      const supabase = getSupabaseClient()
      const { data: schedules } = await supabase
        .from('supplement_schedules')
        .select(`
          *,
          saved_item:saved_items(
            *,
            brand:brands(*)
          )
        `)
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      return schedules || []
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}

// Quick Add Library mutations
export function useCreateSavedItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ userId, itemData }: {
      userId: string
      itemData: Omit<SavedItem, 'id' | 'user_id' | 'times_used' | 'created_at' | 'updated_at'>
    }) => {
      console.log('useCreateSavedItem mutation called with:', { userId, itemData })
      const supabase = getSupabaseClient()
      const { data: item, error } = await supabase
        .from('saved_items')
        .insert({
          user_id: userId,
          ...itemData,
          times_used: 0
        })
        .select(`
          *,
          brand:brands(*)
        `)
        .single()

      if (error) {
        console.error('Supabase error creating saved item:', error)
        throw error
      }

      console.log('Saved item created in database:', item)
      return item
    },
    onSuccess: (data, variables) => {
      console.log('useCreateSavedItem onSuccess called, invalidating queries for userId:', variables.userId)
      queryClient.invalidateQueries({ queryKey: queryKeys.savedItems(variables.userId) })
    },
    onError: (error) => {
      console.error('useCreateSavedItem onError called:', error)
    }
  })
}

export function useUpdateSavedItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async ({ itemId, itemData }: {
      itemId: string
      itemData: Partial<Omit<SavedItem, 'id' | 'user_id' | 'times_used' | 'created_at' | 'updated_at'>>
    }) => {
      console.log('useUpdateSavedItem mutation called with:', { itemId, itemData })
      const supabase = getSupabaseClient()
      const { data: item, error } = await supabase
        .from('saved_items')
        .update(itemData)
        .eq('id', itemId)
        .select(`
          *,
          brand:brands(*)
        `)
        .single()

      if (error) {
        console.error('Supabase error updating saved item:', error)
        throw error
      }

      console.log('Saved item updated in database:', item)
      return item
    },
    onSuccess: (data) => {
      console.log('useUpdateSavedItem onSuccess called, invalidating queries for user')
      // Invalidate saved items for all users since we don't have userId here
      queryClient.invalidateQueries({ queryKey: ['savedItems'] })
    },
    onError: (error) => {
      console.error('useUpdateSavedItem onError called:', error)
    }
  })
}

export function useDeleteSavedItem() {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: async (itemId: string) => {
      console.log('useDeleteSavedItem mutation called with itemId:', itemId)
      const supabase = getSupabaseClient()
      const { error } = await supabase
        .from('saved_items')
        .delete()
        .eq('id', itemId)

      if (error) {
        console.error('Supabase error deleting saved item:', error)
        throw error
      }

      console.log('Saved item deleted from database')
      return true
    },
    onSuccess: () => {
      console.log('useDeleteSavedItem onSuccess called, invalidating queries')
      // Invalidate saved items for all users since we don't have userId here
      queryClient.invalidateQueries({ queryKey: ['savedItems'] })
    },
    onError: (error) => {
      console.error('useDeleteSavedItem onError called:', error)
    }
  })
}

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