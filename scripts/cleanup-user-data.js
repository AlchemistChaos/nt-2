const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Read environment variables from .env.local
const envPath = path.join(__dirname, '..', '.env.local')
const envContent = fs.readFileSync(envPath, 'utf8')
const envVars = {}

envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=')
  if (key && value) {
    envVars[key.trim()] = value.trim()
  }
})

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use anon key since we're deleting user's own data
)

const USER_ID = '09f1c88a-9c1d-47ac-ad99-5b2668667a76'

async function cleanupUserData() {
  console.log('🧹 Starting cleanup for user:', USER_ID)
  console.log('This will delete ALL meals, preferences, and chat messages...')
  console.log('')

  try {
    // Delete meals
    console.log('🗑️  Deleting meals...')
    const { data: deletedMeals, error: mealsError } = await supabase
      .from('meals')
      .delete()
      .eq('user_id', USER_ID)
    
    if (mealsError) throw mealsError
    console.log(`✅ Deleted ${deletedMeals?.length || 0} meals`)

    // Delete preferences
    console.log('🗑️  Deleting preferences...')
    const { data: deletedPrefs, error: prefsError } = await supabase
      .from('preferences')
      .delete()
      .eq('user_id', USER_ID)
    
    if (prefsError) throw prefsError
    console.log(`✅ Deleted ${deletedPrefs?.length || 0} preferences`)

    // Delete chat messages
    console.log('🗑️  Deleting chat messages...')
    const { data: deletedMessages, error: messagesError } = await supabase
      .from('chat_messages')
      .delete()
      .eq('user_id', USER_ID)
    
    if (messagesError) throw messagesError
    console.log(`✅ Deleted ${deletedMessages?.length || 0} chat messages`)

    console.log('')
    console.log('🔍 Verifying cleanup...')

    // Verify cleanup
    const { data: remainingMeals } = await supabase
      .from('meals')
      .select('id')
      .eq('user_id', USER_ID)

    const { data: remainingPrefs } = await supabase
      .from('preferences')
      .select('id')
      .eq('user_id', USER_ID)

    const { data: remainingMessages } = await supabase
      .from('chat_messages')
      .select('id')
      .eq('user_id', USER_ID)

    console.log(`Remaining meals: ${remainingMeals?.length || 0}`)
    console.log(`Remaining preferences: ${remainingPrefs?.length || 0}`)
    console.log(`Remaining messages: ${remainingMessages?.length || 0}`)

    console.log('')
    console.log('🎉 Cleanup completed successfully!')
    console.log('Your user account is preserved but all data has been cleaned up.')

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanupUserData() 