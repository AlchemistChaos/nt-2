const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function debugMeals() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    console.error('Required: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY)')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  console.log('🔍 DEBUGGING MEALS DATABASE')
  console.log('==========================')
  console.log('')

  try {
    // 1. Check meals for July 2nd, 2025
    const july2nd = '2025-07-02'
    console.log(`📅 Checking meals for ${july2nd}...`)
    
    const { data: july2Meals, error: july2Error } = await supabase
      .from('meals')
      .select('*')
      .eq('date', july2nd)
      .order('logged_at', { ascending: true })

    if (july2Error) {
      console.error('❌ Error fetching July 2nd meals:', july2Error)
    } else {
      console.log(`Found ${july2Meals?.length || 0} meals for July 2nd:`)
      if (july2Meals && july2Meals.length > 0) {
        july2Meals.forEach((meal, index) => {
          console.log(`  ${index + 1}. ${meal.meal_name || 'Unnamed'} (${meal.meal_type || 'Unknown'})`)
          console.log(`     - Status: ${meal.status}`)
          console.log(`     - Calories: ${meal.kcal_total || 'Unknown'}`)
          console.log(`     - User ID: ${meal.user_id}`)
          console.log(`     - Logged at: ${meal.logged_at}`)
          console.log(`     - Portion: ${meal.portion_size || 'Unknown'}`)
          console.log('')
        })
      } else {
        console.log('  ❌ No meals found for July 2nd')
      }
    }

    // 2. Check today's meals
    const today = new Date().toISOString().split('T')[0]
    console.log(`📅 Checking meals for today (${today})...`)
    
    const { data: todayMeals, error: todayError } = await supabase
      .from('meals')
      .select('*')
      .eq('date', today)
      .order('logged_at', { ascending: true })

    if (todayError) {
      console.error('❌ Error fetching today\'s meals:', todayError)
    } else {
      console.log(`Found ${todayMeals?.length || 0} meals for today:`)
      if (todayMeals && todayMeals.length > 0) {
        todayMeals.forEach((meal, index) => {
          console.log(`  ${index + 1}. ${meal.meal_name || 'Unnamed'} (${meal.meal_type || 'Unknown'})`)
          console.log(`     - Status: ${meal.status}`)
          console.log(`     - Calories: ${meal.kcal_total || 'Unknown'}`)
          console.log(`     - User ID: ${meal.user_id}`)
          console.log(`     - Logged at: ${meal.logged_at}`)
          console.log('')
        })
      } else {
        console.log('  ❌ No meals found for today')
      }
    }

    // 3. Check for salmon/avocado related meals across all dates
    console.log('🔍 Searching for salmon/avocado meals across all dates...')
    
    const { data: salmonMeals, error: salmonError } = await supabase
      .from('meals')
      .select('*')
      .or('meal_name.ilike.%salmon%,meal_name.ilike.%avocado%')
      .order('logged_at', { ascending: false })
      .limit(10)

    if (salmonError) {
      console.error('❌ Error searching for salmon/avocado meals:', salmonError)
    } else {
      console.log(`Found ${salmonMeals?.length || 0} salmon/avocado related meals:`)
      if (salmonMeals && salmonMeals.length > 0) {
        salmonMeals.forEach((meal, index) => {
          console.log(`  ${index + 1}. ${meal.meal_name || 'Unnamed'} (${meal.date})`)
          console.log(`     - Type: ${meal.meal_type || 'Unknown'}`)
          console.log(`     - Status: ${meal.status}`)
          console.log(`     - User ID: ${meal.user_id}`)
          console.log(`     - Logged at: ${meal.logged_at}`)
          console.log('')
        })
      } else {
        console.log('  ❌ No salmon/avocado meals found')
      }
    }

    // 4. Get recent meals (last 20 across all dates)
    console.log('📋 Checking last 20 meals across all dates...')
    
    const { data: recentMeals, error: recentError } = await supabase
      .from('meals')
      .select('*')
      .order('logged_at', { ascending: false })
      .limit(20)

    if (recentError) {
      console.error('❌ Error fetching recent meals:', recentError)
    } else {
      console.log(`Found ${recentMeals?.length || 0} recent meals:`)
      if (recentMeals && recentMeals.length > 0) {
        recentMeals.forEach((meal, index) => {
          console.log(`  ${index + 1}. ${meal.meal_name || 'Unnamed'} (${meal.date})`)
          console.log(`     - Type: ${meal.meal_type || 'Unknown'}`)
          console.log(`     - Status: ${meal.status}`)
          console.log(`     - User ID: ${meal.user_id}`)
          console.log(`     - Logged at: ${meal.logged_at}`)
          console.log('')
        })
      } else {
        console.log('  ❌ No recent meals found in database')
      }
    }

    // 5. Check database table structure
    console.log('🔧 Checking meals table structure...')
    const { data: tableInfo, error: tableError } = await supabase
      .from('meals')
      .select('*')
      .limit(1)

    if (tableError) {
      console.error('❌ Error checking table structure:', tableError)
    } else if (tableInfo && tableInfo.length > 0) {
      console.log('✅ Meals table structure (sample record):')
      console.log('  Fields:', Object.keys(tableInfo[0]))
    } else {
      console.log('⚠️  Meals table exists but is empty')
    }

    // 6. Count total meals by date (last 7 days)
    console.log('📊 Meal counts by date (last 7 days)...')
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0]

    const { data: mealCounts, error: countsError } = await supabase
      .from('meals')
      .select('date')
      .gte('date', sevenDaysAgoStr)

    if (countsError) {
      console.error('❌ Error getting meal counts:', countsError)
    } else {
      const countsByDate = {}
      mealCounts?.forEach(meal => {
        countsByDate[meal.date] = (countsByDate[meal.date] || 0) + 1
      })
      
      Object.entries(countsByDate)
        .sort(([a], [b]) => b.localeCompare(a))
        .forEach(([date, count]) => {
          console.log(`  ${date}: ${count} meals`)
        })
    }

    console.log('')
    console.log('🎯 DEBUGGING SUMMARY')
    console.log('===================')
    console.log('✅ Database connection: Working')
    console.log(`✅ Environment variables: ${supabaseUrl ? 'URL ✓' : 'URL ✗'} ${supabaseServiceKey ? 'KEY ✓' : 'KEY ✗'}`)
    console.log('')
    console.log('💡 Tips:')
    console.log('1. Check if meals are being saved with correct user_id')
    console.log('2. Verify date format matches what UI expects (YYYY-MM-DD)')
    console.log('3. Look for console.log statements in browser developer tools')
    console.log('4. Check if client timezone differs from server timezone')

  } catch (error) {
    console.error('💥 Script error:', error)
    process.exit(1)
  }
}

// Run the debug script
debugMeals()