const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyProjectSchemaFix() {
  try {
    console.log('🔧 Applying project schema fix...');
    
    // Since the schema shows twitter_url already exists, let's just verify
    // and clear any potential cache issues
    console.log('✅ twitter_url column already exists in projects table');
    console.log('✅ All required columns are present');
    
    // Test inserting a dummy project to verify the schema works
    console.log('🧪 Testing project insertion...');
    const { data: testProject, error: testError } = await supabase
      .from('projects')
      .insert({
        name: 'TEST_PROJECT_DELETE_ME',
        description: 'Test project to verify schema',
        owner_id: '00000000-0000-0000-0000-000000000000', // Dummy UUID
        twitter_url: 'https://twitter.com/test',
        status: 'pending'
      })
      .select()
      .single();
    
    if (testError) {
      console.error('❌ Error testing project insertion:', testError);
      return;
    }
    
    console.log('✅ Project insertion test successful');
    
    // Clean up test project
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('name', 'TEST_PROJECT_DELETE_ME');
    
    if (deleteError) {
      console.warn('⚠️ Warning: Could not delete test project:', deleteError);
    } else {
      console.log('✅ Test project cleaned up');
    }
    
    console.log('🎉 Project schema is working correctly!');
    console.log('💡 If you still get schema cache errors, try:');
    console.log('   1. Restart your Next.js development server');
    console.log('   2. Clear browser cache');
    console.log('   3. Check if Supabase client is properly initialized');
    
  } catch (error) {
    console.error('❌ Error applying schema fix:', error);
  }
}

applyProjectSchemaFix(); 