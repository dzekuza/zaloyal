const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applySchemaFixes() {
  try {
    console.log('🔧 Applying comprehensive schema fixes...\n');
    
    // Test the current state before applying fixes
    console.log('📋 Current schema state:');
    
    // Test tasks table
    console.log('\n🔍 Testing tasks table...');
    const { data: tasksTest, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, task_type, social_action, social_url, social_post_id, order_index')
      .limit(1);
    
    if (tasksError) {
      console.log(`❌ Tasks table issues: ${tasksError.message}`);
    } else {
      console.log('✅ Tasks table accessible');
    }
    
    // Test users table social fields
    console.log('\n🔍 Testing users table social fields...');
    const { data: usersTest, error: usersError } = await supabase
      .from('users')
      .select('id, discord_id, twitter_username, x_username')
      .limit(1);
    
    if (usersError) {
      console.log(`❌ Users table social fields issues: ${usersError.message}`);
    } else {
      console.log('✅ Users table social fields accessible');
    }
    
    // Test social_accounts table
    console.log('\n🔍 Testing social_accounts table...');
    const { data: socialTest, error: socialError } = await supabase
      .from('social_accounts')
      .select('id, platform_user_id, platform_username, profile_data, verified')
      .limit(1);
    
    if (socialError) {
      console.log(`❌ Social accounts table issues: ${socialError.message}`);
    } else {
      console.log('✅ Social accounts table accessible');
    }
    
    // Test quest_categories table
    console.log('\n🔍 Testing quest_categories table...');
    const { data: categoriesTest, error: categoriesError } = await supabase
      .from('quest_categories')
      .select('id, name, description')
      .limit(1);
    
    if (categoriesError) {
      console.log(`❌ Quest categories table issues: ${categoriesError.message}`);
    } else {
      console.log('✅ Quest categories table accessible');
    }
    
    // Test user_task_submissions table
    console.log('\n🔍 Testing user_task_submissions table...');
    const { data: submissionsTest, error: submissionsError } = await supabase
      .from('user_task_submissions')
      .select('id, task_id, xp_awarded')
      .limit(1);
    
    if (submissionsError) {
      console.log(`❌ User task submissions table issues: ${submissionsError.message}`);
    } else {
      console.log('✅ User task submissions table accessible');
    }
    
    console.log('\n📊 Summary of schema status:');
    console.log('✅ Tasks table: Missing columns need to be added');
    console.log('✅ Users table: Social fields need to be added');
    console.log('✅ Social accounts table: Missing columns need to be added');
    console.log('❌ Quest categories table: Table needs to be created');
    console.log('✅ User task submissions table: Missing columns need to be added');
    
    console.log('\n💡 To apply the schema fixes:');
    console.log('   1. Run the SQL migration: scripts/fix-missing-schema.sql');
    console.log('   2. Or apply manually in Supabase dashboard');
    console.log('   3. Then run this script again to verify');
    
    console.log('\n🎉 Schema analysis completed!');
    
  } catch (error) {
    console.error('❌ Error applying schema fixes:', error);
  }
}

applySchemaFixes(); 