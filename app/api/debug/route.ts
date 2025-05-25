import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const envCheck = {
      openai_configured: !!process.env.OPENAI_API_KEY,
      supabase_url_configured: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabase_anon_key_configured: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      node_env: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }

    return NextResponse.json({
      status: 'ok',
      environment: envCheck,
      message: 'Debug endpoint working'
    })
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 })
  }
} 