const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function addTestQuest() {
  try {
    console.log('🔍 Adding test quest to existing project...\n');
    
    // First, get the existing project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name')
      .eq('status', 'approved')
      .limit(1);
    
    if (projectsError) {
      console.error('❌ Error fetching projects:', projectsError);
      return;
    }
    
    if (!projects || projects.length === 0) {
      console.log('❌ No approved projects found');
      return;
    }
    
    const project = projects[0];
    console.log(`✅ Found project: ${project.name} (${project.id})`);
    
    // Check if project already has quests
    const { data: existingQuests, error: questsError } = await supabase
      .from('quests')
      .select('id, title, status')
      .eq('project_id', project.id);
    
    if (questsError) {
      console.error('❌ Error checking existing quests:', questsError);
      return;
    }
    
    console.log(`📋 Project has ${existingQuests?.length || 0} existing quests`);
    if (existingQuests && existingQuests.length > 0) {
      existingQuests.forEach(quest => {
        console.log(`   - ${quest.title} (${quest.status})`);
      });
    }
    
    // Add a test quest if none exist
    if (!existingQuests || existingQuests.length === 0) {
      console.log('📝 Adding test quest...');
      
      const { data: newQuest, error: insertError } = await supabase
        .from('quests')
        .insert({
          project_id: project.id,
          title: 'Test Quest',
          description: 'This is a test quest to make the project visible',
          total_xp: 100,
          status: 'active',
          time_limit_days: 7,
          max_participants: 100,
          is_featured: false
        })
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error creating test quest:', insertError);
        return;
      }
      
      console.log(`✅ Created test quest: ${newQuest.title} (${newQuest.id})`);
      
      // Add a test task to the quest
      console.log('📝 Adding test task...');
      
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          quest_id: newQuest.id,
          title: 'Follow on Twitter',
          description: 'Follow the project on Twitter',
          xp_reward: 50,
          status: 'active',
          type: 'social', // Required column
          task_type: 'social',
          social_action: 'follow',
          order_index: 1
        })
        .select()
        .single();
      
      if (taskError) {
        console.error('❌ Error creating test task:', taskError);
        return;
      }
      
      console.log(`✅ Created test task: ${newTask.title} (${newTask.id})`);
      
    } else {
      console.log('✅ Project already has quests, no need to add test quest');
    }
    
    // Verify the quest was added
    const { data: finalQuests, error: finalError } = await supabase
      .from('quests')
      .select('id, title, status, total_xp')
      .eq('project_id', project.id);
    
    if (finalError) {
      console.error('❌ Error verifying quests:', finalError);
      return;
    }
    
    console.log(`\n📊 Final quest count: ${finalQuests?.length || 0}`);
    if (finalQuests && finalQuests.length > 0) {
      finalQuests.forEach(quest => {
        console.log(`   - ${quest.title} (${quest.status}) - ${quest.total_xp} XP`);
      });
    }
    
    console.log('\n🎉 Test quest setup completed!');
    console.log('💡 The project should now be visible on the main page');
    
  } catch (error) {
    console.error('❌ Error adding test quest:', error);
  }
}

addTestQuest(); 