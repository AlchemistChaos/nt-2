import { NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai/client'

export async function GET() {
  try {
    // Check if API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ 
        error: 'OpenAI API key not configured',
        hasKey: false 
      }, { status: 500 })
    }

    const openai = getOpenAI()
    
    // Test with a simple API call
    const response = await openai.models.list()
    
    return NextResponse.json({ 
      success: true,
      message: 'OpenAI API key is working!',
      hasKey: true,
      modelCount: response.data.length
    })

  } catch (error: any) {
    console.error('OpenAI API test error:', error)
    
    return NextResponse.json({ 
      error: 'OpenAI API key test failed',
      details: error.message,
      hasKey: !!process.env.OPENAI_API_KEY,
      errorType: error.code || 'unknown'
    }, { status: 500 })
  }
} 