const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyQuestsSchemaFix() {
  try {
    console.log('🔧 Applying quests schema fix...');
    
    // Test if the time_limit_days column exists
    console.log('🔍 Checking quests table schema...');
    const { data: questsTest, error: testError } = await supabase
      .from('quests')
      .select('id, name, time_limit_days')
      .limit(1);
    
    if (testError && testError.code === '42703') {
      console.log('❌ time_limit_days column missing, applying fix...');
      
      // Since we can't run DDL directly, let's test with a simple insert
      // to see what columns actually exist
      const { data: columns, error: columnsError } = await supabase
        .from('quests')
        .select('*')
        .limit(0);
      
      if (columnsError) {
        console.error('❌ Error checking quests table:', columnsError);
        return;
      }
      
      console.log('✅ Quests table is accessible');
      console.log('💡 The time_limit_days column needs to be added manually in Supabase dashboard');
      console.log('   Or run the SQL migration: scripts/fix-quests-schema.sql');
      
    } else {
      console.log('✅ time_limit_days column already exists');
    }
    
    // Test quest retrieval to ensure no other schema issues
    console.log('🧪 Testing quest retrieval...');
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, name, project_id, total_xp')
      .limit(5);
    
    if (questsError) {
      console.error('❌ Error retrieving quests:', questsError);
    } else {
      console.log('✅ Quests retrieval successful');
      console.log(`📊 Found ${quests?.length || 0} quests`);
    }
    
    console.log('🎉 Quests schema check completed!');
    
  } catch (error) {
    console.error('❌ Error applying quests schema fix:', error);
  }
}

applyQuestsSchemaFix(); 