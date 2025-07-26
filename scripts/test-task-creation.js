const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testTaskCreation() {
  try {
    console.log('🧪 Testing task creation with updated schema...')
    
    // First, get a quest to test with
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title')
      .limit(1)
    
    if (questsError) {
      console.error('❌ Error fetching quests:', questsError)
      return
    }
    
    if (!quests || quests.length === 0) {
      console.error('❌ No quests found to test with')
      return
    }
    
    const testQuest = quests[0]
    console.log(`📋 Using quest: ${testQuest.title} (${testQuest.id})`)
    
    // Test creating a social task
    const socialTaskData = {
      quest_id: testQuest.id,
      title: 'Test Social Task',
      description: 'This is a test social task',
      type: 'social', // Changed from task_type to type
      xp_reward: 100,
      social_platform: 'twitter',
      social_action: 'follow',
      social_url: 'https://twitter.com/testuser',
      social_username: 'testuser',
      social_post_id: '123456789'
    }
    
    console.log('📝 Creating social task...')
    const { data: socialTask, error: socialTaskError } = await supabase
      .from('tasks')
      .insert([socialTaskData])
      .select()
      .single()
    
    if (socialTaskError) {
      console.error('❌ Error creating social task:', socialTaskError)
    } else {
      console.log('✅ Social task created successfully:', {
        id: socialTask.id,
        title: socialTask.title,
        social_platform: socialTask.social_platform,
        social_action: socialTask.social_action
      })
    }
    
    // Test creating a learn task
    const learnTaskData = {
      quest_id: testQuest.id,
      title: 'Test Learn Task',
      description: 'This is a test learn task',
      type: 'learn', // Changed from task_type to type
      xp_reward: 150,
      learn_content: 'Test quiz content',
      learn_questions: {
        question: 'What is 2+2?',
        description: 'Basic math question',
        multiSelect: false,
        answers: ['3', '4', '5', '6'],
        correctAnswers: [1]
      },
      learn_passing_score: 80
    }
    
    console.log('📝 Creating learn task...')
    const { data: learnTask, error: learnTaskError } = await supabase
      .from('tasks')
      .insert([learnTaskData])
      .select()
      .single()
    
    if (learnTaskError) {
      console.error('❌ Error creating learn task:', learnTaskError)
    } else {
      console.log('✅ Learn task created successfully:', {
        id: learnTask.id,
        title: learnTask.title,
        type: learnTask.type,
        learn_passing_score: learnTask.learn_passing_score
      })
    }
    
    // Clean up test tasks
    console.log('🧹 Cleaning up test tasks...')
    if (socialTask) {
      await supabase.from('tasks').delete().eq('id', socialTask.id)
    }
    if (learnTask) {
      await supabase.from('tasks').delete().eq('id', learnTask.id)
    }
    
    console.log('🎉 Task creation test completed!')
    
  } catch (error) {
    console.error('❌ Error in test:', error)
  }
}

testTaskCreation() 