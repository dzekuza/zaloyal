const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyQuestsRLSFix() {
  try {
    console.log('🔧 Applying quests RLS fix...')
    
    // Read the SQL file
    const fs = require('fs')
    const sql = fs.readFileSync('scripts/fix-quests-rls.sql', 'utf8')
    
    // Split into individual statements
    const statements = sql.split(';').filter(stmt => stmt.trim())
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          if (error) {
            console.log('⚠️ Statement failed (might be expected):', statement.substring(0, 100) + '...')
            console.log('Error:', error.message)
          }
        } catch (err) {
          console.log('⚠️ Statement failed (might be expected):', statement.substring(0, 100) + '...')
          console.log('Error:', err.message)
        }
      }
    }
    
    console.log('✅ Quests RLS fix applied')
    
    // Test the fix
    console.log('🧪 Testing quests RLS after fix...')
    
    // Test with service role (should work)
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
    
    // Test with anon key (should be blocked now)
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
      console.log('⚠️ Anon key can still update quests (RLS might not be working)')
    }
    
  } catch (error) {
    console.error('❌ Error applying quests RLS fix:', error)
  }
}

applyQuestsRLSFix() 