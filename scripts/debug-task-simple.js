const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

function extractTweetIdFromUrl(url) {
  if (!url) return null;
  
  const cleanUrl = url.trim().replace(/\/$/, '');
  
  const patterns = [
    /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/,
    /(?:twitter\.com|x\.com)\/i\/status\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

async function debugTask() {
  const taskId = "6a8ee021-e184-4664-87d2-c21e5eaef53a";
  
  console.log('🔍 Debugging task:', taskId);
  
  // Get the task
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();
    
  if (taskError) {
    console.error('❌ Task error:', taskError);
    return;
  }
  
  console.log('📋 Task data:', {
    id: task.id,
    title: task.title,
    quest_id: task.quest_id,
    social_action: task.social_action,
    social_platform: task.social_platform,
    social_url: task.social_url,
    social_post_id: task.social_post_id,
    social_username: task.social_username
  });
  
  // Get the quest
  const { data: quest, error: questError } = await supabase
    .from('quests')
    .select('project_id, title')
    .eq('id', task.quest_id)
    .single();
    
  if (questError) {
    console.error('❌ Quest error:', questError);
    return;
  }
  
  console.log('📋 Quest data:', {
    id: task.quest_id,
    title: quest.title,
    project_id: quest.project_id
  });
  
  // Get the project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name, owner_id')
    .eq('id', quest.project_id)
    .single();
    
  if (projectError) {
    console.error('❌ Project error:', projectError);
    return;
  }
  
  console.log('📋 Project data:', {
    id: project.id,
    name: project.name,
    owner_id: project.owner_id
  });
  
  // Get the project owner
  const { data: owner, error: ownerError } = await supabase
    .from('users')
    .select('id, username, x_username, x_id')
    .eq('id', project.owner_id)
    .single();
    
  if (ownerError) {
    console.error('❌ Owner error:', ownerError);
    return;
  }
  
  console.log('📋 Owner data:', {
    id: owner.id,
    username: owner.username,
    x_username: owner.x_username,
    x_id: owner.x_id
  });
  
  // Test URL extraction
  if (task.social_url) {
    const tweetId = extractTweetIdFromUrl(task.social_url);
    console.log('🔗 URL extraction test:', {
      url: task.social_url,
      extracted_tweet_id: tweetId
    });
  }
}

debugTask().catch(console.error); 