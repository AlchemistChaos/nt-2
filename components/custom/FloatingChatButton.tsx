'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { FloatingChatModal } from './FloatingChatModal'

export function FloatingChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 z-40 bg-blue-600 hover:bg-blue-700"
        size="icon"
        title="Open AI Chat"
      >
        <MessageCircle className="h-6 w-6 text-white" />
      </Button>

      {/* Chat Modal */}
      <FloatingChatModal 
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
} 