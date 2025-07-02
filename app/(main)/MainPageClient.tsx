'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, MealWithItems, ChatMessage } from '@/types'
import { CustomMealCarousel } from '@/components/custom/CustomMealCarousel'
import { ChatMessage as ChatMessageComponent } from '@/components/custom/ChatMessage'
import { ImageUploadButton } from '@/components/custom/ImageUploadButton'
import { DayNavigation } from '@/components/custom/DayNavigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, LogOut, Settings, Target, BookOpen, Clock, Calendar, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMealsForDate, useChatMessages, useDailyTargetForDate, queryKeys, useClearChatMessages } from '@/lib/supabase/client-cache'
import { useQueryClient } from '@tanstack/react-query'
import { getTodayDateString, isPastDate, formatDateForDisplay } from '@/lib/utils/date'

interface MainPageClientProps {
  user: User
  initialMeals: MealWithItems[]
  initialMessages: ChatMessage[]
}

export function MainPageClient({ user }: MainPageClientProps) {
  // Date navigation state
  const [selectedDate, setSelectedDate] = useState(getTodayDateString())
  // Start with sidebar collapsed on mobile, expanded on desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  
  // Use React Query for date-aware data fetching
  const { data: meals = [], isLoading: mealsLoading, error: mealsError } = useMealsForDate(user.id, selectedDate)
  
  // Debug UI query key
  console.log(`🔍 UI Query Key:`, queryKeys.mealsForDate(user.id, selectedDate))
  console.log(`📊 UI Meals Data:`, meals)
  console.log(`👤 User ID:`, user.id)
  console.log(`📅 Selected Date:`, selectedDate)
  const { data: cachedMessages = [], isLoading: messagesLoading } = useChatMessages(user.id, selectedDate, 20)
  const { data: dailyTarget } = useDailyTargetForDate(user.id, selectedDate)
  

  const queryClient = useQueryClient()
  const clearChatMessages = useClearChatMessages()
  
  // Use local state for real-time updates, but sync with cached messages
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  // Check if current date is in the past (read-only mode)
  const isReadOnly = isPastDate(selectedDate)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      // Auto-expand sidebar on desktop (lg breakpoint = 1024px)
      if (window.innerWidth >= 1024) {
        setSidebarCollapsed(false)
      } else {
        setSidebarCollapsed(true)
      }
    }

    // Set initial state
    handleResize()

    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Track if we should auto-scroll (only for new messages, not when loading)
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false)

  // Simple message sync - only sync when date changes to prevent infinite loops
  const prevSelectedDate = useRef<string>(selectedDate)
  
  useEffect(() => {
      // Only sync when date actually changes
  if (selectedDate !== prevSelectedDate.current) {
    setMessages(cachedMessages)
    prevSelectedDate.current = selectedDate
    setShouldAutoScroll(false) // Don't auto-scroll when switching dates
  }
}, [selectedDate]) // Only depend on selectedDate to prevent loops

// Initialize messages on first load if empty
useEffect(() => {
  if (messages.length === 0 && cachedMessages.length > 0) {
    setMessages(cachedMessages)
  }
}, [cachedMessages.length]) // Only depend on length to avoid infinite loops

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Only auto-scroll when we explicitly want to (for new messages during active chat)
  useEffect(() => {
    if (shouldAutoScroll) {
      scrollToBottom()
      setShouldAutoScroll(false)
    }
  }, [messages, shouldAutoScroll])

  const refreshMeals = async () => {
    const currentDateQueryKey = queryKeys.mealsForDate(user.id, selectedDate)
    const todayQueryKey = queryKeys.todaysMeals(user.id)
    
    console.log('🔄 refreshMeals called for:', { 
      userId: user.id, 
      selectedDate, 
      currentDateQueryKey, 
      todayQueryKey 
    })
    
    try {
      // 1. Remove queries to force fresh fetch
      queryClient.removeQueries({ queryKey: currentDateQueryKey })
      if (selectedDate === getTodayDateString()) {
        queryClient.removeQueries({ queryKey: todayQueryKey })
      }
      console.log('🗑️ Removed cached queries')
      
      // 2. Invalidate and refetch in parallel for better performance
      const promises = [
        queryClient.invalidateQueries({ queryKey: currentDateQueryKey }),
        queryClient.refetchQueries({ queryKey: currentDateQueryKey }),
        queryClient.invalidateQueries({ queryKey: queryKeys.userDays(user.id) })
      ]
      
      // Only invalidate today's meals if we're on today's date
      if (selectedDate === getTodayDateString()) {
        promises.push(
          queryClient.invalidateQueries({ queryKey: todayQueryKey }),
          queryClient.refetchQueries({ queryKey: todayQueryKey })
        )
      }
      
      await Promise.all(promises)
      console.log('✅ refreshMeals completed successfully')
      
    } catch (error) {
      console.error('❌ Error in refreshMeals:', error)
      throw error
    }
  }

  const refreshMessages = async () => {
    // Use React Query to invalidate and refetch chat messages for selected date
    await queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(user.id, selectedDate, 20) })
  }

  const handleClearChat = async () => {
    if (!confirm('Clear all chat messages for this day? This cannot be undone.')) {
      return
    }

    try {
      await clearChatMessages.mutateAsync({
        userId: user.id,
        date: selectedDate
      })
      // Clear local messages immediately for better UX
      setMessages([])
    } catch (error) {
      console.error('Error clearing chat messages:', error)
      alert('Failed to clear chat messages. Please try again.')
    }
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handlePrefetchLibrary = () => {
    // Prefetch brands data when user hovers over library button
    queryClient.prefetchQuery({
      queryKey: queryKeys.brands,
      queryFn: async () => {
        const supabase = createClient()
        const { data: brands } = await supabase
          .from('brands')
          .select('*')
          .order('name')
        return brands || []
      },
      staleTime: 2 * 60 * 1000, // 2 minutes
    })
  }

  const handlePrefetchGoals = () => {
    // Prefetch goals data when user hovers over goals button
    queryClient.prefetchQuery({
      queryKey: queryKeys.latestBiometric(user.id),
      queryFn: async () => {
        const supabase = createClient()
        const { data: biometric } = await supabase
          .from('biometrics')
          .select('*')
          .eq('user_id', user.id)
          .order('recorded_at', { ascending: false })
          .limit(1)
          .single()
        return biometric
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })

    queryClient.prefetchQuery({
      queryKey: queryKeys.activeGoal(user.id),
      queryFn: async () => {
        const supabase = createClient()
        const { data: goal } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
        return goal
      },
      staleTime: 5 * 60 * 1000, // 5 minutes
    })
  }

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage) return

    setIsLoading(true)
    const messageToSend = inputMessage.trim()
    const imageToSend = selectedImage

    // Clear input immediately
    setInputMessage('')
    setSelectedImage(null)

    // Add user message to UI
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      user_id: user.id,
      role: 'user',
      content: messageToSend,
      date: selectedDate,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMessage])
    // Auto-scroll for new user messages
    setShouldAutoScroll(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          image: imageToSend,
          clientDate: selectedDate // Pass client's selected date to ensure consistency
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      // Handle streaming response
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      let assistantMessage = ''

      // Add empty assistant message that we'll update
      const assistantMessageId = Date.now().toString() + '_assistant'
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        user_id: user.id,
        role: 'assistant',
        content: '',
        date: selectedDate,
        created_at: new Date().toISOString()
      }])
      // Auto-scroll for new assistant messages
      setShouldAutoScroll(true)

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') {
                // Refresh messages cache when streaming is complete
                await refreshMessages()
                
                // Also force a final meal refresh in case any actions were processed
                // This ensures the UI is updated even if individual action refreshes failed
                setTimeout(async () => {
                  try {
                    console.log('🔄 Final meal refresh after streaming complete')
                    await refreshMeals()
                  } catch (error) {
                    console.error('❌ Final meal refresh failed:', error)
                  }
                }, 100)
                break
              }

              try {
                const parsed = JSON.parse(data)
                
                if (parsed.content) {
                  assistantMessage += parsed.content
                  setMessages(prev => prev.map(msg => 
                    msg.id === assistantMessageId 
                      ? { ...msg, content: assistantMessage }
                      : msg
                  ))
                  // Auto-scroll as assistant message is being streamed
                  setShouldAutoScroll(true)
                }

                if (parsed.action) {
                  // Handle actions (meal logged, preference updated, etc.)
                  console.log('🎬 ACTION RECEIVED:', parsed.action)
                  
                  // Handle different action types
                  switch (parsed.action.type) {
                    case 'meal_logged':
                    case 'meal_planned':
                    case 'meal_updated':
                      console.log('🔄 TRIGGERING MEAL REFRESH for action:', parsed.action.type)
                      console.log('📊 Action data received:', parsed.action.data)
                      
                      // Optimistically add meals to cache immediately
                      const actionData = parsed.action.data
                      const mealsToAdd = Array.isArray(actionData) ? actionData : [actionData]
                      
                      console.log('🚀 Adding meals optimistically to cache:', mealsToAdd.length, 'meals')
                      
                      // Add each meal to the React Query cache optimistically
                      mealsToAdd.forEach((meal: any) => {
                        if (meal && meal.id) {
                          console.log(`➕ Adding meal optimistically: ${meal.meal_name} (${meal.meal_type})`)
                          console.log(`🗓️ Meal date: ${meal.date}, Selected date: ${selectedDate}`)
                          const cacheUpdateKey = queryKeys.mealsForDate(user.id, selectedDate)
                          const uiQueryKey = queryKeys.mealsForDate(user.id, selectedDate)
                          console.log(`🔑 Cache update key:`, cacheUpdateKey)
                          console.log(`🔑 UI query key:`, uiQueryKey)
                          console.log(`🔑 Keys match:`, JSON.stringify(cacheUpdateKey) === JSON.stringify(uiQueryKey))
                          
                          // Check current cache state
                          const currentCacheData = queryClient.getQueryData(queryKeys.mealsForDate(user.id, selectedDate))
                          console.log(`📦 Current cache data:`, currentCacheData)
                          
                          queryClient.setQueryData(
                            queryKeys.mealsForDate(user.id, selectedDate),
                            (old: any[] = []) => {
                              console.log(`📊 Old cache data:`, old)
                              // Check if meal already exists to avoid duplicates
                              const exists = old.some(existingMeal => existingMeal.id === meal.id)
                              if (exists) {
                                console.log(`⚠️ Meal ${meal.id} already exists, skipping duplicate`)
                                return old
                              }
                              const newData = [...old, meal]
                              console.log(`✅ Added meal ${meal.meal_name} to cache, new data:`, newData)
                              return newData
                            }
                          )
                          
                          // Verify the update worked
                          const updatedCacheData = queryClient.getQueryData(queryKeys.mealsForDate(user.id, selectedDate))
                          console.log(`🔍 Updated cache data:`, updatedCacheData)
                          console.log(`✅ Optimistic update completed without invalidation`)
                        }
                      })
                      
                      // Also do a single refresh to ensure data consistency (delayed to avoid conflicts)
                      setTimeout(async () => {
                        try {
                          console.log('🔄 Final data consistency refresh (after optimistic updates)')
                          await refreshMeals()
                          console.log('✅ Final refresh completed')
                        } catch (error) {
                          console.error('❌ Final refresh failed:', error)
                        }
                      }, 2000)
                      break
                      
                    case 'preference_updated':
                      console.log('🔄 Preference updated, no refresh needed')
                      break
                      
                    case 'error':
                      console.error('❌ Action processing error received:', parsed.action.error)
                      break
                      
                    default:
                      console.log('ℹ️ Unknown action type:', parsed.action.type)
                      break
                  }
                }
              } catch {
                // Ignore parsing errors for incomplete chunks
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      // Add error message
      setMessages(prev => [...prev, {
        id: Date.now().toString() + '_error',
        user_id: user.id,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        date: selectedDate,
        created_at: new Date().toISOString()
      }])
      // Auto-scroll for error messages
      setShouldAutoScroll(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isReadOnly) {
        handleSendMessage()
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex relative">
      {/* Mobile Overlay */}
      {!sidebarCollapsed && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}

      {/* Day Navigation Sidebar */}
      <div className={`${sidebarCollapsed ? '' : 'fixed lg:relative'} z-50 lg:z-auto`}>
        <DayNavigation
          userId={user.id}
          selectedDate={selectedDate}
          onDateSelect={setSelectedDate}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-3 sm:px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0">
              {/* Logo moved to replace mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="h-8 w-8 lg:hidden"
                title="Toggle navigation"
              >
                🥗
              </Button>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Today</h1>
              <span className="text-xs sm:text-sm text-gray-500 hidden sm:block">Welcome, {user.name || user.email}</span>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/library')}
                title="Quick Add Library"
                onMouseEnter={handlePrefetchLibrary}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/goals')}
                title="Goals & Profile"
                onMouseEnter={handlePrefetchGoals}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <Target className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push('/preferences')}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              {/* Temporary debug button to clear today's meals */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Clear all of today\'s meals? This cannot be undone.')) {
                      try {
                        const response = await fetch('/api/debug/clear-today-meals', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' }
                        })
                        const result = await response.json()
                        if (response.ok) {
                          alert(result.message)
                          await refreshMeals()
                        } else {
                          alert('Error: ' + result.error)
                        }
                      } catch (error) {
                        alert('Error clearing meals: ' + error)
                      }
                    }
                  }}
                  className="h-8 text-xs px-2"
                  title="Clear today's meals (dev only)"
                >
                  🗑️ Clear
                </Button>
              )}
              {/* Debug button to log current meals */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('📊 Current meals from UI:', meals)
                    console.log('📊 Current date:', selectedDate)
                    console.log('📊 Is today:', selectedDate === getTodayDateString())
                    alert(`Found ${meals.length} meals. Check console for details.`)
                  }}
                  className="h-8 text-xs px-2"
                  title="Log current meals to console (dev only)"
                >
                  🔍 Debug
                </Button>
              )}
              {/* Fix banana bread meal type */}
              {process.env.NODE_ENV === 'development' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    const bananaBreakfastMeal = meals.find(m => 
                      m.meal_name?.toLowerCase().includes('banana bread') && 
                      m.meal_type === 'breakfast'
                    )
                    
                    if (bananaBreakfastMeal) {
                      try {
                        const response = await fetch('/api/debug/fix-meal-type', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            mealId: bananaBreakfastMeal.id,
                            newMealType: 'dinner'
                          })
                        })
                        
                        if (response.ok) {
                          alert('Fixed! Banana bread moved to dinner.')
                          await refreshMeals()
                        } else {
                          alert('Error fixing meal')
                        }
                      } catch (error) {
                        alert('Error: ' + error)
                      }
                    } else {
                      alert('No banana bread breakfast meal found to fix')
                    }
                  }}
                  className="h-8 text-xs px-2"
                  title="Fix banana bread meal type (dev only)"
                >
                  🍌 Fix
                </Button>
              )}
                <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="h-8 w-8 sm:h-10 sm:w-10"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Meal Carousel Section - Full Width Background */}
        <div className="bg-white border-b border-gray-200 w-full">
          <div className="max-w-7xl mx-auto p-3 sm:p-6">
            <CustomMealCarousel 
              meals={meals} 
              dailyTarget={dailyTarget || null}
              user={user}
              selectedDate={selectedDate}
              onMealUpdated={refreshMeals}
              onMealDeleted={refreshMeals}
            />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Chat Section */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-0">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessageComponent key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* Input Area - Full Width */}
        <div className="border-t border-gray-200 bg-white p-3 sm:p-4 w-full">
          <div className="w-full">
            {isReadOnly ? (
              <div className="mb-3 p-2 sm:p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm text-yellow-800">
                    📅 You&apos;re viewing {formatDateForDisplay(selectedDate)}. You can view past data but cannot send new messages.
                  </span>
                </div>
              </div>
            ) : null}
            
            {selectedImage && !isReadOnly && (
              <div className="mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm text-gray-600">Image selected</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedImage(null)}
                    className="h-7 w-auto px-2 text-xs"
                  >
                    Remove
                  </Button>
                </div>
              </div>
            )}
            
            <div className="flex items-end gap-2 sm:gap-3">
              <div className="flex-1">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={isReadOnly 
                    ? `Viewing ${formatDateForDisplay(selectedDate)} - Switch to today to send messages`
                    : "Ask about nutrition, log a meal, or upload a food photo..."
                  }
                  disabled={isLoading || isReadOnly}
                  className="min-h-[44px] text-sm sm:text-base w-full"
                />
              </div>
              
              {messages.length > 0 && (
                <Button
                  onClick={handleClearChat}
                  disabled={clearChatMessages.isPending}
                  size="icon"
                  variant="outline"
                  className="h-11 w-11 text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Clear chat messages"
                >
                  <Trash2 className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              )}
              
              {!isReadOnly && (
                <ImageUploadButton
                  onImageSelect={setSelectedImage}
                  disabled={isLoading}
                />
              )}
              
              <Button
                onClick={handleSendMessage}
                disabled={isLoading || (!inputMessage.trim() && !selectedImage) || isReadOnly}
                size="icon"
                className="h-11 w-11 touch-target"
              >
                <Send className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 