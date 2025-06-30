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
  getChatMessages,
  searchBrandMenuItems
} from '@/lib/supabase/database'
import { createClient } from '@/lib/supabase/server'
import { getMealTypeFromTime } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const { message, image } = await request.json()

    // Get current user
    let user
    try {
      user = await getCurrentUser()
    } catch (userError) {
      console.error('Failed to get current user:', userError)
      return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 401 })
    }
    
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
    let stream
    try {
      stream = await openai.chat.completions.create({
        model: image ? 'gpt-4o' : 'gpt-4o-mini',
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 1000
      })
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      return NextResponse.json({ error: 'Failed to connect to OpenAI API' }, { status: 500 })
    }

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
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
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
            console.log('🍽️ [MEAL LOGGING] Intent detected for message:', userMessage)
      
      const mealsData = await processMealFromMessage(userMessage, image)
      console.log('🍽️ [MEAL LOGGING] Meal data extracted:', mealsData)
      
      if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
        console.log('🍽️ [MEAL LOGGING] Attempting to save', mealsData.length, 'meals')
        
        try {
          const savedMeals = []
          
          // Process each meal individually
          for (const mealData of mealsData) {
            if (mealData.name) {
              const meal = await addMeal(userId, {
                meal_name: mealData.name,
                meal_type: mealData.type || getMealTypeFromTime(),
                date: new Date().toISOString().split('T')[0], // Add required date field
                kcal_total: mealData.calories,
                g_protein: mealData.protein,
                g_carb: mealData.carbs,
                g_fat: mealData.fat,
                status: 'logged'
              })
              
              console.log('🍽️ [MEAL LOGGING] ✅ Meal saved successfully:', meal)
              savedMeals.push(meal)
            }
          }
          
          if (savedMeals.length > 0) {
            return { 
              type: 'meal_logged', 
              data: savedMeals.length === 1 ? savedMeals[0] : savedMeals,
              count: savedMeals.length
            }
          } else {
            console.log('🍽️ [MEAL LOGGING] ❌ No valid meals found to save')
            return null
          }
        } catch (error) {
          console.error('🍽️ [MEAL LOGGING] ❌ Failed to save meals:', error)
          return null
        }
      } else {
        console.log('🍽️ [MEAL LOGGING] ❌ No valid meal data extracted from message')
        return null
      }
    }

    // Intent: Plan a meal
    if (lowerMessage.includes('plan') && (lowerMessage.includes('meal') || lowerMessage.includes('dinner') || lowerMessage.includes('lunch') || lowerMessage.includes('breakfast'))) {
      const mealsData = await processMealFromMessage(userMessage, image)
      if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
        const savedMeals = []
        
        for (const mealData of mealsData) {
          if (mealData.name) {
            const meal = await addMeal(userId, {
              meal_name: mealData.name,
              meal_type: mealData.type || getMealTypeFromTime(),
              date: new Date().toISOString().split('T')[0], // Add required date field
              status: 'planned'
            })
            savedMeals.push(meal)
          }
        }
        
        if (savedMeals.length > 0) {
          return { 
            type: 'meal_planned', 
            data: savedMeals.length === 1 ? savedMeals[0] : savedMeals,
            count: savedMeals.length
          }
        }
      }
    }

    // Intent: Mark planned meal as eaten
    if (lowerMessage.includes('ate my planned') || lowerMessage.includes('had my planned')) {
      const todaysMeals = await getTodaysMeals(userId)
      const plannedMeal = todaysMeals.find(m => m.status === 'planned')
      
      if (plannedMeal) {
        const mealsData = image ? await processMealFromMessage(userMessage, image) : null
        // Use first meal's data if multiple meals extracted
        const mealData = mealsData && Array.isArray(mealsData) && mealsData.length > 0 ? mealsData[0] : null
        
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

// Get all brand menu items from library
async function getAllLibraryItems() {
  try {
    const supabase = await createClient()
    const { data: items } = await supabase
      .from('brand_menu_items')
      .select(`
        *,
        brand:brands(*)
      `)
      .eq('is_available', true)
      .order('name')
    
    return items || []
  } catch (error) {
    console.error('Error fetching library items:', error)
    return []
  }
}

// Use AI to intelligently match food against library items
async function findLibraryMatch(foodName: string) {
  try {
    console.log('🔍 [AI LIBRARY SEARCH] Searching for:', foodName)
    
    // Get all available library items
    const libraryItems = await getAllLibraryItems()
    
    if (libraryItems.length === 0) {
      console.log('🔍 [AI LIBRARY SEARCH] No library items available')
      return null
    }
    
    // Create a simplified list for AI matching
    const itemList = libraryItems.map((item: any, index: number) => ({
      id: index,
      name: item.name,
      brand: item.brand?.name || 'Unknown',
      description: item.description || '',
      category: item.category || ''
    }))
    
    console.log(`🔍 [AI LIBRARY SEARCH] Checking against ${itemList.length} library items`)
    
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not available for library matching')
      return null
    }

    const openai = getOpenAI()
    
    const matchingPrompt = `You are a food matching expert. Find the best match for the requested food item from the available library.

Requested food: "${foodName}"

Available library items:
${itemList.map((item: any) => `${item.id}: ${item.name} (${item.brand}) ${item.description ? `- ${item.description}` : ''}`).join('\n')}

Please respond with ONLY a JSON object:
{
  "match": {
    "id": number (library item ID, or null if no good match),
    "confidence": "high|medium|low",
    "reason": "brief explanation of why this matches"
  }
}

Rules:
1. Look for semantic matches, not just exact text matches
2. Consider variations like "banana bread" matching "Banana Bread Slice" 
3. Consider brand context - Warehouse items are commonly used
4. Only return a match if you're reasonably confident (medium+ confidence)
5. If no good match exists, return id: null

Examples:
- "banana bread" could match "Banana Bread Slice" or "Banana Bread"
- "eggs" could match "Scrambled Eggs" or "Hard Boiled Eggs"  
- "avocado toast" could match "Avocado Toast" or "Avocado on Toast"`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: matchingPrompt },
        { role: 'user', content: foodName }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    try {
      const result = JSON.parse(content.trim())
      
      if (result.match && result.match.id !== null && result.match.confidence !== 'low') {
        const matchedItem = libraryItems[result.match.id]
        
        if (matchedItem) {
          console.log('🔍 [AI LIBRARY SEARCH] ✅ Found match:', {
            requested: foodName,
            matched: matchedItem.name,
            brand: matchedItem.brand?.name,
            confidence: result.match.confidence,
            reason: result.match.reason,
            calories: matchedItem.kcal_per_serving,
            protein: matchedItem.g_protein_per_serving
          })
          
          return {
            name: matchedItem.name,
            calories: matchedItem.kcal_per_serving || undefined,
            protein: matchedItem.g_protein_per_serving || undefined,
            carbs: matchedItem.g_carb_per_serving || undefined,
            fat: matchedItem.g_fat_per_serving || undefined,
            brand: matchedItem.brand?.name || undefined,
            confidence: result.match.confidence,
            reason: result.match.reason,
            isFromLibrary: true
          }
        }
      }
      
      console.log('🔍 [AI LIBRARY SEARCH] ❌ No confident match found for:', foodName)
      return null
      
    } catch (parseError) {
      console.error('Failed to parse library matching result:', parseError)
      return null
    }

  } catch (error) {
    console.error('🔍 [AI LIBRARY SEARCH] Error:', error)
    return null
  }
}

async function processMealFromMessage(userMessage: string, image?: string) {
  try {
    // First, try to extract food names and search library
    const extractedFoods = await extractFoodNamesFromMessage(userMessage)
    
    if (extractedFoods && extractedFoods.length > 0) {
      console.log('📝 [MEAL PROCESSING] Extracted foods:', extractedFoods)
      
      const processedMeals = []
      
      for (const foodName of extractedFoods) {
        // First try library search
        const libraryMatch = await findLibraryMatch(foodName)
        
        if (libraryMatch) {
          // Use precise library data
          processedMeals.push({
            name: libraryMatch.name,
            type: extractMealType(userMessage),
            calories: libraryMatch.calories,
            protein: libraryMatch.protein,
            carbs: libraryMatch.carbs,
            fat: libraryMatch.fat,
            source: `Library (${libraryMatch.brand})`
          })
        } else {
          // Fall back to AI estimation
          const aiEstimate = await getAIFoodEstimate(foodName, userMessage)
          if (aiEstimate) {
            processedMeals.push({
              ...aiEstimate,
              source: 'AI Estimate'
            })
          }
        }
      }
      
      if (processedMeals.length > 0) {
        console.log('📝 [MEAL PROCESSING] Final processed meals:', processedMeals)
        return processedMeals
      }
    }
    
    // If no foods extracted, fall back to original AI processing
    return await getAIFoodEstimate(userMessage, userMessage, true)
    
  } catch (error) {
    console.error('Meal processing error:', error)
    return null
  }
}

// Extract just the food names from the user message
async function extractFoodNamesFromMessage(userMessage: string): Promise<string[]> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return []
    }

    const openai = getOpenAI()
    
    const extractionPrompt = `Extract ONLY the food names from this message. Return a simple JSON array of food names.

User message: "${userMessage}"

Return format: ["food1", "food2", ...]

Rules:
1. Extract ONLY food names (e.g., "banana bread", "avocado toast")
2. Remove phrases like "add", "had", "for breakfast"
3. Each food should be a separate item in the array
4. If no foods found, return empty array []

Examples:
- "add banana bread for breakfast" → ["banana bread"]
- "i had banana bread and avocado toast" → ["banana bread", "avocado toast"]
- "add banana bread, eggs for breakfast" → ["banana bread", "eggs"]`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 100
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    try {
      const foodNames = JSON.parse(content.trim())
      return Array.isArray(foodNames) ? foodNames : []
    } catch {
      return []
    }
  } catch (error) {
    console.error('Food name extraction error:', error)
    return []
  }
}

// Get AI nutrition estimate for a food (fallback method)
async function getAIFoodEstimate(foodName: string, originalMessage: string, isFullMessage = false) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured for meal processing')
      return null
    }

    const openai = getOpenAI()
    
    // Different prompt based on whether we're processing a single food or full message
    const prompt = isFullMessage 
      ? `You are a nutrition expert. Extract ALL food items from the user's message and provide detailed nutritional information for each.

User message: "${originalMessage}"

Please respond with ONLY a JSON object in this exact format:
{
  "foods": [
    {
      "foodItem": "extracted food name",
      "mealType": "breakfast|lunch|dinner|snack or null if not specified",
      "calories": number,
      "protein": number,
      "carbs": number,
      "fat": number
    }
  ]
}`
      : `You are a nutrition expert. Provide nutritional information for this specific food item.

Food: "${foodName}"

Please respond with ONLY a JSON object in this exact format:
{
  "foodItem": "${foodName}",
  "calories": number (estimated calories for a typical serving),
  "protein": number (grams of protein),
  "carbs": number (grams of carbohydrates),
  "fat": number (grams of fat)
}

Use realistic nutritional values for a typical serving size.`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: isFullMessage ? originalMessage : foodName }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (!content) return null

    try {
      const data = JSON.parse(content.trim())
      
      if (isFullMessage) {
        // Handle full message format
        if (!data.foods || !Array.isArray(data.foods) || data.foods.length === 0) {
          return null
        }
        
        return data.foods.map((food: any) => ({
          name: food.foodItem,
          type: food.mealType || extractMealType(originalMessage),
          calories: food.calories || undefined,
          protein: food.protein || undefined,
          carbs: food.carbs || undefined,
          fat: food.fat || undefined
        }))
      } else {
        // Handle single food format
        if (!data.foodItem) return null
        
        return {
          name: data.foodItem,
          type: extractMealType(originalMessage),
          calories: data.calories || undefined,
          protein: data.protein || undefined,
          carbs: data.carbs || undefined,
          fat: data.fat || undefined
        }
      }
    } catch (parseError) {
      console.error('Failed to parse AI food estimate:', parseError)
      return null
    }

  } catch (error) {
    console.error('AI food estimation error:', error)
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