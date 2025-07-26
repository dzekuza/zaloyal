const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testQuestCreation() {
  try {
    console.log('🧪 Testing quest creation...')
    
    // First, get a project to use for testing
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .limit(1)
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
      return
    }
    
    if (!projects || projects.length === 0) {
      console.log('❌ No projects found for testing')
      return
    }
    
    const testProject = projects[0]
    console.log(`📝 Testing with project: ${testProject.name} (${testProject.id})`)
    
    // Test quest creation with minimal fields
    console.log('🧪 Testing quest creation with minimal fields...')
    const { data: quest1, error: error1 } = await supabase
      .from('quests')
      .insert({
        title: 'Test Quest 1',
        description: 'Test description',
        project_id: testProject.id,
        total_xp: 100,
        status: 'active'
      })
      .select()
      .single()
    
    if (error1) {
      console.log('❌ Error with minimal fields:', error1)
    } else {
      console.log('✅ Quest created with minimal fields:', quest1.id)
      
      // Clean up
      await supabase.from('quests').delete().eq('id', quest1.id)
      console.log('✅ Test quest cleaned up')
    }
    
    // Test quest creation with creator_id
    console.log('🧪 Testing quest creation with creator_id...')
    const { data: quest2, error: error2 } = await supabase
      .from('quests')
      .insert({
        title: 'Test Quest 2',
        description: 'Test description',
        project_id: testProject.id,
        creator_id: testProject.id, // Using project ID as creator_id for testing
        total_xp: 100,
        status: 'active'
      })
      .select()
      .single()
    
    if (error2) {
      console.log('❌ Error with creator_id:', error2)
    } else {
      console.log('✅ Quest created with creator_id:', quest2.id)
      
      // Clean up
      await supabase.from('quests').delete().eq('id', quest2.id)
      console.log('✅ Test quest cleaned up')
    }
    
    // Test quest creation with all possible fields
    console.log('🧪 Testing quest creation with all fields...')
    const { data: quest3, error: error3 } = await supabase
      .from('quests')
      .insert({
        title: 'Test Quest 3',
        description: 'Test description',
        project_id: testProject.id,
        creator_id: testProject.id,
        category_id: null,
        total_xp: 100,
        status: 'active',
        featured: false,
        time_limit_days: null,
        max_participants: null
      })
      .select()
      .single()
    
    if (error3) {
      console.log('❌ Error with all fields:', error3)
    } else {
      console.log('✅ Quest created with all fields:', quest3.id)
      
      // Clean up
      await supabase.from('quests').delete().eq('id', quest3.id)
      console.log('✅ Test quest cleaned up')
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

testQuestCreation() 