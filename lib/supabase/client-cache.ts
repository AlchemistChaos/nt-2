import { createBrowserClient } from '@supabase/ssr'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { User, Preference, MealWithItems, ChatMessage, DailyTarget } from '@/types'

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