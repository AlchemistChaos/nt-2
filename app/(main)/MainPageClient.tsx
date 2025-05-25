'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, MealWithItems, ChatMessage } from '@/types'
import { CustomMealCarousel } from '@/components/custom/CustomMealCarousel'
import { ChatMessage as ChatMessageComponent } from '@/components/custom/ChatMessage'
import { ImageUploadButton } from '@/components/custom/ImageUploadButton'
import { DailyProgress } from '@/components/custom/DailyProgress'
import { DayNavigation } from '@/components/custom/DayNavigation'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, LogOut, Settings, Target, BookOpen, Clock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMealsForDate, useChatMessages, useDailyTargetForDate, queryKeys } from '@/lib/supabase/client-cache'
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  // Use React Query for date-aware data fetching
  const { data: meals = [] } = useMealsForDate(user.id, selectedDate)
  const { data: cachedMessages = [] } = useChatMessages(user.id, selectedDate, 20)
  const { data: dailyTarget } = useDailyTargetForDate(user.id, selectedDate)
  const queryClient = useQueryClient()
  
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

  // Sync local state with cached messages when date changes
  // Only sync when date actually changes to prevent infinite loops
  const prevSelectedDate = useRef<string>(selectedDate)
  useEffect(() => {
    if (selectedDate !== prevSelectedDate.current) {
      setMessages(cachedMessages)
      prevSelectedDate.current = selectedDate
    }
  }, [selectedDate, cachedMessages])

  // Initialize messages on first load
  useEffect(() => {
    if (messages.length === 0 && cachedMessages.length > 0) {
      setMessages(cachedMessages)
    }
  }, [cachedMessages, messages.length])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const refreshMeals = async () => {
    // Use React Query to invalidate and refetch meals data for selected date
    await queryClient.invalidateQueries({ queryKey: queryKeys.mealsForDate(user.id, selectedDate) })
  }

  const refreshMessages = async () => {
    // Use React Query to invalidate and refetch chat messages for selected date
    await queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(user.id, selectedDate, 20) })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const handlePrefetchLibrary = () => {
    // Prefetch saved items data when user hovers over library button
    queryClient.prefetchQuery({
      queryKey: queryKeys.savedItems(user.id),
      queryFn: async () => {
        const supabase = createClient()
        const { data: items } = await supabase
          .from('saved_items')
          .select(`
            *,
            brand:brands(*)
          `)
          .eq('user_id', user.id)
          .order('times_used', { ascending: false })
        return items || []
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

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageToSend,
          image: imageToSend
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
                }

                if (parsed.action) {
                  // Handle actions (meal logged, preference updated, etc.)
                  console.log('Action received:', parsed.action)
                  // Refresh meals if needed
                  if (parsed.action.type === 'meal_logged' || parsed.action.type === 'meal_planned' || parsed.action.type === 'meal_updated') {
                    // Refresh meals data properly instead of reloading page
                    await refreshMeals()
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* Day Navigation Sidebar */}
      <DayNavigation
        userId={user.id}
        selectedDate={selectedDate}
        onDateSelect={setSelectedDate}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">🥗 Nutrition Hero</h1>
            <span className="text-sm text-gray-500">Welcome, {user.name || user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/library')}
              title="Quick Add Library"
              onMouseEnter={handlePrefetchLibrary}
            >
              <BookOpen className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/goals')}
              title="Goals & Profile"
              onMouseEnter={handlePrefetchGoals}
            >
              <Target className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/preferences')}
            >
              <Settings className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Meal Carousel Section - Full Width Background */}
      <div className="bg-white border-b border-gray-200 w-full">
        <div className="max-w-7xl mx-auto p-6">
          <CustomMealCarousel 
            meals={meals} 
            onMealUpdated={refreshMeals}
            onMealDeleted={refreshMeals}
          />
        </div>
      </div>

      {/* Daily Progress Section */}
      <div className="bg-gray-50 w-full">
        <div className="max-w-7xl mx-auto p-6">
          <DailyProgress meals={meals} dailyTarget={dailyTarget || null} />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col">
        {/* Chat Section */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
              {messages.map((message) => (
                <ChatMessageComponent key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 bg-white p-4">
            <div className="max-w-4xl mx-auto">
              {isReadOnly ? (
                <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-yellow-800">
                      📅 You&apos;re viewing {formatDateForDisplay(selectedDate)}. You can view past data but cannot send new messages.
                    </span>
                  </div>
                </div>
              ) : selectedDate === getTodayDateString() ? (
                <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-green-600" />
                    <span className="text-sm text-green-800">
                      🌟 You&apos;re on today&apos;s chat! Start logging meals or ask nutrition questions.
                    </span>
                  </div>
                </div>
              ) : null}
              
              {selectedImage && !isReadOnly && (
                <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Image selected</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedImage(null)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              )}
              
              <div className="flex items-end gap-3">
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
                    className="min-h-[44px]"
                  />
                </div>
                
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
                  className="h-11 w-11"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>


    </div>
  )
} 