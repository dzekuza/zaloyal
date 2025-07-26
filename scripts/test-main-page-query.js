const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testMainPageQuery() {
  try {
    console.log('🧪 Testing main page quest query...')
    
    // First, get the project ID that we know has quests
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status')
      .eq('status', 'approved')
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }
    
    console.log(`📊 Found ${projects?.length || 0} approved projects`)
    
    if (projects && projects.length > 0) {
      const projectIds = projects.map(p => p.id)
      console.log(`📋 Project IDs: ${projectIds}`)
      
      // Test the exact query from main page
      console.log('\n🔍 Testing quest query (like main page)...')
      const { data: quests, error: questsError } = await supabase
        .from('quests')
        .select('id, project_id, total_xp')
        .in('project_id', projectIds)
        .eq('status', 'active')
      
      if (questsError) {
        console.error('❌ Error fetching quests:', questsError)
      } else {
        console.log(`✅ Found ${quests?.length || 0} active quests`)
        if (quests && quests.length > 0) {
          quests.forEach((quest, index) => {
            console.log(`${index + 1}. ID: ${quest.id}, Project: ${quest.project_id}, XP: ${quest.total_xp}`)
          })
        }
      }
      
      // Test without status filter
      console.log('\n🔍 Testing quest query without status filter...')
      const { data: allQuests, error: allQuestsError } = await supabase
        .from('quests')
        .select('id, project_id, total_xp, status')
        .in('project_id', projectIds)
      
      if (allQuestsError) {
        console.error('❌ Error fetching all quests:', allQuestsError)
      } else {
        console.log(`✅ Found ${allQuests?.length || 0} quests total`)
        if (allQuests && allQuests.length > 0) {
          allQuests.forEach((quest, index) => {
            console.log(`${index + 1}. ID: ${quest.id}, Project: ${quest.project_id}, Status: ${quest.status}, XP: ${quest.total_xp}`)
          })
        }
      }
      
      // Test with anon key to simulate client-side access
      console.log('\n🔍 Testing with anon key (client-side simulation)...')
      const anonSupabase = require('@supabase/supabase-js').createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      )
      
      const { data: anonQuests, error: anonError } = await anonSupabase
        .from('quests')
        .select('id, project_id, total_xp')
        .in('project_id', projectIds)
        .eq('status', 'active')
      
      if (anonError) {
        console.error('❌ Error with anon key:', anonError)
      } else {
        console.log(`✅ Anon key found ${anonQuests?.length || 0} active quests`)
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testMainPageQuery() 