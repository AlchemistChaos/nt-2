const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugAuthFlow() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 DEBUGGING AUTHENTICATION FLOW')
  console.log('================================')
  console.log('')

  try {
    // 1. Check auth.users table (system table)
    console.log('👤 Checking auth.users table...')
    
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
    
    if (authError) {
      console.error('❌ Failed to query auth.users:', authError)
    } else {
      console.log(`Found ${authUsers?.users?.length || 0} authenticated users:`)
      authUsers?.users?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email || 'No email'} (Auth ID: ${user.id})`)
        console.log(`     - Created: ${user.created_at}`)
        console.log(`     - Last sign in: ${user.last_sign_in_at || 'Never'}`)
        console.log('')
      })
    }

    // 2. Check public.users table (our custom users table)
    console.log('👥 Checking public.users table...')
    
    const { data: publicUsers, error: publicError } = await supabase
      .from('users')
      .select('*')

    if (publicError) {
      console.error('❌ Failed to query public.users:', publicError)
    } else {
      console.log(`Found ${publicUsers?.length || 0} users in public.users:`)
      publicUsers?.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email || 'No email'} (User ID: ${user.id})`)
        console.log(`     - Auth User ID: ${user.auth_user_id}`)
        console.log(`     - Created: ${user.created_at}`)
        console.log('')
      })
    }

    // 3. Check for orphaned auth users (exist in auth.users but not in public.users)
    if (authUsers?.users && publicUsers) {
      console.log('🔍 Checking for orphaned auth users...')
      
      const authUserIds = new Set(authUsers.users.map(u => u.id))
      const publicAuthUserIds = new Set(publicUsers.map(u => u.auth_user_id))
      
      const orphanedAuthUsers = authUsers.users.filter(authUser => 
        !publicAuthUserIds.has(authUser.id)
      )
      
      if (orphanedAuthUsers.length > 0) {
        console.log(`❌ Found ${orphanedAuthUsers.length} orphaned auth users (exist in auth.users but not in public.users):`)
        orphanedAuthUsers.forEach((user, index) => {
          console.log(`  ${index + 1}. ${user.email || 'No email'} (Auth ID: ${user.id})`)
        })
        console.log('')
        console.log('💡 Solution: Create user records in public.users table for these auth users')
      } else {
        console.log('✅ No orphaned auth users found')
      }
    }

    // 4. Create a test user if none exist
    if (authUsers?.users?.length === 0) {
      console.log('🧪 No auth users found. This explains why meals cannot be saved.')
      console.log('💡 You need to sign up/login to the app first to create a user account.')
    } else if (publicUsers?.length === 0 && authUsers?.users?.length > 0) {
      console.log('🧪 Auth users exist but no public.users records found.')
      console.log('💡 Creating missing public.users records...')
      
      for (const authUser of authUsers.users) {
        try {
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              auth_user_id: authUser.id,
              email: authUser.email,
              name: authUser.user_metadata?.name || null
            })
            .select()
            .single()

          if (createError) {
            console.error(`❌ Failed to create user record for ${authUser.email}:`, createError)
          } else {
            console.log(`✅ Created user record for ${authUser.email} (ID: ${newUser.id})`)
          }
        } catch (error) {
          console.error(`❌ Error creating user record for ${authUser.email}:`, error)
        }
      }
    }

    // 5. Test meal insertion with correct user context if we now have users
    console.log('')
    console.log('🧪 Testing meal insertion with authentication context...')
    
    // Re-check public users after potential creation
    const { data: updatedUsers } = await supabase
      .from('users')
      .select('*')
      .limit(1)

    if (updatedUsers && updatedUsers.length > 0) {
      const testUser = updatedUsers[0]
      console.log(`Using user for test: ${testUser.email} (ID: ${testUser.id})`)
      
      // Test meal insertion with the correct user_id
      const testMeal = {
        user_id: testUser.id,
        meal_name: 'Authentication Test Meal',
        meal_type: 'snack',
        date: '2025-07-02',
        kcal_total: 100,
        status: 'logged'
      }
      
      const { data: savedMeal, error: mealError } = await supabase
        .from('meals')
        .insert(testMeal)
        .select()
        .single()

      if (mealError) {
        console.error('❌ Still cannot insert meal:', mealError)
        
        if (mealError.code === '42501') {
          console.log('💡 RLS still blocking - this means the API is not authenticating properly')
          console.log('💡 Check if the API route is using the correct Supabase client with user context')
        }
      } else {
        console.log('✅ Successfully inserted test meal:', savedMeal.id)
        
        // Clean up test meal
        await supabase
          .from('meals')
          .delete()
          .eq('id', savedMeal.id)
        console.log('🧹 Cleaned up test meal')
      }
    }

    console.log('')
    console.log('🎯 AUTHENTICATION DEBUGGING SUMMARY')
    console.log('===================================')
    console.log('Database Structure:')
    console.log('1. auth.users (Supabase Auth) - system managed')
    console.log('2. public.users - custom user profiles linked to auth users')
    console.log('')
    console.log('RLS Requirements for meals:')
    console.log('1. User must be authenticated (auth.uid() exists)')
    console.log('2. User record must exist in public.users')
    console.log('3. user_id in meal must match authenticated user\'s public.users.id')
    console.log('')
    console.log('🔧 NEXT STEPS:')
    console.log('1. Sign up/login to the app to create auth user')
    console.log('2. Ensure user record is created in public.users table')
    console.log('3. Check that API routes use authenticated Supabase client')
    console.log('4. Verify getCurrentUser() function works in API context')

  } catch (error) {
    console.error('💥 Script error:', error)
  }
}

debugAuthFlow()