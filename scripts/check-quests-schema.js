const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkQuestsSchema() {
  try {
    console.log('🔍 Checking quests table schema...');
    
    // Try to get all columns by selecting everything
    const { data: allColumns, error: allError } = await supabase
      .from('quests')
      .select('*')
      .limit(0);
    
    if (allError) {
      console.error('❌ Error accessing quests table:', allError);
      return;
    }
    
    console.log('✅ Quests table is accessible');
    
    // Try different column combinations to see what exists
    const columnTests = [
      ['id'],
      ['id', 'title'],
      ['id', 'name'],
      ['id', 'description'],
      ['id', 'project_id'],
      ['id', 'total_xp'],
      ['id', 'time_limit_days'],
      ['id', 'max_participants'],
      ['id', 'status'],
      ['id', 'created_at'],
      ['id', 'updated_at']
    ];
    
    console.log('🧪 Testing column combinations...');
    
    for (const columns of columnTests) {
      try {
        const { data, error } = await supabase
          .from('quests')
          .select(columns.join(', '))
          .limit(1);
        
        if (error) {
          console.log(`❌ Columns [${columns.join(', ')}]: ${error.message}`);
        } else {
          console.log(`✅ Columns [${columns.join(', ')}]: Available`);
        }
      } catch (err) {
        console.log(`❌ Columns [${columns.join(', ')}]: ${err.message}`);
      }
    }
    
    // Try to get actual data
    console.log('\n📊 Testing data retrieval...');
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id')
      .limit(5);
    
    if (questsError) {
      console.error('❌ Error retrieving quests data:', questsError);
    } else {
      console.log(`✅ Found ${quests?.length || 0} quests`);
      if (quests && quests.length > 0) {
        console.log('📋 Sample quest IDs:', quests.map(q => q.id).join(', '));
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking quests schema:', error);
  }
}

checkQuestsSchema(); 