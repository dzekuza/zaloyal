const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSchema() {
  try {
    // Check if twitter_url column exists in projects table
    const { data, error } = await supabase
      .from('projects')
      .select('twitter_url')
      .limit(1);
    
    if (error) {
      console.error('Error checking schema:', error);
      return;
    }
    
    console.log('✅ twitter_url column exists in projects table');
    
    // Check if x_username column exists in users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('x_username')
      .limit(1);
    
    if (userError) {
      console.error('Error checking users schema:', userError);
      return;
    }
    
    console.log('✅ x_username column exists in users table');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

checkSchema(); 