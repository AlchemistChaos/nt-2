'use client'

import { ChatMessage as ChatMessageType } from '@/types'
import { formatTime } from '@/lib/utils'
import { User, Bot } from 'lucide-react'

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-2 sm:gap-3 p-3 sm:p-4 ${isUser ? 'bg-transparent' : 'bg-gray-50'}`}>
      {/* Avatar */}
      <div className={`flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center ${
        isUser ? 'bg-blue-600' : 'bg-green-600'
      }`}>
        {isUser ? (
          <User className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        ) : (
          <Bot className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
        )}
      </div>

      {/* Message content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-xs sm:text-sm text-gray-900">
            {isUser ? 'You' : 'Nutrition Hero'}
          </span>
          <span className="text-xs text-gray-500">
            {formatTime(message.created_at)}
          </span>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed text-sm sm:text-base break-words">
            {/* Format message content with better mobile readability */}
            {message.content.split('\n').map((line, index) => {
              // Handle bullet points and lists better on mobile
              if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
                return (
                  <div key={index} className="flex items-start gap-2 my-1">
                    <span className="text-blue-600 font-bold mt-0.5">•</span>
                    <span className="flex-1">{line.replace(/^[•\-]\s*/, '')}</span>
                  </div>
                )
              }
              
              // Handle numbered lists
              if (/^\d+\./.test(line.trim())) {
                const [number, ...rest] = line.trim().split(/\.\s*/)
                return (
                  <div key={index} className="flex items-start gap-2 my-1">
                    <span className="text-blue-600 font-bold mt-0.5">{number}.</span>
                    <span className="flex-1">{rest.join('. ')}</span>
                  </div>
                )
              }
              
              // Handle bold text (markdown-style)
              if (line.includes('**')) {
                const parts = line.split(/(\*\*[^*]+\*\*)/)
                return (
                  <p key={index} className="my-1">
                    {parts.map((part, partIndex) => {
                      if (part.startsWith('**') && part.endsWith('**')) {
                        return (
                          <strong key={partIndex} className="font-semibold text-gray-900">
                            {part.slice(2, -2)}
                          </strong>
                        )
                      }
                      return part
                    })}
                  </p>
                )
              }
              
              // Regular paragraphs
              if (line.trim()) {
                return <p key={index} className="my-1">{line}</p>
              }
              
              // Empty lines for spacing
              return <div key={index} className="h-2" />
            })}
          </div>
        </div>
      </div>
    </div>
  )
} 