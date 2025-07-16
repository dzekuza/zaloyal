import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

async function validateTwitterTasks() {
  const { data: tasks, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('social_platform', 'twitter');
  if (error) throw error;
  const issues: string[] = [];
  for (const task of tasks || []) {
    if (['follow', 'retweet'].includes(task.social_action) && !task.social_username) {
      issues.push(`Task ${task.id} (${task.title}): Missing social_username for action '${task.social_action}'`);
    }
    if (['like', 'retweet'].includes(task.social_action) && !task.social_post_id) {
      issues.push(`Task ${task.id} (${task.title}): Missing social_post_id for action '${task.social_action}'`);
    }
  }
  return issues;
}

async function validateTwitterUsers() {
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, x_username, username');
  if (error) throw error;
  const issues: string[] = [];
  for (const user of users || []) {
    if (!user.x_username && !user.username) {
      issues.push(`User ${user.id} (${user.email}): Missing Twitter username (x_username or username)`);
    }
  }
  return issues;
}

(async () => {
  console.log('Validating Twitter tasks...');
  const taskIssues = await validateTwitterTasks();
  if (taskIssues.length === 0) {
    console.log('No issues found in Twitter tasks.');
  } else {
    console.log('Issues found in Twitter tasks:');
    for (const issue of taskIssues) {
      console.log('  -', issue);
    }
  }

  console.log('\nValidating Twitter users...');
  const userIssues = await validateTwitterUsers();
  if (userIssues.length === 0) {
    console.log('No issues found in Twitter users.');
  } else {
    console.log('Issues found in Twitter users:');
    for (const issue of userIssues) {
      console.log('  -', issue);
    }
  }
})(); 