const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMeals() {
  console.log('🔍 Checking meals in database...')
  console.log('🔗 Supabase URL:', supabaseUrl)
  console.log('🔑 Using key ending in:', supabaseKey.slice(-8))
  
  // Get all meals from today and yesterday
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const todayStr = today.toISOString().split('T')[0]
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  
  console.log('📅 Checking dates:', { today: todayStr, yesterday: yesterdayStr })
  
  // Check ALL meals first
  const { data: allMeals, error: allError } = await supabase
    .from('meals')
    .select('*')
    .order('date', { ascending: false })
    .limit(20)
    
  console.log('📊 ALL RECENT MEALS:')
  allMeals?.forEach(meal => {
    console.log(`- ${meal.meal_name} (${meal.meal_type}) - ${meal.date} - User: ${meal.user_id}`)
  })
  
  const { data: meals, error } = await supabase
    .from('meals')
    .select('*')
    .in('date', [todayStr, yesterdayStr])
    .order('date', { ascending: false })
  
  if (error) {
    console.error('❌ Error fetching meals:', error)
    return
  }
  
  console.log(`📊 Found ${meals?.length || 0} meals:`)
  meals?.forEach(meal => {
    console.log(`- ${meal.meal_name} (${meal.meal_type}) - ${meal.date} - ${meal.kcal_total} kcal`)
  })
  
  // Also check users table
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email, created_at')
  
  if (usersError) {
    console.error('❌ Error fetching users:', usersError)
  } else {
    console.log(`👥 Found ${users?.length || 0} users:`)
    users?.forEach(user => {
      console.log(`- ${user.email} (${user.id})`)
    })
  }
}

checkMeals().catch(console.error)