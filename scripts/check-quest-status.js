const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkQuestStatus() {
  try {
    console.log('🔍 Checking quest status values...')
    
    // Get all quests with their status
    const { data: quests, error } = await supabase
      .from('quests')
      .select('id, title, project_id, status, created_at')
    
    if (error) {
      console.error('❌ Error fetching quests:', error)
      return
    }
    
    console.log(`📊 Found ${quests?.length || 0} quests total`)
    
    if (quests && quests.length > 0) {
      console.log('\n📋 Quest details:')
      quests.forEach((quest, index) => {
        console.log(`${index + 1}. ID: ${quest.id}`)
        console.log(`   Title: ${quest.title}`)
        console.log(`   Project ID: ${quest.project_id}`)
        console.log(`   Status: "${quest.status}"`)
        console.log(`   Created: ${quest.created_at}`)
        console.log('')
      })
      
      // Check unique status values
      const statuses = [...new Set(quests.map(q => q.status))]
      console.log('📊 Unique status values:', statuses)
      
      // Count by status
      const statusCounts = quests.reduce((acc, quest) => {
        acc[quest.status] = (acc[quest.status] || 0) + 1
        return acc
      }, {})
      
      console.log('📊 Status counts:', statusCounts)
      
      // Check which quests would be returned with status = 'active'
      const activeQuests = quests.filter(q => q.status === 'active')
      console.log(`📊 Quests with status = 'active': ${activeQuests.length}`)
      
      if (activeQuests.length === 0) {
        console.log('⚠️  No quests have status = "active"')
        console.log('💡 This explains why the main page shows 0 quests')
      }
    }
    
    // Also check projects
    console.log('\n🔍 Checking projects...')
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, status, owner_id')
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError)
    } else {
      console.log(`📊 Found ${projects?.length || 0} projects`)
      if (projects && projects.length > 0) {
        projects.forEach((project, index) => {
          console.log(`${index + 1}. ID: ${project.id}`)
          console.log(`   Name: ${project.name}`)
          console.log(`   Status: "${project.status}"`)
          console.log(`   Owner: ${project.owner_id}`)
          console.log('')
        })
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkQuestStatus() 