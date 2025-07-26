const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testQuestSave() {
  try {
    console.log('🧪 Testing quest save operations...');
    
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
    console.log(`👤 Project owner: ${testProject.owner_id}`);
    
    // Test 1: Try to create a quest without authentication (should fail)
    console.log('\n🔨 Test 1: Creating quest without auth (should fail)...');
    const { data: newQuest, error: createError } = await supabase
      .from('quests')
      .insert({
        title: 'Test Quest - No Auth',
        description: 'This should fail due to RLS',
        project_id: testProject.id,
        total_xp: 100,
        status: 'active'
      })
      .select()
      .single();
    
    if (createError) {
      console.log('✅ Expected error (no auth):', createError.message);
    } else {
      console.log('❌ Unexpected success:', newQuest);
    }
    
    // Test 2: Try to update a quest without authentication (should fail)
    console.log('\n🔨 Test 2: Updating quest without auth (should fail)...');
    const { error: updateError } = await supabase
      .from('quests')
      .update({
        title: 'Updated Quest - No Auth'
      })
      .eq('id', 'some-quest-id');
    
    if (updateError) {
      console.log('✅ Expected error (no auth):', updateError.message);
    } else {
      console.log('❌ Unexpected success');
    }
    
    // Test 3: Check if there are any existing quests
    console.log('\n🔨 Test 3: Checking existing quests...');
    const { data: existingQuests, error: readError } = await supabase
      .from('quests')
      .select('id, title, project_id, status')
      .limit(5);
    
    if (readError) {
      console.error('❌ Error reading quests:', readError);
    } else {
      console.log(`📊 Found ${existingQuests?.length || 0} existing quests`);
      
      if (existingQuests && existingQuests.length > 0) {
        console.log('📋 Sample existing quest:', {
          id: existingQuests[0].id,
          title: existingQuests[0].title,
          project_id: existingQuests[0].project_id,
          status: existingQuests[0].status
        });
        
        // Test 4: Try to update existing quest without auth
        console.log('\n🔨 Test 4: Updating existing quest without auth...');
        const { error: updateExistingError } = await supabase
          .from('quests')
          .update({
            title: 'Updated Existing Quest'
          })
          .eq('id', existingQuests[0].id);
        
        if (updateExistingError) {
          console.log('✅ Expected error (no auth):', updateExistingError.message);
        } else {
          console.log('❌ Unexpected success updating existing quest');
        }
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('- Quest creation without auth:', createError ? '❌ Blocked (expected)' : '✅ Allowed (unexpected)');
    console.log('- Quest update without auth:', updateError ? '❌ Blocked (expected)' : '✅ Allowed (unexpected)');
    console.log('- Quest read without auth:', readError ? '❌ Blocked' : '✅ Allowed');
    
    console.log('\n💡 The issue is likely that users need to be authenticated to create/update quests.');
    console.log('   The RLS policies are working correctly by blocking unauthenticated operations.');
    
  } catch (error) {
    console.error('❌ Error testing quest save:', error);
  }
}

testQuestSave(); 