import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl!, supabaseKey!);

const REAL_USER_IDS = [
  '1356697c-6c07-4229-a49b-f20e09e135fc', // gvozdrysard@gmail.com
  '1a268a35-af47-47a6-8c0b-a14ccce077aa', // 3dgenesisai@gmail.com
  'df9213a6-3b20-42b7-b0a6-b76424499a93', // richcase1975@gmail.com
];
const USERNAME_MAP: Record<string, string> = {
  '1356697c-6c07-4229-a49b-f20e09e135fc': 'RGvozd61056',
  '1a268a35-af47-47a6-8c0b-a14ccce077aa': '3dgenesisapp',
  'df9213a6-3b20-42b7-b0a6-b76424499a93': 'RysardGvozdovic',
};

async function updateRealUsernames() {
  let updated = 0;
  for (const [id, x_username] of Object.entries(USERNAME_MAP)) {
    const { error } = await supabase.from('users').update({ x_username }).eq('id', id);
    if (!error) {
      console.log(`Updated user ${id}: set x_username to '${x_username}'`);
      updated++;
    } else {
      console.error(`Failed to update user ${id}:`, error.message);
    }
  }
  return updated;
}

async function deleteDemoUsersAndData() {
  // Delete related data (user_task_submissions)
  const { error: subError } = await supabase
    .from('user_task_submissions')
    .delete()
    .not('user_id', 'in', `(${REAL_USER_IDS.join(',')})`);
  if (!subError) {
    console.log('Deleted demo user_task_submissions.');
  } else {
    console.error('Failed to delete demo user_task_submissions:', subError.message);
  }
  // Delete demo users
  const { error: userError } = await supabase
    .from('users')
    .delete()
    .not('id', 'in', `(${REAL_USER_IDS.join(',')})`);
  if (!userError) {
    console.log('Deleted demo users.');
  } else {
    console.error('Failed to delete demo users:', userError.message);
  }
}

(async () => {
  console.log('Updating real users with correct Twitter usernames...');
  await updateRealUsernames();
  console.log('\nDeleting demo users and their related data...');
  await deleteDemoUsersAndData();
  console.log('\nCleanup complete.');
})(); 