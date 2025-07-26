import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixEmptyTaskTitles() {
  try {
    console.log('🔍 Checking for tasks with empty titles...\n');
    
    // Get all tasks with empty titles
    const { data: emptyTasks, error: fetchError } = await supabase
      .from('tasks')
      .select('id, title, type, quest_id')
      .or('title.is.null,title.eq.')
    
    if (fetchError) {
      console.error('❌ Error fetching tasks:', fetchError);
      return;
    }
    
    console.log(`📋 Found ${emptyTasks?.length || 0} tasks with empty titles:`);
    emptyTasks?.forEach((task, index) => {
      console.log(`  ${index + 1}. ID: ${task.id}, Type: ${task.type}, Quest: ${task.quest_id}`);
    });
    
    if (emptyTasks && emptyTasks.length > 0) {
      console.log('\n🗑️ Deleting tasks with empty titles...');
      
      for (const task of emptyTasks) {
        const { error: deleteError } = await supabase
          .from('tasks')
          .delete()
          .eq('id', task.id);
        
        if (deleteError) {
          console.error(`❌ Error deleting task ${task.id}:`, deleteError);
        } else {
          console.log(`✅ Deleted task ${task.id}`);
        }
      }
      
      console.log('\n✅ Cleanup completed!');
    } else {
      console.log('\n✅ No tasks with empty titles found.');
    }
    
  } catch (error) {
    console.error('❌ Error fixing empty task titles:', error);
  }
}

fixEmptyTaskTitles(); 