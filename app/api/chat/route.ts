import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI, NUTRITION_HERO_SYSTEM_PROMPT } from '@/lib/openai/client'
import { 
  getCurrentUser, 
  getUserPreferences, 
  getTodaysMeals, 
  addChatMessage,
  addMeal,
  updateMeal,
  addUserPreference,
  getChatMessages
} from '@/lib/supabase/database'
import { getMealTypeFromTime } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    const { message, image } = await request.json()

    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Save user message
    await addChatMessage(user.id, 'user', message)

    // Get user context
    const [preferences, todaysMeals, recentMessages] = await Promise.all([
      getUserPreferences(user.id),
      getTodaysMeals(user.id),
      getChatMessages(user.id, 10)
    ])

    // Build context for AI
    const preferencesText = preferences.length > 0 
      ? `User preferences: ${preferences.map(p => `${p.type}: ${p.food_name}${p.notes ? ` (${p.notes})` : ''}`).join(', ')}`
      : 'No dietary preferences set.'

    const mealsText = todaysMeals.length > 0
      ? `Today's meals: ${todaysMeals.map(m => `${m.meal_type}: ${m.meal_name || 'Unnamed'} (${m.status})`).join(', ')}`
      : 'No meals logged today.'

    const contextMessage = `Current user context:
${preferencesText}
${mealsText}

Recent conversation:
${recentMessages.slice(-5).map(m => `${m.role}: ${m.content}`).join('\n')}`

    // Prepare messages for OpenAI
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      {
        role: 'system',
        content: NUTRITION_HERO_SYSTEM_PROMPT
      },
      {
        role: 'system',
        content: contextMessage
      }
    ]

    // Add user message with image if provided
    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: message },
          { 
            type: 'image_url', 
            image_url: { 
              url: `data:image/jpeg;base64,${image}`,
              detail: 'high'
            } 
          }
        ]
      })
    } else {
      messages.push({
        role: 'user',
        content: message
      })
    }

    // Create streaming response
    const openai = getOpenAI()
    const stream = await openai.chat.completions.create({
      model: image ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 1000
    })

    // Create readable stream for response
    const encoder = new TextEncoder()
    let fullResponse = ''

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content || ''
            if (content) {
              fullResponse += content
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content })}\n\n`))
            }
          }

          // Process the full response for intent recognition
          const action = await processIntentAndTakeAction(fullResponse, message, image, user.id)
          
          // Send action if any
          if (action) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ action })}\n\n`))
          }

          // Save assistant message
          await addChatMessage(user.id, 'assistant', fullResponse)

          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (error) {
          console.error('Streaming error:', error)
          controller.error(error)
        }
      }
    })

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function processIntentAndTakeAction(
  aiResponse: string, 
  userMessage: string, 
  image: string | undefined, 
  userId: string
) {
  const lowerMessage = userMessage.toLowerCase()

  try {
    // Intent: Log a meal (expanded triggers)
    if (image || 
        lowerMessage.includes('ate') || 
        lowerMessage.includes('had') || 
        lowerMessage.includes('consumed') ||
        lowerMessage.includes('add') ||
        lowerMessage.includes('want') ||
        lowerMessage.includes('having') ||
        lowerMessage.includes('eating') ||
        lowerMessage.includes('log') ||
        (lowerMessage.includes('for') && (lowerMessage.includes('lunch') || lowerMessage.includes('breakfast') || lowerMessage.includes('dinner') || lowerMessage.includes('snack')))
    ) {
      const mealData = extractMealDataFromMessage(aiResponse, userMessage)
      if (mealData && mealData.name) {
        console.log('Logging meal:', mealData) // Debug log
        const meal = await addMeal(userId, {
          meal_name: mealData.name,
          meal_type: mealData.type || getMealTypeFromTime(),
          kcal_total: mealData.calories,
          g_protein: mealData.protein,
          g_carb: mealData.carbs,
          g_fat: mealData.fat,
          status: 'logged'
        })

        console.log('Meal logged successfully:', meal) // Debug log
        return { type: 'meal_logged', data: meal }
      }
    }

    // Intent: Plan a meal
    if (lowerMessage.includes('plan') && (lowerMessage.includes('meal') || lowerMessage.includes('dinner') || lowerMessage.includes('lunch') || lowerMessage.includes('breakfast'))) {
      const mealData = extractMealDataFromMessage(aiResponse, userMessage)
      if (mealData && mealData.name) {
        const meal = await addMeal(userId, {
          meal_name: mealData.name,
          meal_type: mealData.type || getMealTypeFromTime(),
          status: 'planned'
        })

        return { type: 'meal_planned', data: meal }
      }
    }

    // Intent: Update preference
    if (lowerMessage.includes('allergic') || lowerMessage.includes('allergy') || 
        lowerMessage.includes('vegetarian') || lowerMessage.includes('vegan') ||
        lowerMessage.includes('avoid') || lowerMessage.includes('restriction')) {
      
      const preferenceData = extractPreferenceFromMessage(userMessage)
      if (preferenceData) {
        const preference = await addUserPreference(
          userId,
          preferenceData.type,
          preferenceData.foodName,
          preferenceData.notes
        )

        return { type: 'preference_updated', data: preference }
      }
    }

    // Intent: Mark planned meal as eaten
    if (lowerMessage.includes('ate my planned') || lowerMessage.includes('had my planned')) {
      const todaysMeals = await getTodaysMeals(userId)
      const plannedMeal = todaysMeals.find(m => m.status === 'planned')
      
      if (plannedMeal) {
        const mealData = image ? extractMealDataFromMessage(aiResponse, userMessage) : null
        
        const updatedMeal = await updateMeal(plannedMeal.id, {
          status: 'logged',
          kcal_total: mealData?.calories || plannedMeal.kcal_total,
          g_protein: mealData?.protein || plannedMeal.g_protein,
          g_carb: mealData?.carbs || plannedMeal.g_carb,
          g_fat: mealData?.fat || plannedMeal.g_fat
        })

        return { type: 'meal_updated', data: updatedMeal }
      }
    }

  } catch (error) {
    console.error('Intent processing error:', error)
  }

  return null
}

function extractMealDataFromMessage(aiResponse: string, userMessage: string) {
  // Extract nutritional information from AI response
  const caloriesMatch = aiResponse.match(/(\d+)\s*(?:calories|cal|kcal)/i)
  const proteinMatch = aiResponse.match(/(\d+)\s*(?:g|grams?)\s*(?:of\s+)?protein/i)
  const carbsMatch = aiResponse.match(/(\d+)\s*(?:g|grams?)\s*(?:of\s+)?carb/i)
  const fatMatch = aiResponse.match(/(\d+)\s*(?:g|grams?)\s*(?:of\s+)?fat/i)

  // Extract meal name from user message - improved logic
  let mealName = userMessage
  const lower = userMessage.toLowerCase()
  
  // Remove common prefixes
  if (lower.startsWith('ate ')) {
    mealName = userMessage.substring(4)
  } else if (lower.startsWith('had ')) {
    mealName = userMessage.substring(4)
  } else if (lower.startsWith('plan ')) {
    mealName = userMessage.substring(5)
  } else if (lower.startsWith('add ')) {
    mealName = userMessage.substring(4)
  } else if (lower.startsWith('want ')) {
    mealName = userMessage.substring(5)
  } else if (lower.startsWith('having ')) {
    mealName = userMessage.substring(7)
  } else if (lower.startsWith('eating ')) {
    mealName = userMessage.substring(7)
  } else if (lower.startsWith('log ')) {
    mealName = userMessage.substring(4)
  }
  
  // Remove meal type suffixes like "for lunch"
  mealName = mealName.replace(/\s+for\s+(breakfast|lunch|dinner|snack)$/i, '')
  
  return {
    name: mealName.trim(),
    type: extractMealType(userMessage),
    calories: caloriesMatch ? parseInt(caloriesMatch[1]) : undefined,
    protein: proteinMatch ? parseInt(proteinMatch[1]) : undefined,
    carbs: carbsMatch ? parseInt(carbsMatch[1]) : undefined,
    fat: fatMatch ? parseInt(fatMatch[1]) : undefined
  }
}

function extractMealType(message: string): string | undefined {
  const lower = message.toLowerCase()
  if (lower.includes('breakfast')) return 'breakfast'
  if (lower.includes('lunch')) return 'lunch'
  if (lower.includes('dinner')) return 'dinner'
  if (lower.includes('snack')) return 'snack'
  return undefined
}

function extractPreferenceFromMessage(message: string) {
  const lower = message.toLowerCase()
  
  if (lower.includes('allergic') || lower.includes('allergy')) {
    const allergenMatch = message.match(/allergic to ([^.]+)/i) || message.match(/allergy to ([^.]+)/i)
    if (allergenMatch) {
      return {
        type: 'allergy',
        foodName: allergenMatch[1].trim(),
        notes: 'User reported allergy'
      }
    }
  }

  if (lower.includes('vegetarian')) {
    return {
      type: 'dietary_restriction',
      foodName: 'meat',
      notes: 'Vegetarian diet'
    }
  }

  if (lower.includes('vegan')) {
    return {
      type: 'dietary_restriction',
      foodName: 'animal products',
      notes: 'Vegan diet'
    }
  }

  return null
} 