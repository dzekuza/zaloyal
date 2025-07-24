import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixMissingTweetId() {
  // The specific task ID from your error
  const taskId = "f8088a7d-006d-4379-83a0-93a5262b14ea";
  
  console.log('🔍 Looking for task:', taskId);
  
  // Get the current task data
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
    
  if (taskError) {
    console.error('❌ Error fetching task:', taskError);
    return;
  }
  
  if (!task) {
    console.error('❌ Task not found');
    return;
  }
  
  console.log('📋 Current task data:', {
    id: task.id,
    title: task.title,
    social_action: task.social_action,
    social_platform: task.social_platform,
    social_post_id: task.social_post_id,
    social_username: task.social_username
  });
  
  // Check if this is a Twitter like task without a post ID
  if (task.social_platform === 'twitter' && task.social_action === 'like' && !task.social_post_id) {
    console.log('⚠️  Found Twitter like task without post ID');
    
    // You need to provide the actual tweet ID here
    // You can get this from the tweet URL or by looking up the tweet
    const newTweetId = prompt('Enter the tweet ID for this task:');
    
    if (newTweetId) {
      // Update the task with the tweet ID
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ social_post_id: newTweetId })
        .eq('id', taskId);
        
      if (updateError) {
        console.error('❌ Error updating task:', updateError);
      } else {
        console.log('✅ Successfully updated task with tweet ID:', newTweetId);
      }
    } else {
      console.log('❌ No tweet ID provided');
    }
  } else {
    console.log('ℹ️  Task is not a Twitter like task or already has a post ID');
  }
}

// Run the fix
fixMissingTweetId().catch(console.error); 