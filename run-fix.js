const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runFix() {
  console.log('🔧 Running user creation fix...')
  
  // Read the SQL file
  const sql = fs.readFileSync('fix-user-creation.sql', 'utf8')
  
  try {
    const { data, error } = await supabase.rpc('exec', { sql })
    
    if (error) {
      console.error('❌ Error running SQL:', error)
      console.log('ℹ️ You may need to run this SQL manually in the Supabase dashboard')
    } else {
      console.log('✅ SQL executed successfully:', data)
    }
  } catch (err) {
    console.error('❌ Failed to execute SQL:', err.message)
    console.log('ℹ️ Please run the SQL manually in your Supabase dashboard:')
    console.log('📝 File: fix-user-creation.sql')
  }
  
  // Check if users were created
  console.log('\n🔍 Checking for users after fix...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
  
  if (usersError) {
    console.error('❌ Error checking users:', usersError)
  } else {
    console.log(`👥 Found ${users?.length || 0} users:`)
    users?.forEach(user => {
      console.log(`- ${user.email} (${user.id})`)
    })
  }
}

runFix().catch(console.error)