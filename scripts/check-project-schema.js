const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProjectSchema() {
  try {
    console.log('🔍 Checking project schema...');
    
    // Get current schema
    const { data: schemaData, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: `
        SELECT 
            column_name, 
            data_type, 
            is_nullable,
            column_default
        FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });
    
    if (schemaError) {
      console.error('Error checking schema:', schemaError);
      return;
    }
    
    console.log('📋 Current projects table columns:');
    schemaData.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'} ${col.column_default ? `default: ${col.column_default}` : ''}`);
    });
    
    // Check for required columns
    const requiredColumns = [
      'twitter_url', 'discord_url', 'telegram_url', 'github_url', 'medium_url', 'website_url',
      'contract_address', 'blockchain_network', 'total_quests', 'total_participants', 'total_xp_distributed',
      'tags', 'category', 'founded_date', 'team_size', 'verified', 'featured', 'status',
      'x_username', 'x_id', 'x_avatar_url'
    ];
    
    const existingColumns = schemaData.map(col => col.column_name);
    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('❌ Missing columns:', missingColumns);
      console.log('💡 Run the schema fix script to add missing columns');
    } else {
      console.log('✅ All required columns exist');
    }
    
    // Test project creation with minimal data
    console.log('🧪 Testing project creation...');
    const testProjectData = {
      name: 'Test Project',
      description: 'Test project for schema validation',
      owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
      status: 'pending'
    };
    
    try {
      const { error: testError } = await supabase
        .from('projects')
        .insert(testProjectData);
      
      if (testError) {
        console.log('❌ Project creation test failed:', testError.message);
      } else {
        console.log('✅ Project creation test passed');
        // Clean up test data
        await supabase.from('projects').delete().eq('name', 'Test Project');
      }
    } catch (testError) {
      console.log('❌ Project creation test failed:', testError.message);
    }
    
  } catch (error) {
    console.error('❌ Schema check failed:', error);
  }
}

checkProjectSchema(); 