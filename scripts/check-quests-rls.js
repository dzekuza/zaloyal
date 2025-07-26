const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkQuestsRLS() {
  try {
    console.log('🔍 Checking quests table RLS policies...')
    
    // Test quest update with service role (should work)
    console.log('🧪 Testing quest update with service role...')
    const { data: testQuest, error: testError } = await supabase
      .from('quests')
      .select('id, title')
      .limit(1)
    
    if (testError) {
      console.error('❌ Error fetching quests:', testError)
      return
    }
    
    if (testQuest && testQuest.length > 0) {
      const questId = testQuest[0].id
      console.log(`📝 Testing update on quest: ${questId}`)
      
      const { error: updateError } = await supabase
        .from('quests')
        .update({ title: testQuest[0].title }) // No change, just testing
        .eq('id', questId)
      
      if (updateError) {
        console.error('❌ Error updating quest with service role:', updateError)
      } else {
        console.log('✅ Quest update with service role works')
      }
    }
    
    // Test with anon key (should fail if RLS is blocking)
    console.log('🧪 Testing quest update with anon key...')
    const anonSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    
    const { error: anonError } = await anonSupabase
      .from('quests')
      .update({ title: 'test' })
      .eq('id', testQuest?.[0]?.id || 'test-id')
    
    if (anonError) {
      console.log('✅ Anon key blocked by RLS (expected):', anonError.message)
    } else {
      console.log('⚠️ Anon key can update quests (might be RLS issue)')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkQuestsRLS() 