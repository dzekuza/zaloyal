import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTasksSchema() {
  try {
    console.log('🔍 Checking tasks table schema...\n');
    
    // Test different column combinations to see what exists
    const columnTests = [
      ['id'],
      ['id', 'title'],
      ['id', 'type'],
      ['id', 'task_type'],
      ['id', 'quest_id'],
      ['id', 'xp_reward'],
      ['id', 'status'],
      ['id', 'description'],
      ['id', 'social_action'],
      ['id', 'social_url'],
      ['id', 'order_index'],
      ['id', 'created_at'],
      ['id', 'updated_at']
    ];
    
    console.log('🧪 Testing column combinations...');
    for (const columns of columnTests) {
      try {
        const { data, error } = await supabase
          .from('tasks')
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
    
    // Get all columns
    console.log('\n📋 All available columns:');
    const { data: allColumns, error: allError } = await supabase
      .from('tasks')
      .select('*')
      .limit(0);
    
    if (allError) {
      console.error('❌ Error getting all columns:', allError);
    } else {
      console.log('✅ Tasks table is accessible');
    }
    
    // Check existing tasks
    console.log('\n📊 Existing tasks:');
    const { data: existingTasks, error: tasksError } = await supabase
      .from('tasks')
      .select('id, title, type, quest_id, xp_reward, status')
      .limit(5);
    
    if (tasksError) {
      console.error('❌ Error fetching tasks:', tasksError);
    } else {
      console.log('📋 Found tasks:', existingTasks?.length || 0);
      existingTasks?.forEach((task, index) => {
        console.log(`  ${index + 1}. ${task.title} (${task.id})`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking schema:', error);
  }
}

checkTasksSchema(); 