const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY // Use the correct env var name
);

async function testUserAuth() {
  try {
    console.log('🧪 Testing user authentication...');
    
    // Test 1: Check current user
    console.log('\n🔨 Test 1: Checking current user...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('❌ Error getting user:', userError);
    } else if (user) {
      console.log('✅ User authenticated:', {
        id: user.id,
        email: user.email
      });
    } else {
      console.log('⚠️  No user authenticated');
    }
    
    // Test 2: Try to access quests
    console.log('\n🔨 Test 2: Trying to access quests...');
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title, project_id, status')
      .limit(5);
    
    if (questsError) {
      console.error('❌ Error accessing quests:', questsError);
    } else {
      console.log('✅ Quests accessed successfully');
      console.log(`📊 Found ${quests?.length || 0} quests`);
      
      if (quests && quests.length > 0) {
        console.log('📋 Sample quest:', {
          id: quests[0].id,
          title: quests[0].title,
          project_id: quests[0].project_id,
          status: quests[0].status
        });
      }
    }
    
    // Test 3: Try to access projects
    console.log('\n🔨 Test 3: Trying to access projects...');
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, owner_id, status')
      .limit(5);
    
    if (projectsError) {
      console.error('❌ Error accessing projects:', projectsError);
    } else {
      console.log('✅ Projects accessed successfully');
      console.log(`📊 Found ${projects?.length || 0} projects`);
      
      if (projects && projects.length > 0) {
        console.log('📋 Sample project:', {
          id: projects[0].id,
          name: projects[0].name,
          owner_id: projects[0].owner_id,
          status: projects[0].status
        });
      }
    }
    
    // Test 4: Try to access users
    console.log('\n🔨 Test 4: Trying to access users...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, username, email, wallet_address')
      .limit(5);
    
    if (usersError) {
      console.error('❌ Error accessing users:', usersError);
    } else {
      console.log('✅ Users accessed successfully');
      console.log(`📊 Found ${users?.length || 0} users`);
      
      if (users && users.length > 0) {
        console.log('📋 Sample user:', {
          id: users[0].id,
          username: users[0].username,
          email: users[0].email,
          wallet_address: users[0].wallet_address
        });
      }
    }
    
    console.log('\n📋 Summary:');
    console.log('- User auth:', user ? '✅ Authenticated' : '❌ Not authenticated');
    console.log('- Quests access:', questsError ? '❌ Failed' : '✅ Success');
    console.log('- Projects access:', projectsError ? '❌ Failed' : '✅ Success');
    console.log('- Users access:', usersError ? '❌ Failed' : '✅ Success');
    
  } catch (error) {
    console.error('❌ Error testing user auth:', error);
  }
}

testUserAuth(); 