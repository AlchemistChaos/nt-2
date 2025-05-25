'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, MealWithItems, ChatMessage } from '@/types'
import { CustomMealCarousel } from '@/components/custom/CustomMealCarousel'
import { ChatMessage as ChatMessageComponent } from '@/components/custom/ChatMessage'
import { ImageUploadButton } from '@/components/custom/ImageUploadButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, LogOut, Settings, Target } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useTodaysMeals, useChatMessages, queryKeys } from '@/lib/supabase/client-cache'
import { useQueryClient } from '@tanstack/react-query'

interface MainPageClientProps {
  user: User
  initialMeals: MealWithItems[]
  initialMessages: ChatMessage[]
}

export function MainPageClient({ user, initialMeals, initialMessages }: MainPageClientProps) {
  // Use React Query for both meals and chat messages with real-time updates
  const { data: meals = initialMeals } = useTodaysMeals(user.id)
  const { data: cachedMessages = initialMessages } = useChatMessages(user.id, 20)
  const queryClient = useQueryClient()
  
  // Use local state for real-time updates, but sync with cached messages
  const [messages, setMessages] = useState(cachedMessages)
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const router = useRouter()

  // Sync local state with cached messages when they change
  useEffect(() => {
    setMessages(cachedMessages)
  }, [cachedMessages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const refreshMeals = async () => {
    // Use React Query to invalidate and refetch meals data
    await queryClient.invalidateQueries({ queryKey: queryKeys.todaysMeals(user.id) })
  }

  const refreshMessages = async () => {
    // Use React Query to invalidate and refetch chat messages
    await queryClient.invalidateQueries({ queryKey: queryKeys.chatMessages(user.id, 20) })
  }

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/login')
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
        created_at: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
              onClick={() => router.push('/goals')}
              title="Goals & Profile"
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
              {selectedImage && (
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
                    placeholder="Ask about nutrition, log a meal, or upload a food photo..."
                    disabled={isLoading}
                    className="min-h-[44px]"
                  />
                </div>
                
                <ImageUploadButton
                  onImageSelect={setSelectedImage}
                  disabled={isLoading}
                />
                
                <Button
                  onClick={handleSendMessage}
                  disabled={isLoading || (!inputMessage.trim() && !selectedImage)}
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
  )
} 