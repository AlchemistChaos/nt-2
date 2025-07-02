const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function createUserRecord() {
  console.log('🔍 Getting authenticated users from auth.users...')
  
  // Get auth users (this requires service role key)
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()
  
  if (authError) {
    console.error('❌ Error fetching auth users:', authError)
    console.log('ℹ️ This might need a service role key. Checking current auth user instead...')
    
    // Try to get current user session instead
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      console.error('❌ No authenticated user found:', userError)
      return
    }
    
    console.log('✅ Found authenticated user:', { id: user.id, email: user.email })
    await createUserRecordForAuthUser(user)
    return
  }
  
  console.log(`👥 Found ${authUsers.users?.length || 0} auth users`)
  
  for (const authUser of authUsers.users) {
    console.log(`📧 Auth user: ${authUser.email} (${authUser.id})`)
    await createUserRecordForAuthUser(authUser)
  }
}

async function createUserRecordForAuthUser(authUser) {
  // Check if user already exists in users table
  const { data: existingUser } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authUser.id)
    .single()
  
  if (existingUser) {
    console.log(`✅ User record already exists for ${authUser.email}`)
    return
  }
  
  // Create user record
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({
      auth_user_id: authUser.id,
      email: authUser.email,
      name: authUser.user_metadata?.name || authUser.email.split('@')[0]
    })
    .select()
    .single()
  
  if (createError) {
    console.error(`❌ Error creating user record for ${authUser.email}:`, createError)
  } else {
    console.log(`✅ Created user record for ${authUser.email}:`, newUser.id)
  }
}

createUserRecord().catch(console.error)