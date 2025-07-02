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

// Validate and normalize portion size values
function validatePortionSize(portionSize: string | undefined): string {
  if (!portionSize || typeof portionSize !== 'string') {
    return 'full'
  }
  
  const validPortions = ['1/4', '1/2', '3/4', 'full', '2x']
  const normalized = portionSize.toLowerCase().trim()
  
  // Check if already valid
  if (validPortions.includes(portionSize)) {
    return portionSize
  }
  
  // Convert common variations
  const conversions: { [key: string]: string } = {
    'half': '1/2',
    'quarter': '1/4',
    'three quarters': '3/4',
    'double': '2x',
    '2': '2x',
    'twice': '2x',
    'whole': 'full',
    'complete': 'full',
    'entire': 'full'
  }
  
  return conversions[normalized] || 'full'
}


export async function POST(request: NextRequest) {
  console.log('🚀 CHAT API CALLED - YOU SHOULD SEE THIS LOG!')
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

    const { message, image, clientDate } = await request.json()

    // Get current user with detailed logging
    let user
    try {
      console.log('🔍 Attempting to get current user...')
      user = await getCurrentUser()
      console.log('👤 getCurrentUser result:', user ? `User found: ${user.id}` : 'No user found')
    } catch (userError) {
      console.error('❌ Failed to get current user:', userError)
      return NextResponse.json({ error: 'Failed to authenticate user' }, { status: 401 })
    }
    
    if (!user) {
      console.error('❌ No user returned from getCurrentUser - user is null/undefined')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    console.log('✅ User authenticated successfully:', { id: user.id, email: user.email })

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
          let action = null
          try {
            action = await processIntentAndTakeAction(fullResponse, message, image, user.id)
            console.log('🎯 Intent processing completed, action result:', action ? 'SUCCESS' : 'NO_ACTION')
          } catch (actionError) {
            console.error('❌ Error processing intent/action:', actionError)
            action = { type: 'error', error: 'Failed to process action' }
          }

          // Send action if any - ensuring controller is still open
          try {
            if (action) {
              console.log('✅ Sending action to client:', action)
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ action })}\n\n`))
            } else {
              console.log('🔍 No action to send to client')
            }
          } catch (sendError) {
            console.error('❌ Failed to send action to client:', sendError)
          }

          // Save assistant message
          try {
            await addChatMessage(user.id, 'assistant', fullResponse)
          } catch (saveError) {
            console.error('❌ Failed to save assistant message:', saveError)
          }

          // Close the stream
          try {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            console.log('🏁 Stream closed successfully')
          } catch (closeError) {
            console.error('❌ Error closing stream:', closeError)
          }
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
  console.log('🤔 Processing intent for message:', userMessage)

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
      // Check if user explicitly wants to bypass library
      const bypassLibrary = lowerMessage.includes('not in library') || 
                           lowerMessage.includes('not in the library') ||
                           lowerMessage.includes('skip library') ||
                           lowerMessage.includes('manual entry') ||
                           lowerMessage.includes('estimate only')
              console.log('🎯 Meal intent detected! Processing message:', userMessage)
        console.log('📚 Bypass library:', bypassLibrary)
        const mealsData = await processMealFromMessage(userMessage, image, bypassLibrary)
        console.log('📊 Processed meal data:', mealsData)
      
      if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
        
        try {
          const savedMeals = []
          
          // Process each meal individually
          for (const mealData of mealsData) {
            if (mealData.name) {
              try {
                console.log('💾 Attempting to save meal:', {
                  name: mealData.name,
                  type: mealData.type || getMealTypeFromTime(),
                  calories: mealData.calories,
                  portion: mealData.portionSize
                })
                
                const meal = await addMeal(userId, {
                  meal_name: mealData.name,
                  meal_type: mealData.type || getMealTypeFromTime(),
                  portion_size: mealData.portionSize || 'full',
                  date: (() => {
                    // Use server's current date in YYYY-MM-DD format
                    const now = new Date()
                    const year = now.getFullYear()
                    const month = String(now.getMonth() + 1).padStart(2, '0')
                    const day = String(now.getDate()).padStart(2, '0')
                    const dateToUse = `${year}-${month}-${day}`
                    console.log('📅 Using date for meal:', dateToUse)
                    return dateToUse
                  })(),
                  kcal_total: mealData.calories ? Math.ceil(mealData.calories) : undefined,
                  g_protein: mealData.protein ? Math.ceil(mealData.protein) : undefined,
                  g_carb: mealData.carbs ? Math.ceil(mealData.carbs) : undefined,
                  g_fat: mealData.fat ? Math.ceil(mealData.fat) : undefined,
                  status: 'logged' as const
                })
                
                if (meal) {
                  console.log('✅ Meal saved successfully:', meal.id, meal.meal_name)
                  savedMeals.push(meal)
                } else {
                  console.error('❌ Failed to save meal - returned null:', mealData.name)
                }
              } catch (error) {
                console.error('❌ Error saving meal:', mealData.name, error)
              }
            } else {
              console.warn('⚠️ Skipping meal with no name:', mealData)
            }
          }
          
          if (savedMeals.length > 0) {
            return { 
              type: 'meal_logged', 
              data: savedMeals.length === 1 ? savedMeals[0] : savedMeals,
              count: savedMeals.length
            }
          } else {
            return null
          }
        } catch (error) {
          console.error('Failed to save meals:', error)
          return null
        }
      } else {
        return null
      }
    }

    // Intent: Plan a meal
    if (lowerMessage.includes('plan') && (lowerMessage.includes('meal') || lowerMessage.includes('dinner') || lowerMessage.includes('lunch') || lowerMessage.includes('breakfast'))) {
      const mealsData = await processMealFromMessage(userMessage, image, false)
      if (mealsData && Array.isArray(mealsData) && mealsData.length > 0) {
        const savedMeals = []
        
        for (const mealData of mealsData) {
          if (mealData.name) {
            const meal = await addMeal(userId, {
              meal_name: mealData.name,
              meal_type: mealData.type || getMealTypeFromTime(),
              portion_size: mealData.portionSize || 'full',
              date: (() => {
                // Use server's current date in YYYY-MM-DD format
                const now = new Date()
                const year = now.getFullYear()
                const month = String(now.getMonth() + 1).padStart(2, '0')
                const day = String(now.getDate()).padStart(2, '0')
                const localDate = `${year}-${month}-${day}`
                console.log('📅 Using local date for planned meal:', localDate)
                return localDate
              })(),
              kcal_total: mealData.calories ? Math.ceil(mealData.calories) : undefined,
              g_protein: mealData.protein ? Math.ceil(mealData.protein) : undefined,
              g_carb: mealData.carbs ? Math.ceil(mealData.carbs) : undefined,
              g_fat: mealData.fat ? Math.ceil(mealData.fat) : undefined,
              status: 'planned' as const
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
        const mealsData = image ? await processMealFromMessage(userMessage, image, false) : null
        // Use first meal's data if multiple meals extracted
        const mealData = mealsData && Array.isArray(mealsData) && mealsData.length > 0 ? mealsData[0] : null
        
        const updatedMeal = await updateMeal(plannedMeal.id, {
          status: 'logged',
          kcal_total: mealData?.calories ? Math.ceil(mealData.calories) : plannedMeal.kcal_total,
          g_protein: mealData?.protein ? Math.ceil(mealData.protein) : plannedMeal.g_protein,
          g_carb: mealData?.carbs ? Math.ceil(mealData.carbs) : plannedMeal.g_carb,
          g_fat: mealData?.fat ? Math.ceil(mealData.fat) : plannedMeal.g_fat
        })

        return { type: 'meal_updated', data: updatedMeal }
      }
    }

  } catch (error) {
    console.error('Intent processing error:', error)
  }

  console.log('❌ No intent matched for message:', userMessage)
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
    // Get all available library items
    const libraryItems = await getAllLibraryItems()
    
    if (libraryItems.length === 0) {
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
4. BE VERY CONSERVATIVE - only return HIGH confidence matches for very similar items
5. If there's any ambiguity about the match, return id: null
6. "grilled beef" should NOT match "pastelitos" - these are completely different foods
7. Only match if the foods are essentially the same thing with minor variations

Examples of GOOD matches (high confidence):
- "banana bread" → "Banana Bread Slice" ✅
- "avocado toast" → "Avocado Toast" ✅
- "scrambled eggs" → "Scrambled Eggs" ✅

Examples of BAD matches (should return null):
- "grilled beef" → "pastelitos" ❌ (completely different foods)
- "chicken salad" → "fruit salad" ❌ (different main ingredient)
- "rice" → "rice cake" ❌ (different preparation)`

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
      
      if (result.match && result.match.id !== null && result.match.confidence === 'high') {
        const matchedItem = libraryItems[result.match.id]
        
        if (matchedItem) {
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
      
      return null
      
    } catch (parseError) {
      console.error('Failed to parse library matching result:', parseError)
      return null
    }

  } catch (error) {
    console.error('Library search error:', error)
    return null
  }
}

async function processMealFromMessage(userMessage: string, image?: string, bypassLibrary?: boolean) {
  try {
    // First, try to extract foods with their meal types
    console.log('🔍 Extracting foods from message:', userMessage)
    const extractedFoods = await extractFoodsWithMealTypes(userMessage)
    console.log('🥘 Extracted foods:', extractedFoods)
    
    if (extractedFoods && extractedFoods.length > 0) {
      const processedMeals = []
      
      for (const food of extractedFoods) {
        let libraryMatch = null
        
        // Only try library search if not bypassed
        if (!bypassLibrary) {
          libraryMatch = await findLibraryMatch(food.name)
          console.log(`🔍 Library match for "${food.name}":`, libraryMatch ? `${libraryMatch.name} (${libraryMatch.confidence})` : 'none')
        } else {
          console.log(`📚 Skipping library search for "${food.name}" per user request`)
        }
        
        if (libraryMatch && libraryMatch.confidence === 'high') {
          // Only use library matches with high confidence
          const portionAdjustedNutrition = await getAIPortionCalculation(
            food.name,
            food.portionSize || 'full',
            {
              calories: libraryMatch.calories || 0,
              protein: libraryMatch.protein || 0,
              carbs: libraryMatch.carbs || 0,
              fat: libraryMatch.fat || 0
            }
          )
          
          processedMeals.push({
            name: libraryMatch.name,
            type: food.type || extractMealType(userMessage),
            portionSize: food.portionSize || 'full',
            calories: portionAdjustedNutrition.calories,
            protein: portionAdjustedNutrition.protein,
            carbs: portionAdjustedNutrition.carbs,
            fat: portionAdjustedNutrition.fat,
            source: `Library (${libraryMatch.brand})`
          })
        } else {
          // Use AI estimation for unclear matches or when library bypassed
          if (libraryMatch && libraryMatch.confidence !== 'high') {
            console.log(`⚠️ Uncertain library match for "${food.name}": found "${libraryMatch.name}" but confidence is ${libraryMatch.confidence}`)
          }
          
          const aiEstimate = await getAIFoodEstimate(food.name, userMessage, false, food.portionSize, bypassLibrary)
          if (aiEstimate) {
            processedMeals.push({
              ...aiEstimate,
              type: food.type || aiEstimate.type,
              portionSize: food.portionSize || 'full',
              source: libraryMatch ? `AI Estimate (uncertain library match: ${libraryMatch.name})` : 'AI Estimate'
            })
          }
        }
      }
      
      if (processedMeals.length > 0) {
        return processedMeals
      }
    }
    
    // If no foods extracted, fall back to original AI processing
    return await getAIFoodEstimate(userMessage, userMessage, true, undefined, bypassLibrary)
    
  } catch (error) {
    console.error('Meal processing error:', error)
    return null
  }
}

// Extract food names WITH their meal types and portion sizes from the user message
async function extractFoodsWithMealTypes(userMessage: string): Promise<Array<{name: string, type?: string, portionSize?: string}>> {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key not configured')
      return []
    }

    const openai = getOpenAI()
    
    const extractionPrompt = `Extract food names with their meal types and portion sizes from this message. Return a JSON array of objects.

User message: "${userMessage}"

Return format: [{"name": "food1", "type": "breakfast|lunch|dinner|snack", "portionSize": "1/2|3/4|1/4|2x|full"}, ...]

Rules:
1. Extract ONLY food names (e.g., "protein pancake", "snickers drink")
2. Determine meal type STRICTLY from the explicit context words in the message - ignore food associations
3. Look for explicit meal type keywords: "breakfast", "lunch", "dinner", "snack"
4. NEVER assume meal type based on the food item itself - only use explicit context
5. Extract portion size if mentioned (1/2, 3/4, 1/4, half, quarter, full, 2x, etc.)
6. Remove phrases like "add", "had", "for"
7. Each food should be a separate object with name, type, and portionSize
8. If meal type not explicitly mentioned for a food, use null for type
9. If portion size not specified, use "full" as default
10. Convert text portions to fractions (half → 1/2, quarter → 1/4, three quarters → 3/4)
11. If no foods found, return empty array []

CRITICAL: Pay attention to explicit meal context words like "for breakfast", "for lunch", "for dinner", "for snack" and use ONLY those words to determine meal type.

Examples:
- "add banana bread for breakfast" → [{"name": "banana bread", "type": "breakfast", "portionSize": "full"}]
- "i had half a banana bread for dinner" → [{"name": "banana bread", "type": "dinner", "portionSize": "1/2"}]
- "i had 3/4 of a salmon avocado toast for breakfast" → [{"name": "salmon avocado toast", "type": "breakfast", "portionSize": "3/4"}]
- "half a protein bar for snack" → [{"name": "protein bar", "type": "snack", "portionSize": "1/2"}]
- "i ate a quarter of the pizza" → [{"name": "pizza", "type": null, "portionSize": "1/4"}]
- "2 protein pancakes for dinner" → [{"name": "protein pancake", "type": "dinner", "portionSize": "2x"}]
- "i had cereal for dinner" → [{"name": "cereal", "type": "dinner", "portionSize": "full"}]`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: extractionPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.1,
      max_tokens: 200
    })

    const content = response.choices[0]?.message?.content
    if (!content) return []

    try {
      const foodsWithTypes = JSON.parse(content.trim())
      return Array.isArray(foodsWithTypes) ? foodsWithTypes : []
    } catch {
      return []
    }
  } catch (error) {
    console.error('Food extraction error:', error)
    return []
  }
}

// Get AI nutrition estimate for a food (fallback method)
async function getAIFoodEstimate(foodName: string, originalMessage: string, isFullMessage = false, portionSize?: string, bypassLibrary?: boolean) {
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

Food: "${foodName}"${portionSize ? `\nPortion: ${portionSize}` : ''}

Please respond with ONLY a JSON object in this exact format:
{
  "foodItem": "${foodName}",
  "calories": number (estimated calories${portionSize ? ` for ${portionSize} portion` : ' for a typical serving'}),
  "protein": number (grams of protein),
  "carbs": number (grams of carbohydrates),
  "fat": number (grams of fat)
}

${portionSize ? `Calculate nutrition values for "${portionSize}" portion. If "${portionSize}" is "1/2" or "half", use half the typical serving nutrition. If "3/4", use 3/4 of typical nutrition, etc.` : 'Use realistic nutritional values for a typical serving size.'}`

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

// Let AI calculate portion-adjusted nutrition from known nutrition values
async function getAIPortionCalculation(
  foodName: string,
  portionSize: string,
  fullPortionNutrition: { calories: number; protein: number; carbs: number; fat: number }
) {
  try {
    const openai = getOpenAI()
    
    const prompt = `Calculate the nutrition for a specific portion size.

Food: ${foodName}
Portion: ${portionSize}
Full portion nutrition:
- Calories: ${fullPortionNutrition.calories}
- Protein: ${fullPortionNutrition.protein}g
- Carbs: ${fullPortionNutrition.carbs}g  
- Fat: ${fullPortionNutrition.fat}g

Calculate the nutrition for "${portionSize}" and respond with ONLY a JSON object:
{
  "calories": number,
  "protein": number,
  "carbs": number,
  "fat": number
}

Examples:
- If portion is "1/2" or "half", multiply all values by 0.5
- If portion is "3/4", multiply all values by 0.75
- If portion is "2x" or "double", multiply all values by 2
- If portion is "full", use the original values`

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `Calculate nutrition for ${portionSize} of ${foodName}` }
      ],
      temperature: 0.1,
      max_tokens: 150
    })

    const content = response.choices[0]?.message?.content
    if (!content) return fullPortionNutrition

    try {
      const result = JSON.parse(content.trim())
      return {
        calories: Math.ceil(result.calories || 0),
        protein: Math.ceil(result.protein || 0),
        carbs: Math.ceil(result.carbs || 0),
        fat: Math.ceil(result.fat || 0)
      }
    } catch {
      return fullPortionNutrition
    }
  } catch (error) {
    console.error('AI portion calculation error:', error)
    return fullPortionNutrition
  }
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