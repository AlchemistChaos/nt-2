import { NextRequest, NextResponse } from 'next/server'
import { getOpenAI } from '@/lib/openai/client'
import { getCurrentUser, getBrandByName } from '@/lib/supabase/database'
import { ImportMenuRequest, ImportMenuResponse } from '@/types'

export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      console.error('OpenAI API key is not configured')
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 })
    }

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

    const requestData: ImportMenuRequest = await request.json()
    const { brandId, brandName, brandType, file, fileType, instructions } = requestData

    // Validate required fields
    if (!file || !fileType) {
      return NextResponse.json({ error: 'File and file type are required' }, { status: 400 })
    }

    console.log('Processing menu import for user:', user.id)
    console.log('Analyze API received:', {
      brandId,
      brandName,
      brandType,
      fileType,
      hasInstructions: !!instructions,
      fileSize: file?.length
    })

    // Create OpenAI prompt based on file type and instructions
    let prompt = ''
    let openaiMessages: any[] = []

    if (fileType === 'image') {
      prompt = createImageAnalysisPrompt(instructions)
      openaiMessages = [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: [
            { 
              type: 'text', 
              text: instructions 
                ? `Please analyze this menu image. Focus on: ${instructions}`
                : 'Please analyze this menu image and extract all food items with their details.'
            },
            { 
              type: 'image_url', 
              image_url: { 
                url: file.startsWith('data:') ? file : `data:image/jpeg;base64,${file}`,
                detail: 'high'
              } 
            }
          ]
        }
      ]
    } else if (fileType === 'csv') {
      // Decode base64 CSV content
      const csvContent = Buffer.from(file, 'base64').toString('utf-8')
      prompt = createCSVAnalysisPrompt(instructions)
      openaiMessages = [
        {
          role: 'system',
          content: prompt
        },
        {
          role: 'user',
          content: instructions 
            ? `Please analyze this CSV menu data. Focus on: ${instructions}\n\nCSV Content:\n${csvContent}`
            : `Please analyze this CSV menu data and extract all food items:\n\nCSV Content:\n${csvContent}`
        }
      ]
    }

    // Call OpenAI for analysis
    const openai = getOpenAI()
    let response
    try {
      response = await openai.chat.completions.create({
        model: fileType === 'image' ? 'gpt-4o' : 'gpt-4o-mini',
        messages: openaiMessages,
        temperature: 0.1, // Low temperature for consistent extraction
        max_tokens: 4000
      })
    } catch (openaiError) {
      console.error('OpenAI API error:', openaiError)
      return NextResponse.json({ error: 'Failed to analyze menu content' }, { status: 500 })
    }

    const content = response.choices[0]?.message?.content
    if (!content) {
      return NextResponse.json({ error: 'No response from AI analysis' }, { status: 500 })
    }

    console.log('OpenAI response received, length:', content.length)

    // Parse the JSON response
    let analysisResult
    try {
      // Extract JSON from the response (might be wrapped in markdown code blocks)
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/)
      const jsonString = jsonMatch ? jsonMatch[1] : content
      analysisResult = JSON.parse(jsonString.trim())
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError)
      console.error('Raw response:', content)
      return NextResponse.json({ error: 'Failed to parse menu analysis results' }, { status: 500 })
    }

    // Validate and structure the response
    const items = Array.isArray(analysisResult.items) ? analysisResult.items : analysisResult
    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid response format from AI analysis' }, { status: 500 })
    }

    console.log('Successfully parsed', items.length, 'menu items')

    // Handle brand information for the response
    let detectedBrand = null
    
    if (brandId) {
      // User selected an existing brand - include the brand info properly
      detectedBrand = {
        id: brandId,
        name: brandName || 'Selected Brand',
        type: brandType || 'restaurant'
      }
      console.log('Using selected existing brand:', detectedBrand)
    } else if (analysisResult.detectedBrand) {
      // AI detected a brand from the content
      detectedBrand = analysisResult.detectedBrand
      console.log('Detected brand from analysis:', detectedBrand)
    } else if (brandName) {
      // User entered a new brand name
      const existingBrand = await getBrandByName(brandName)
      if (existingBrand) {
        detectedBrand = {
          id: existingBrand.id,
          name: existingBrand.name,
          type: existingBrand.type
        }
      } else {
        // Will be created in confirm step
        detectedBrand = {
          name: brandName,
          type: brandType || 'restaurant'
        }
      }
      console.log('Using brand name:', detectedBrand)
    }

    const response_data: ImportMenuResponse = {
      items: items.map((item: any) => ({
        name: item.name || item.item_name || item.title,
        description: item.description,
        category: item.category,
        price_cents: item.price_cents || (item.price ? Math.round(item.price * 100) : undefined),
        serving_size: item.serving_size,
        kcal_per_serving: item.kcal_per_serving || item.calories,
        g_protein_per_serving: item.g_protein_per_serving || item.protein,
        g_carb_per_serving: item.g_carb_per_serving || item.carbs,
        g_fat_per_serving: item.g_fat_per_serving || item.fat,
        g_fiber_per_serving: item.g_fiber_per_serving || item.fiber,
        g_sugar_per_serving: item.g_sugar_per_serving || item.sugar,
        mg_sodium_per_serving: item.mg_sodium_per_serving || item.sodium,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients : 
                    typeof item.ingredients === 'string' ? item.ingredients.split(',').map((s: string) => s.trim()) : undefined,
        allergens: Array.isArray(item.allergens) ? item.allergens :
                  typeof item.allergens === 'string' ? item.allergens.split(',').map((s: string) => s.trim()) : undefined,
        dietary_tags: Array.isArray(item.dietary_tags) ? item.dietary_tags :
                     typeof item.dietary_tags === 'string' ? item.dietary_tags.split(',').map((s: string) => s.trim()) : undefined,
        is_available: item.is_available !== false, // Default to true
        is_seasonal: item.is_seasonal === true
      })),
      detectedBrand
    }

    console.log('Analyze API sending response:', {
      itemCount: response_data.items.length,
      detectedBrand: response_data.detectedBrand
    })

    return NextResponse.json(response_data)

  } catch (error) {
    console.error('Import menu analysis error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : 'Unknown error') : undefined
      },
      { status: 500 }
    )
  }
}

function createImageAnalysisPrompt(instructions?: string): string {
  return `You are an expert at analyzing restaurant menus and food images. Extract detailed information about each food item from the provided menu image.

${instructions ? `Special instructions: ${instructions}` : ''}

IMPORTANT: Return ONLY a valid JSON object in this exact format:

{
  "detectedBrand": {
    "name": "Brand name if visible in image",
    "type": "restaurant|food_brand|cafe|etc"
  },
  "items": [
    {
      "name": "Item name",
      "description": "Description if available",
      "category": "breakfast|lunch|dinner|beverage|dessert|appetizer|snack",
      "price": 12.50,
      "serving_size": "1 item|12 oz|etc",
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 18,
      "fiber": 5,
      "sugar": 8,
      "sodium": 650,
      "ingredients": ["ingredient1", "ingredient2"],
      "allergens": ["nuts", "dairy"],
      "dietary_tags": ["vegetarian", "gluten-free"],
      "is_available": true,
      "is_seasonal": false
    }
  ]
}

Guidelines:
1. Extract ALL visible food items, not just a few examples
2. Estimate nutritional values based on typical portions and ingredients
3. Include prices in USD if visible (convert if in other currencies)
4. Categorize items appropriately (breakfast, lunch, dinner, etc.)
5. List common allergens if you can identify them from ingredients
6. Add dietary tags like "vegetarian", "vegan", "gluten-free" if obvious
7. If brand name is visible in the image, include it in detectedBrand
8. Be conservative with nutritional estimates - better to underestimate than overestimate
9. If no nutrition info is visible, make reasonable estimates based on item type and typical portions
10. Include ingredient lists when descriptions provide enough detail

Focus on accuracy and completeness. Extract as much detail as possible while being realistic about nutritional estimates.`
}

function createCSVAnalysisPrompt(instructions?: string): string {
  return `You are an expert at analyzing CSV menu data. Parse the provided CSV content and extract detailed information about each food item.

${instructions ? `Special instructions: ${instructions}` : ''}

IMPORTANT: Return ONLY a valid JSON object in this exact format:

{
  "detectedBrand": {
    "name": "Brand name if available in data",
    "type": "restaurant|food_brand|cafe|etc"
  },
  "items": [
    {
      "name": "Item name",
      "description": "Description if available",
      "category": "breakfast|lunch|dinner|beverage|dessert|appetizer|snack",
      "price": 12.50,
      "serving_size": "1 item|12 oz|etc",
      "calories": 450,
      "protein": 25,
      "carbs": 30,
      "fat": 18,
      "fiber": 5,
      "sugar": 8,
      "sodium": 650,
      "ingredients": ["ingredient1", "ingredient2"],
      "allergens": ["nuts", "dairy"],
      "dietary_tags": ["vegetarian", "gluten-free"],
      "is_available": true,
      "is_seasonal": false
    }
  ]
}

Guidelines:
1. Parse ALL rows of data (skip headers)
2. Map CSV columns to the appropriate JSON fields
3. Convert prices to numbers (remove currency symbols)
4. Parse nutritional values as numbers
5. Split ingredient lists and allergen lists into arrays
6. Estimate missing nutritional values based on similar items and typical portions
7. Categorize items appropriately (breakfast, lunch, dinner, etc.)
8. Clean up text fields (trim whitespace, handle special characters)
9. If brand information is in the CSV, include it in detectedBrand
10. Handle missing or malformed data gracefully

Common CSV column mappings:
- Item/Name/Product → name
- Description/Details → description  
- Price/Cost → price
- Calories/Cal/Energy → calories
- Protein/Prot → protein
- Carbs/Carbohydrates → carbs
- Fat/Fats → fat
- Category/Type/Section → category
- Ingredients/Contains → ingredients
- Allergens/Allergy → allergens

Extract as much detail as possible while maintaining data accuracy.`
} 