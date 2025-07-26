const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyOAuthSecretMigration() {
  try {
    console.log('🔧 Applying OAuth secret migration...');
    
    // Add access_token_secret column to social_accounts table
    console.log('Adding access_token_secret column...');
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE social_accounts 
        ADD COLUMN IF NOT EXISTS access_token_secret text;
      `
    });
    
    if (alterError) {
      console.error('Error adding access_token_secret column:', alterError);
      return;
    }
    
    // Add index for access_token_secret
    console.log('Adding index for access_token_secret...');
    const { error: indexError } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_social_accounts_access_token_secret 
        ON social_accounts(access_token_secret);
      `
    });
    
    if (indexError) {
      console.error('Error creating index:', indexError);
    }
    
    // Update existing records to have empty access_token_secret if null
    console.log('Updating existing records...');
    const { error: updateError } = await supabase.rpc('exec_sql', {
      sql: `
        UPDATE social_accounts 
        SET access_token_secret = '' 
        WHERE access_token_secret IS NULL;
      `
    });
    
    if (updateError) {
      console.error('Error updating existing records:', updateError);
    }
    
    // Add comment to document the field
    console.log('Adding column comment...');
    const { error: commentError } = await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN social_accounts.access_token_secret IS 'OAuth 1.0a access token secret (required for Twitter API v1.1)';
      `
    });
    
    if (commentError) {
      console.error('Error adding comment:', commentError);
    }
    
    console.log('✅ OAuth secret migration completed successfully!');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  }
}

applyOAuthSecretMigration(); 