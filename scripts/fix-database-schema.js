const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixDatabaseSchema() {
  try {
    console.log('🔧 Fixing database schema...');
    
    // First, let's check what columns exist in the projects table
    console.log('Checking current projects table structure...');
    const { data: projectsData, error: projectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(1);
    
    if (projectsError) {
      console.error('Error checking projects table:', projectsError);
      return;
    }
    
    console.log('Current projects columns:', Object.keys(projectsData[0] || {}));
    
    // Check if twitter_url exists
    if (!projectsData[0] || !projectsData[0].hasOwnProperty('twitter_url')) {
      console.log('❌ twitter_url column missing from projects table');
      console.log('Please run the migration manually in Supabase dashboard:');
      console.log(`
        ALTER TABLE projects 
        ADD COLUMN IF NOT EXISTS twitter_url TEXT,
        ADD COLUMN IF NOT EXISTS discord_url TEXT,
        ADD COLUMN IF NOT EXISTS telegram_url TEXT,
        ADD COLUMN IF NOT EXISTS github_url TEXT,
        ADD COLUMN IF NOT EXISTS medium_url TEXT,
        ADD COLUMN IF NOT EXISTS website_url TEXT,
        ADD COLUMN IF NOT EXISTS contract_address TEXT,
        ADD COLUMN IF NOT EXISTS blockchain_network TEXT,
        ADD COLUMN IF NOT EXISTS total_quests INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS total_xp_distributed INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS tags TEXT[],
        ADD COLUMN IF NOT EXISTS category TEXT,
        ADD COLUMN IF NOT EXISTS founded_date DATE,
        ADD COLUMN IF NOT EXISTS team_size INTEGER,
        ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending'
      `);
    } else {
      console.log('✅ twitter_url column exists in projects table');
    }
    
    // Check users table
    console.log('Checking current users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.error('Error checking users table:', usersError);
      return;
    }
    
    console.log('Current users columns:', Object.keys(usersData[0] || {}));
    
    // Check if x_username exists
    if (!usersData[0] || !usersData[0].hasOwnProperty('x_username')) {
      console.log('❌ x_username column missing from users table');
      console.log('Please run the migration manually in Supabase dashboard:');
      console.log(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS x_id TEXT,
        ADD COLUMN IF NOT EXISTS x_username TEXT,
        ADD COLUMN IF NOT EXISTS x_avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS x_verified BOOLEAN DEFAULT FALSE
      `);
    } else {
      console.log('✅ x_username column exists in users table');
    }
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

fixDatabaseSchema(); 