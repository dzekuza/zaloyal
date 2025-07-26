const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function getCompleteSchema() {
  try {
    console.log('🔍 Getting complete database schema...\n');
    
    // List of tables to check
    const tables = [
      'users',
      'quests', 
      'tasks',
      'projects',
      'social_accounts',
      'oauth_states',
      'user_task_submissions',
      'quest_categories'
    ];
    
    for (const tableName of tables) {
      console.log(`📋 Table: ${tableName}`);
      console.log('─'.repeat(50));
      
      try {
        // Try to get all columns by selecting everything
        const { data: allColumns, error: allError } = await supabase
          .from(tableName)
          .select('*')
          .limit(0);
        
        if (allError) {
          console.log(`❌ Error accessing ${tableName}: ${allError.message}`);
          continue;
        }
        
        console.log(`✅ ${tableName} table is accessible`);
        
        // Test individual columns to see what exists
        const commonColumns = [
          'id', 'created_at', 'updated_at', 'title', 'name', 'description',
          'project_id', 'quest_id', 'user_id', 'total_xp', 'xp_reward',
          'status', 'task_type', 'social_action', 'social_url', 'social_post_id',
          'order_index', 'platform', 'platform_user_id', 'platform_username',
          'access_token', 'access_token_secret', 'refresh_token', 'token_expires_at',
          'profile_data', 'verified', 'state', 'code_verifier', 'expires_at',
          'submitted_at', 'verified_at', 'xp_awarded', 'verification_data',
          'owner_id', 'website_url', 'logo_url', 'cover_image_url', 'contract_address',
          'blockchain_network', 'twitter_url', 'discord_url', 'telegram_url',
          'github_url', 'medium_url', 'total_quests', 'total_participants',
          'total_xp_distributed', 'verified', 'featured', 'tags', 'category',
          'founded_date', 'team_size', 'x_username', 'x_id', 'x_avatar_url',
          'email', 'username', 'avatar_url', 'discord_id', 'discord_username',
          'discord_avatar_url', 'telegram_id', 'telegram_username', 'telegram_avatar_url',
          'twitter_username', 'twitter_id', 'twitter_avatar_url', 'wallet_address',
          'level', 'time_limit_days', 'max_participants', 'is_featured'
        ];
        
        const availableColumns = [];
        const missingColumns = [];
        
        for (const column of commonColumns) {
          try {
            const { data, error } = await supabase
              .from(tableName)
              .select(column)
              .limit(1);
            
            if (error) {
              missingColumns.push(column);
            } else {
              availableColumns.push(column);
            }
          } catch (err) {
            missingColumns.push(column);
          }
        }
        
        console.log(`✅ Available columns (${availableColumns.length}):`);
        availableColumns.forEach(col => console.log(`   - ${col}`));
        
        if (missingColumns.length > 0) {
          console.log(`❌ Missing columns (${missingColumns.length}):`);
          missingColumns.forEach(col => console.log(`   - ${col}`));
        }
        
        // Test data retrieval
        const { data: sampleData, error: dataError } = await supabase
          .from(tableName)
          .select('id')
          .limit(3);
        
        if (dataError) {
          console.log(`❌ Error retrieving data: ${dataError.message}`);
        } else {
          console.log(`📊 Found ${sampleData?.length || 0} records`);
          if (sampleData && sampleData.length > 0) {
            console.log(`📋 Sample IDs: ${sampleData.map(r => r.id).join(', ')}`);
          }
        }
        
      } catch (error) {
        console.log(`❌ Error processing ${tableName}: ${error.message}`);
      }
      
      console.log('\n');
    }
    
    console.log('🎉 Schema analysis completed!');
    
  } catch (error) {
    console.error('❌ Error getting schema:', error);
  }
}

getCompleteSchema(); 