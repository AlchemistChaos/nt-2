const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

async function clearTodaysMeals() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  const today = new Date().toISOString().split('T')[0]

  try {
    // Get all meals for today
    const { data: todaysMeals, error: fetchError } = await supabase
      .from('meals')
      .select('*')
      .eq('date', today)

    if (fetchError) {
      console.error('Error fetching meals:', fetchError)
      process.exit(1)
    }

    console.log(`Found ${todaysMeals?.length || 0} meals for today (${today})`)

    if (todaysMeals && todaysMeals.length > 0) {
      // Delete all meals for today
      const { data: deletedMeals, error: deleteError } = await supabase
        .from('meals')
        .delete()
        .eq('date', today)
        .select()

      if (deleteError) {
        console.error('Error deleting meals:', deleteError)
        process.exit(1)
      }

      console.log(`✅ Successfully deleted ${deletedMeals?.length || 0} meals for today`)
      
      // Show what was deleted
      if (deletedMeals && deletedMeals.length > 0) {
        console.log('\nDeleted meals:')
        deletedMeals.forEach((meal, index) => {
          console.log(`${index + 1}. ${meal.meal_name || 'Unnamed'} (${meal.meal_type || 'Unknown type'})`)
        })
      }
    } else {
      console.log('✅ No meals found for today - database is already clean')
    }

  } catch (error) {
    console.error('Script error:', error)
    process.exit(1)
  }
}

clearTodaysMeals() 