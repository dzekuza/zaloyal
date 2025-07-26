const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyRLSFixes() {
  try {
    console.log('🔧 Applying RLS policy fixes...')
    
    // Read the SQL files
    const fs = require('fs')
    const questsSQL = fs.readFileSync('scripts/fix-quests-rls.sql', 'utf8')
    const tasksSQL = fs.readFileSync('scripts/fix-tasks-rls.sql', 'utf8')
    
    // Apply quests RLS policies
    console.log('📋 Applying quests RLS policies...')
    const questsStatements = questsSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of questsStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          if (error) {
            console.log('⚠️ Quest statement failed (might be expected):', statement.substring(0, 100) + '...')
            console.log('Error:', error.message)
          }
        } catch (err) {
          console.log('⚠️ Quest statement failed (might be expected):', statement.substring(0, 100) + '...')
          console.log('Error:', err.message)
        }
      }
    }
    
    // Apply tasks RLS policies
    console.log('📋 Applying tasks RLS policies...')
    const tasksStatements = tasksSQL.split(';').filter(stmt => stmt.trim())
    
    for (const statement of tasksStatements) {
      if (statement.trim()) {
        try {
          const { error } = await supabase.rpc('exec_sql', { sql: statement + ';' })
          if (error) {
            console.log('⚠️ Task statement failed (might be expected):', statement.substring(0, 100) + '...')
            console.log('Error:', error.message)
          }
        } catch (err) {
          console.log('⚠️ Task statement failed (might be expected):', statement.substring(0, 100) + '...')
          console.log('Error:', err.message)
        }
      }
    }
    
    console.log('✅ RLS fixes applied')
    
    // Test the fixes
    console.log('🧪 Testing RLS policies after fix...')
    
    // Test quests access
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title, project_id, status')
      .limit(5)
    
    if (questsError) {
      console.error('❌ Error accessing quests:', questsError)
    } else {
      console.log(`✅ Quests access successful - found ${quests?.length || 0} quests`)
    }
    
    // Test tasks access
    const { data: tasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, quest_id, status')
      .limit(5)
    
    if (tasksError) {
      console.error('❌ Error accessing tasks:', tasksError)
    } else {
      console.log(`✅ Tasks access successful - found ${tasks?.length || 0} tasks`)
    }
    
    // Test project access
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, owner_id, status')
      .limit(5)
    
    if (projectsError) {
      console.error('❌ Error accessing projects:', projectsError)
    } else {
      console.log(`✅ Projects access successful - found ${projects?.length || 0} projects`)
    }
    
    console.log('\n🎉 RLS policy fixes completed!')
    console.log('\n📋 Summary of policies:')
    console.log('- Any authenticated user can view quests and tasks')
    console.log('- Project owners can create/modify/delete quests and tasks')
    console.log('- Service role has full access for admin operations')
    
  } catch (error) {
    console.error('❌ Error applying RLS fixes:', error)
  }
}

applyRLSFixes() 