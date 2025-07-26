const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function applyProjectsRLSFix() {
  try {
    console.log('🔧 Applying projects RLS fix...\n');
    
    // Test before fix
    console.log('📋 Before fix - Testing access...');
    const { data: beforeAdminProjects, error: beforeAdminError } = await supabaseAdmin
      .from('projects')
      .select('id, name, status')
      .eq('status', 'approved');
    
    const { data: beforeAnonProjects, error: beforeAnonError } = await supabaseAnon
      .from('projects')
      .select('id, name, status')
      .eq('status', 'approved');
    
    console.log(`✅ Admin sees ${beforeAdminProjects?.length || 0} approved projects`);
    console.log(`❌ Anon sees ${beforeAnonProjects?.length || 0} approved projects`);
    
    if (beforeAnonProjects?.length === 0 && beforeAdminProjects?.length > 0) {
      console.log('🔍 Issue confirmed: RLS is blocking anon access to approved projects');
    }
    
    // Apply the RLS fix by running the SQL
    console.log('\n🔧 Applying RLS policies...');
    
    // Note: In a real scenario, you would run the SQL migration
    // For now, we'll test if the issue is resolved by checking the current policies
    
    console.log('💡 To apply the RLS fix, run the SQL migration:');
    console.log('   scripts/fix-projects-rls.sql');
    console.log('');
    console.log('   Or apply it manually in Supabase dashboard:');
    console.log('   1. Go to Authentication > Policies');
    console.log('   2. Find the projects table');
    console.log('   3. Add the policies from the SQL file');
    console.log('');
    console.log('   Key policy needed:');
    console.log('   - "Allow public read access to approved projects"');
    console.log('   - FOR SELECT TO public USING (status = \'approved\')');
    
    // Test if we can manually verify the fix
    console.log('\n📋 Testing if RLS policies exist...');
    
    // Try to get the current policies (this might not work with anon key)
    const { data: policies, error: policiesError } = await supabaseAdmin
      .from('information_schema.table_privileges')
      .select('*')
      .eq('table_name', 'projects');
    
    if (policiesError) {
      console.log('❌ Could not check policies:', policiesError.message);
    } else {
      console.log(`✅ Found ${policies?.length || 0} table privileges`);
    }
    
    console.log('\n🎉 RLS fix instructions provided!');
    console.log('💡 After applying the policies, the main page should show approved projects');
    
  } catch (error) {
    console.error('❌ Error applying RLS fix:', error);
  }
}

applyProjectsRLSFix(); 