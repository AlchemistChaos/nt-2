'use client'

import { useState, useRef, useEffect } from 'react'
import { User, ChatMessage as ChatMessageType } from '@/types'
import { ChatMessage } from './ChatMessage'
import { ImageUploadButton } from './ImageUploadButton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, X, Bot, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useChatMessages, useClearChatMessages } from '@/lib/supabase/client-cache'
import { getTodayDateString } from '@/lib/utils/date'

interface FloatingChatModalProps {
  isOpen: boolean
  onClose: () => void
}

export function FloatingChatModal({ isOpen, onClose }: FloatingChatModalProps) {
  const [user, setUser] = useState<User | null>(null)
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const today = getTodayDateString()
  
  // Fetch user on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user: authUser } } = await supabase.auth.getUser()
        if (authUser) {
          const { data: userData } = await supabase
            .from('users')
            .select('*')
            .eq('auth_user_id', authUser.id)
            .single()
          setUser(userData)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      }
    }
    
    if (isOpen) {
      fetchUser()
    }
  }, [isOpen])
  
  // Use React Query for cached messages - only when user is available
  const { data: cachedMessages = [] } = useChatMessages(
    user?.id || '', 
    today, 
    10
  )
  const clearChatMessages = useClearChatMessages()
  
  // Sync messages with cache
  useEffect(() => {
    if (isOpen && cachedMessages.length > 0) {
      setMessages(cachedMessages)
    }
  }, [cachedMessages, isOpen])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (messages.length > 0) {
      scrollToBottom()
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedImage || !user) return

    setIsLoading(true)
    const messageToSend = inputMessage.trim()
    const imageToSend = selectedImage

    // Clear input immediately
    setInputMessage('')
    setSelectedImage(null)

    // Add user message to UI
    const userMessage: ChatMessageType = {
      id: Date.now().toString(),
      user_id: user.id,
      role: 'user',
      content: messageToSend,
      date: today,
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
        date: today,
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
                  // Handle actions but don't refresh meals (not needed in floating chat)
                  console.log('Action received in floating chat:', parsed.action.type)
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
        date: today,
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

  const handleClearChat = async () => {
    if (!user || !confirm('Clear all chat messages for today? This cannot be undone.')) {
      return
    }

    try {
      await clearChatMessages.mutateAsync({
        userId: user.id,
        date: today
      })
      // Clear local messages immediately for better UX
      setMessages([])
    } catch (error) {
      console.error('Error clearing chat messages:', error)
      alert('Failed to clear chat messages. Please try again.')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-end p-4">
      {/* Modal */}
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md h-[600px] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Assistant</h3>
              <p className="text-xs text-gray-500">Ask about goals, add meals, get insights</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <Button
                onClick={handleClearChat}
                disabled={clearChatMessages.isPending}
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                title="Clear chat messages"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 mt-8">
              <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="text-sm">Hi! I can help you with:</p>
              <ul className="text-xs mt-2 space-y-1 text-left max-w-48 mx-auto">
                <li>• Adding meals and logging food</li>
                <li>• Checking your goals and progress</li>
                <li>• Answering nutrition questions</li>
                <li>• Viewing your meal history</li>
              </ul>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          {selectedImage && (
            <div className="mb-3 p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-600">Image selected</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedImage(null)}
                  className="h-6 w-auto px-2 text-xs"
                >
                  Remove
                </Button>
              </div>
            </div>
          )}
          
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask about goals, add meals, get insights..."
                disabled={isLoading}
                className="text-sm"
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
              className="h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
} 