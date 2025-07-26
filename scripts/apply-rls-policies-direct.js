const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyRLSPoliciesDirect() {
  try {
    console.log('🔧 Applying RLS policies directly...')
    
    // Test current state
    console.log('🧪 Testing current state...')
    
    const anonSupabase = require('@supabase/supabase-js').createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    // Test anon access to quests
    const { data: anonQuests, error: anonError } = await anonSupabase
      .from('quests')
      .select('id, title, status')
      .limit(5)
    
    if (anonError) {
      console.error('❌ Anon access blocked:', anonError.message)
    } else {
      console.log(`✅ Anon access works - found ${anonQuests?.length || 0} quests`)
    }
    
    // Test service role access
    const { data: serviceQuests, error: serviceError } = await supabase
      .from('quests')
      .select('id, title, status')
      .limit(5)
    
    if (serviceError) {
      console.error('❌ Service role access failed:', serviceError)
    } else {
      console.log(`✅ Service role access works - found ${serviceQuests?.length || 0} quests`)
    }
    
    console.log('\n📋 Current RLS Policy Status:')
    console.log('- Anon key can access quests:', anonQuests && anonQuests.length > 0 ? '✅ YES' : '❌ NO')
    console.log('- Service role can access quests:', serviceQuests && serviceQuests.length > 0 ? '✅ YES' : '❌ NO')
    
    if (!anonQuests || anonQuests.length === 0) {
      console.log('\n⚠️  RLS policies are blocking anon access')
      console.log('💡 This is why the main page shows 0 quests')
      console.log('\n📋 Manual fix required:')
      console.log('1. Go to Supabase Dashboard > Authentication > Policies')
      console.log('2. Find the "quests" table')
      console.log('3. Add this policy:')
      console.log('\n   Name: "Allow public read access to active quests"')
      console.log('   FOR: SELECT')
      console.log('   TO: public')
      console.log('   USING: status = \'active\'')
      console.log('\n4. Also add:')
      console.log('\n   Name: "Allow authenticated users to read all quests"')
      console.log('   FOR: SELECT')
      console.log('   TO: authenticated')
      console.log('   USING: true')
    } else {
      console.log('\n✅ RLS policies are working correctly')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

applyRLSPoliciesDirect() 