const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMissingMigrations() {
  try {
    console.log('🔧 Applying missing migrations...');
    
    // Add twitter_url column to projects table if it doesn't exist
    console.log('Adding twitter_url column to projects table...');
    const { error: projectsError } = await supabase.rpc('exec_sql', {
      sql: `
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
      `
    });
    
    if (projectsError) {
      console.error('Error adding columns to projects:', projectsError);
    } else {
      console.log('✅ Added columns to projects table');
    }
    
    // Add x_username and related columns to users table if they don't exist
    console.log('Adding X-related columns to users table...');
    const { error: usersError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS x_id TEXT,
        ADD COLUMN IF NOT EXISTS x_username TEXT,
        ADD COLUMN IF NOT EXISTS x_avatar_url TEXT,
        ADD COLUMN IF NOT EXISTS x_verified BOOLEAN DEFAULT FALSE
      `
    });
    
    if (usersError) {
      console.error('Error adding columns to users:', usersError);
    } else {
      console.log('✅ Added X columns to users table');
    }
    
    // Create project_members table if it doesn't exist
    console.log('Creating project_members table...');
    const { error: membersError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS project_members (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          role TEXT DEFAULT 'member',
          permissions TEXT[] DEFAULT ARRAY['view'],
          joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(project_id, user_id)
        )
      `
    });
    
    if (membersError) {
      console.error('Error creating project_members table:', membersError);
    } else {
      console.log('✅ Created project_members table');
    }
    
    // Create project_applications table if it doesn't exist
    console.log('Creating project_applications table...');
    const { error: applicationsError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS project_applications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          project_name TEXT NOT NULL,
          project_description TEXT NOT NULL,
          website_url TEXT,
          contract_address TEXT,
          blockchain_network TEXT,
          twitter_url TEXT,
          discord_url TEXT,
          telegram_url TEXT,
          additional_info TEXT,
          status TEXT DEFAULT 'pending',
          reviewed_by UUID REFERENCES users(id),
          reviewed_at TIMESTAMP WITH TIME ZONE,
          review_notes TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `
    });
    
    if (applicationsError) {
      console.error('Error creating project_applications table:', applicationsError);
    } else {
      console.log('✅ Created project_applications table');
    }
    
    console.log('🎉 All migrations applied successfully!');
    
  } catch (error) {
    console.error('Script error:', error);
  }
}

applyMissingMigrations(); 