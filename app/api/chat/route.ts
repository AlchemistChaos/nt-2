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
    // Intent: Update preference (CHECK THIS FIRST!)
    if (lowerMessage.includes('allergic') || lowerMessage.includes('allergy') || 
        lowerMessage.includes('vegetarian') || lowerMessage.includes('vegan') ||
        lowerMessage.includes('avoid') || lowerMessage.includes('restriction') ||
        lowerMessage.includes('negative preference') || lowerMessage.includes('dislike') ||
        (lowerMessage.includes('add') && lowerMessage.includes('preference')) ||
        (lowerMessage.includes('add') && (lowerMessage.includes('negative') || lowerMessage.includes('dislike'))) ||
        lowerMessage.includes('makes me feel bad') || lowerMessage.includes('feel bad') ||
        lowerMessage.includes('dont like') || lowerMessage.includes("don't like") ||
        lowerMessage.includes('not a fan') || lowerMessage.includes('hate') ||
        lowerMessage.includes('cant stand') || lowerMessage.includes("can't stand")
    ) {
      console.log('Processing preference update:', userMessage) // Debug log
      const preferenceData = extractPreferenceFromMessage(userMessage)
      if (preferenceData) {
        console.log('Preference data extracted:', preferenceData) // Debug log
        const preference = await addUserPreference(
          userId,
          preferenceData.type,
          preferenceData.foodName,
          preferenceData.notes
        )

        console.log('Preference added successfully:', preference) // Debug log
        return { type: 'preference_updated', data: preference }
      }
    }

    // Intent: Log a meal (expanded triggers) - CHECK AFTER PREFERENCES
    if (image || 
        lowerMessage.includes('ate') || 
        lowerMessage.includes('had') || 
        lowerMessage.includes('consumed') ||
        (lowerMessage.includes('add') && !lowerMessage.includes('preference') && !lowerMessage.includes('negative')) ||
        lowerMessage.includes('want') ||
        lowerMessage.includes('having') ||
        lowerMessage.includes('eating') ||
        (lowerMessage.includes('log') && !lowerMessage.includes('preference')) ||
        (lowerMessage.includes('for') && (lowerMessage.includes('lunch') || lowerMessage.includes('breakfast') || lowerMessage.includes('dinner') || lowerMessage.includes('snack')))
    ) {
      const mealData = await processMealFromMessage(userMessage, image)
      if (mealData && mealData.name) {
        console.log('Logging meal:', mealData) // Debug log
        console.log('Nutrition breakdown - Protein:', mealData.protein, 'Carbs:', mealData.carbs, 'Fat:', mealData.fat) // Debug nutrition
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
      const mealData = await processMealFromMessage(userMessage, image)
      if (mealData && mealData.name) {
        const meal = await addMeal(userId, {
          meal_name: mealData.name,
          meal_type: mealData.type || getMealTypeFromTime(),
          status: 'planned'
        })

        return { type: 'meal_planned', data: meal }
      }
    }

    // Intent: Mark planned meal as eaten
    if (lowerMessage.includes('ate my planned') || lowerMessage.includes('had my planned')) {
      const todaysMeals = await getTodaysMeals(userId)
      const plannedMeal = todaysMeals.find(m => m.status === 'planned')
      
      if (plannedMeal) {
        const mealData = image ? await processMealFromMessage(userMessage, image) : null
        
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

async function processMealFromMessage(userMessage: string, image?: string) {
  try {
    const openai = getOpenAI()
    
    // Create a specialized prompt for meal extraction and nutrition calculation
    const mealProcessingPrompt = `You are a nutrition expert. Extract the food item from the user's message and provide detailed nutritional information.

User message: "${userMessage}"

Please respond with ONLY a JSON object in this exact format:
{
  "foodItem": "extracted food name (e.g., 'tuna', 'banana bread', 'salmon avocado')",
  "mealType": "breakfast|lunch|dinner|snack or null if not specified",
  "calories": number (estimated calories for a typical serving),
  "protein": number (grams of protein),
  "carbs": number (grams of carbohydrates),
  "fat": number (grams of fat)
}

Rules:
1. Extract ONLY the actual food item, not the entire message
2. Remove phrases like "lets add", "i had", "for breakfast", etc.
3. If multiple foods are mentioned, focus on the main item
4. Provide realistic nutritional values for a typical serving size
5. If you cannot identify a food item, return null for foodItem
6. Be conservative with portion estimates (assume standard serving sizes)
7. IMPORTANT: protein, carbs, and fat should be SEPARATE values, NOT totals or sums
8. Each macronutrient should be calculated independently based on the food item

Examples:
- "lets add tuna for breakfast" → {"foodItem": "tuna", "mealType": "breakfast", "calories": 132, "protein": 28, "carbs": 0, "fat": 1}
- "i had banana bread" → {"foodItem": "banana bread", "mealType": null, "calories": 196, "protein": 3, "carbs": 33, "fat": 6}
- "salmon avocado" → {"foodItem": "salmon avocado", "mealType": null, "calories": 280, "protein": 25, "carbs": 8, "fat": 18}

CRITICAL: The "protein" field should ONLY contain grams of protein, NOT the sum of all macronutrients. For example, if a food has 10g protein + 15g carbs + 5g fat, the protein field should be 10, NOT 30.`

    const messages: any[] = [
      {
        role: 'system',
        content: mealProcessingPrompt
      }
    ]

    // Add user message with or without image
    if (image) {
      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: userMessage },
          { type: 'image_url', image_url: { url: image } }
        ]
      })
    } else {
      messages.push({
        role: 'user',
        content: userMessage
      })
    }

    const response = await openai.chat.completions.create({
      model: image ? 'gpt-4o' : 'gpt-4o-mini',
      messages,
      temperature: 0.1, // Low temperature for consistent extraction
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    // Parse the JSON response
    try {
      const mealData = JSON.parse(content.trim())
      
      // Validate the response
      if (!mealData.foodItem) return null
      
      // Debug: Log the AI response to check for issues
      console.log('AI Nutrition Response:', {
        food: mealData.foodItem,
        protein: mealData.protein,
        carbs: mealData.carbs,
        fat: mealData.fat,
        calories: mealData.calories
      })
      
      // Validate nutrition values are reasonable
      const protein = mealData.protein || 0
      const carbs = mealData.carbs || 0
      const fat = mealData.fat || 0
      
      // Check if protein value seems wrong (e.g., if it equals carbs + fat, it might be a sum)
      if (protein > 0 && protein === (carbs + fat)) {
        console.warn('Suspicious protein value detected - might be sum of macros:', { protein, carbs, fat })
      }
      
      // Additional validation: check if protein seems unreasonably high compared to calories
      // Protein has 4 calories per gram, so protein * 4 shouldn't exceed total calories
      if (protein > 0 && mealData.calories > 0 && (protein * 4) > mealData.calories) {
        console.warn('Protein value seems too high for calorie count:', { 
          protein, 
          calories: mealData.calories, 
          proteinCalories: protein * 4 
        })
      }
      
      return {
        name: mealData.foodItem,
        type: mealData.mealType || extractMealType(userMessage),
        calories: mealData.calories || undefined,
        protein: mealData.protein || undefined,
        carbs: mealData.carbs || undefined,
        fat: mealData.fat || undefined
      }
    } catch (parseError) {
      console.error('Failed to parse meal data JSON:', parseError)
      console.error('Raw response:', content)
      return null
    }

  } catch (error) {
    console.error('Meal processing error:', error)
    return null
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
  
  // Handle allergies
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

  // Handle negative preferences / dislikes / foods that make feel bad
  if (lower.includes('negative preference') || lower.includes('dislike') || 
      lower.includes('makes me feel bad') || lower.includes('feel bad') ||
      (lower.includes('add') && lower.includes('negative')) ||
      lower.includes('dont like') || lower.includes("don't like") ||
      lower.includes('not a fan') || lower.includes('hate') ||
      lower.includes('cant stand') || lower.includes("can't stand")) {
    
    // Try to extract food name from various patterns
    let foodName = null
    
    // Pattern: "add [food] as a negative preference"
    const negativeMatch = message.match(/add\s+([^,\s]+(?:\s+[^,\s]+)*)\s+as\s+a\s+negative/i)
    if (negativeMatch) {
      foodName = negativeMatch[1].trim()
    }
    
    // Pattern: "i dont like [food]" or "i don't like [food]"
    const dontLikeMatch = message.match(/i\s+don?'?t\s+like\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (dontLikeMatch && !foodName) {
      foodName = dontLikeMatch[1].trim()
    }
    
    // Pattern: "not a fan of [food]"
    const notFanMatch = message.match(/not\s+a\s+fan\s+of\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (notFanMatch && !foodName) {
      foodName = notFanMatch[1].trim()
    }
    
    // Pattern: "i hate [food]"
    const hateMatch = message.match(/i\s+hate\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (hateMatch && !foodName) {
      foodName = hateMatch[1].trim()
    }
    
    // Pattern: "can't stand [food]" or "cant stand [food]"
    const cantStandMatch = message.match(/can'?t\s+stand\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (cantStandMatch && !foodName) {
      foodName = cantStandMatch[1].trim()
    }
    
    // Pattern: "dislike [food]" or "[food] makes me feel bad"
    const dislikeMatch = message.match(/dislike\s+([^,\s]+(?:\s+[^,\s]+)*)/i) ||
                        message.match(/([^,\s]+(?:\s+[^,\s]+)*)\s+makes?\s+me\s+feel\s+bad/i)
    if (dislikeMatch && !foodName) {
      foodName = dislikeMatch[1].trim()
    }
    
    // Pattern: "avoid [food]"
    const avoidMatch = message.match(/avoid\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (avoidMatch && !foodName) {
      foodName = avoidMatch[1].trim()
    }
    
    if (foodName) {
      return {
        type: 'dislike',
        foodName: foodName,
        notes: 'User dislikes this food or it makes them feel bad'
      }
    }
  }

  // Handle dietary restrictions
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

  // Handle general restrictions/avoidances
  if (lower.includes('restriction') || lower.includes('avoid')) {
    const restrictionMatch = message.match(/(?:restriction|avoid)\s+([^,\s]+(?:\s+[^,\s]+)*)/i)
    if (restrictionMatch) {
      return {
        type: 'dietary_restriction',
        foodName: restrictionMatch[1].trim(),
        notes: 'User wants to avoid this food'
      }
    }
  }

  return null
} 