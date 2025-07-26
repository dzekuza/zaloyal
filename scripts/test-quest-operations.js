const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testQuestOperations() {
  try {
    console.log('🧪 Testing quest operations...');
    
    // Get a sample project
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, owner_id, status')
      .limit(1);
    
    if (projectsError || !projects || projects.length === 0) {
      console.error('❌ No projects found:', projectsError);
      return;
    }
    
    const testProject = projects[0];
    console.log(`📝 Using project: ${testProject.name} (${testProject.id})`);
    
    // Test 1: Create a quest
    console.log('\n🔨 Test 1: Creating a quest...');
    const { data: newQuest, error: createError } = await supabase
      .from('quests')
      .insert({
        title: 'Test Quest - Operations',
        description: 'This is a test quest to verify operations',
        project_id: testProject.id,
        total_xp: 100,
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.error('❌ Error creating quest:', createError);
      return;
    }
    
    console.log('✅ Quest created successfully:', newQuest.id);
    
    // Test 2: Update the quest
    console.log('\n🔨 Test 2: Updating the quest...');
    const { error: updateError } = await supabase
      .from('quests')
      .update({
        title: 'Test Quest - Updated',
        description: 'This quest has been updated',
        total_xp: 200
      })
      .eq('id', newQuest.id);
    
    if (updateError) {
      console.error('❌ Error updating quest:', updateError);
    } else {
      console.log('✅ Quest updated successfully');
    }
    
    // Test 3: Read the quest
    console.log('\n🔨 Test 3: Reading the quest...');
    const { data: readQuest, error: readError } = await supabase
      .from('quests')
      .select('*')
      .eq('id', newQuest.id)
      .single();
    
    if (readError) {
      console.error('❌ Error reading quest:', readError);
    } else {
      console.log('✅ Quest read successfully:', {
        id: readQuest.id,
        title: readQuest.title,
        project_id: readQuest.project_id,
        status: readQuest.status
      });
    }
    
    // Test 4: Delete the quest
    console.log('\n🔨 Test 4: Deleting the quest...');
    const { error: deleteError } = await supabase
      .from('quests')
      .delete()
      .eq('id', newQuest.id);
    
    if (deleteError) {
      console.error('❌ Error deleting quest:', deleteError);
    } else {
      console.log('✅ Quest deleted successfully');
    }
    
    console.log('\n🎉 All quest operations completed successfully!');
    
  } catch (error) {
    console.error('❌ Error testing quest operations:', error);
  }
}

testQuestOperations(); 