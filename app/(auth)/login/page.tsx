'use client'

import { useState } from 'react'
import { AuthForm } from '@/components/auth/AuthForm'

export default function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            🥗 Nutrition Hero
          </h1>
          <p className="text-gray-600">
            Your AI-powered nutrition companion
          </p>
        </div>
        
        <AuthForm 
          mode={mode} 
          onToggleMode={() => setMode(mode === 'login' ? 'signup' : 'login')} 
        />
      </div>
    </div>
  )
} 