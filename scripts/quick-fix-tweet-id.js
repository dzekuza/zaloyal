import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function quickFixTweetId() {
  const taskId = "f8088a7d-006d-4379-83a0-93a5262b14ea";
  
  // Replace this with the actual tweet ID you want to use
  // You can get this from the tweet URL (e.g., https://twitter.com/username/status/1234567890 -> 1234567890)
  const tweetId = "REPLACE_WITH_ACTUAL_TWEET_ID";
  
  console.log('🔧 Fixing task:', taskId);
  console.log('📝 Setting tweet ID to:', tweetId);
  
  const { error } = await supabase
    .from('tasks')
    .update({ social_post_id: tweetId })
    .eq('id', taskId);
    
  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Task updated successfully!');
  }
}

quickFixTweetId().catch(console.error); 