import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function fixTwitterTasks() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('social_platform', 'twitter');
  if (error) throw error;
  let fixed = 0;
  for (const task of tasks || []) {
    const updates: any = {};
    if (['follow', 'retweet'].includes(task.social_action) && !task.social_username) {
      updates.social_username = 'FIX_ME';
    }
    if (['like', 'retweet'].includes(task.social_action) && !task.social_post_id) {
      updates.social_post_id = 'FIX_ME';
    }
    if (Object.keys(updates).length > 0) {
      await supabase.from('tasks').update(updates).eq('id', task.id);
      console.log(`Updated task ${task.id} (${task.title}):`, updates);
      fixed++;
    }
  }
  return fixed;
}

async function fixTwitterUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, x_username, username');
  if (error) throw error;
  let fixed = 0;
  for (const user of users || []) {
    if (!user.x_username && !user.username) {
      await supabase.from('users').update({ x_username: 'FIX_ME' }).eq('id', user.id);
      console.log(`Updated user ${user.id} (${user.email}): set x_username to 'FIX_ME'`);
      fixed++;
    }
  }
  return fixed;
}

(async () => {
  console.log('Fixing Twitter tasks...');
  const fixedTasks = await fixTwitterTasks();
  console.log(`Fixed ${fixedTasks} Twitter tasks.`);

  console.log('\nFixing Twitter users...');
  const fixedUsers = await fixTwitterUsers();
  console.log(`Fixed ${fixedUsers} Twitter users.`);

  console.log('\nAll done. Please review and update any FIX_ME placeholders with real data.');
})(); 