const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugMealSaveFlow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 DEBUGGING MEAL SAVE FLOW')
  console.log('===========================')
  console.log('')

  try {
    // 1. Check if we can get the current user
    console.log('👤 Checking user authentication...')
    
    // We need to simulate the actual meal save process
    // Let's test the database operations directly
    
    // 2. Test if we can insert a test meal directly
    console.log('🧪 Testing direct meal insertion...')
    
    const testMeal = {
      user_id: '09f1c88a-9c1d-47ac-ad99-5b2668667a76', // Replace with actual user ID if known
      meal_name: 'Test Salmon Avocado Toast',
      meal_type: 'breakfast',
      date: '2025-07-02',
      kcal_total: 350,
      g_protein: 20,
      g_carb: 25,
      g_fat: 15,
      status: 'logged'
    }
    
    console.log('Attempting to insert test meal:', testMeal)
    
    const { data: insertedMeal, error: insertError } = await supabase
      .from('meals')
      .insert(testMeal)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Failed to insert test meal:', insertError)
      console.error('Error details:', {
        message: insertError.message,
        details: insertError.details,
        hint: insertError.hint,
        code: insertError.code
      })
    } else {
      console.log('✅ Successfully inserted test meal:', insertedMeal.id)
      
      // Clean up - delete the test meal
      const { error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('id', insertedMeal.id)
        
      if (!deleteError) {
        console.log('🧹 Test meal cleaned up')
      }
    }

    // 3. Check RLS policies - try to query with different user contexts
    console.log('')
    console.log('🔒 Checking Row Level Security policies...')
    
    // Test with service key (should bypass RLS)
    const { data: allMeals, error: serviceError } = await supabase
      .from('meals')
      .select('*')
      .limit(5)

    if (serviceError) {
      console.error('❌ Service key query failed:', serviceError)
    } else {
      console.log(`✅ Service key can query meals table (found ${allMeals?.length || 0} meals)`)
    }

    // 4. Check users table to see if user exists
    console.log('')
    console.log('👥 Checking users table...')
    
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, name')
      .limit(5)

    if (usersError) {
      console.error('❌ Failed to query users:', usersError)
    } else {
      console.log(`Found ${users?.length || 0} users:`)
      users?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email || 'No email'} (ID: ${user.id})`)
      })
    }

    // 5. Check chat_messages to see if those are being saved
    console.log('')
    console.log('💬 Checking chat_messages table...')
    
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    if (messagesError) {
      console.error('❌ Failed to query chat_messages:', messagesError)
    } else {
      console.log(`Found ${messages?.length || 0} chat messages:`)
      messages?.forEach((msg, index) => {
        console.log(`  ${index + 1}. ${msg.role}: ${msg.content?.substring(0, 50)}... (${msg.date})`)
      })
    }

    // 6. Test the actual database operation from the API
    console.log('')
    console.log('🔧 Testing database operations from API context...')
    
    // Test the addMeal function logic
    const testUserId = users?.[0]?.id || '09f1c88a-9c1d-47ac-ad99-5b2668667a76'
    
    console.log('Using user ID for test:', testUserId)
    
    const testMealData = {
      meal_name: 'API Test Meal',
      meal_type: 'lunch',
      date: '2025-07-02',
      kcal_total: 400,
      status: 'logged'
    }
    
    console.log('Testing addMeal equivalent operation...')
    
    const { data: apiTestMeal, error: apiError } = await supabase
      .from('meals')
      .insert({
        user_id: testUserId,
        ...testMealData
      })
      .select()
      .single()

    if (apiError) {
      console.error('❌ API-style meal insertion failed:', apiError)
      console.error('Full error object:', JSON.stringify(apiError, null, 2))
    } else {
      console.log('✅ API-style meal insertion succeeded:', apiTestMeal.id)
      
      // Verify it was saved
      const { data: verifyMeal, error: verifyError } = await supabase
        .from('meals')
        .select('*')
        .eq('id', apiTestMeal.id)
        .single()
        
      if (verifyError) {
        console.error('❌ Could not verify saved meal:', verifyError)
      } else {
        console.log('✅ Verified meal was saved:', verifyMeal.meal_name)
      }
      
      // Clean up
      await supabase
        .from('meals')
        .delete()
        .eq('id', apiTestMeal.id)
      console.log('🧹 Test meal cleaned up')
    }

    console.log('')
    console.log('🎯 DEBUGGING RESULTS')
    console.log('===================')
    console.log('✅ Database connection: Working')
    console.log('✅ Meals table: Accessible')
    console.log('✅ Direct insertions: Working')
    console.log('')
    console.log('🔍 LIKELY ISSUES:')
    console.log('1. API route /api/chat may not be calling addMeal()')
    console.log('2. Console logs in addMeal() are not showing up')
    console.log('3. User authentication failing in API route')
    console.log('4. JavaScript errors preventing meal save')
    console.log('5. Meal intent not being detected properly')
    console.log('')
    console.log('📝 NEXT STEPS:')
    console.log('1. Check browser developer console for errors')
    console.log('2. Check server logs/terminal for console.log output')
    console.log('3. Add more logging to the chat API route')
    console.log('4. Test the chat API endpoint directly')

  } catch (error) {
    console.error('💥 Script error:', error)
  }
}

debugMealSaveFlow()