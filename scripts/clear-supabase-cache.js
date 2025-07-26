const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function clearSupabaseCache() {
  try {
    console.log('🧹 Clearing Supabase cache...');
    
    // Test a simple query to refresh the schema cache
    console.log('🔄 Refreshing schema cache...');
    const { data: testData, error: testError } = await supabase
      .from('projects')
      .select('id, name, twitter_url')
      .limit(1);
    
    if (testError) {
      console.error('❌ Error refreshing cache:', testError);
      return;
    }
    
    console.log('✅ Schema cache refreshed successfully');
    console.log('📋 Sample data:', testData);
    
    // Test the specific column that was causing issues
    console.log('🔍 Testing twitter_url column specifically...');
    const { data: twitterTest, error: twitterError } = await supabase
      .from('projects')
      .select('twitter_url')
      .limit(1);
    
    if (twitterError) {
      console.error('❌ Error testing twitter_url column:', twitterError);
    } else {
      console.log('✅ twitter_url column is accessible');
    }
    
    console.log('🎉 Cache clearing completed!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Restart your Next.js development server:');
    console.log('      npm run dev');
    console.log('   2. Clear your browser cache');
    console.log('   3. Try creating a project again');
    
  } catch (error) {
    console.error('❌ Error clearing cache:', error);
  }
}

clearSupabaseCache(); 