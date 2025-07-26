const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Test with anon key (like client-side)
const supabaseAnon = createClient(
  process.env.SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Test with service role key (like admin)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkProjectsRLS() {
  try {
    console.log('🔍 Testing projects table access with different keys...\n');
    
    // Test 1: Service role (admin) access
    console.log('📋 Test 1: Service role access (admin)');
    const { data: adminProjects, error: adminError } = await supabaseAdmin
      .from('projects')
      .select('id, name, status')
      .eq('status', 'approved');
    
    if (adminError) {
      console.error('❌ Admin access error:', adminError);
    } else {
      console.log(`✅ Admin found ${adminProjects?.length || 0} approved projects`);
      if (adminProjects && adminProjects.length > 0) {
        adminProjects.forEach(project => {
          console.log(`   - ${project.name} (${project.status})`);
        });
      }
    }
    
    // Test 2: Anon key (client-side) access
    console.log('\n📋 Test 2: Anon key access (client-side)');
    const { data: anonProjects, error: anonError } = await supabaseAnon
      .from('projects')
      .select('id, name, status')
      .eq('status', 'approved');
    
    if (anonError) {
      console.error('❌ Anon access error:', anonError);
    } else {
      console.log(`✅ Anon found ${anonProjects?.length || 0} approved projects`);
      if (anonProjects && anonProjects.length > 0) {
        anonProjects.forEach(project => {
          console.log(`   - ${project.name} (${project.status})`);
        });
      }
    }
    
    // Test 3: Check RLS status
    console.log('\n📋 Test 3: Checking RLS status');
    const { data: rlsStatus, error: rlsError } = await supabaseAdmin
      .rpc('get_rls_status', { table_name: 'projects' })
      .catch(() => ({ data: null, error: { message: 'RPC function not available' } }));
    
    if (rlsError) {
      console.log('❌ Could not check RLS status:', rlsError.message);
      console.log('💡 This is normal - the RPC function might not exist');
    } else {
      console.log('✅ RLS status:', rlsStatus);
    }
    
    // Test 4: Check if projects table has RLS enabled
    console.log('\n📋 Test 4: Testing RLS policies');
    
    // Try to insert a test project with anon key (should fail if RLS is strict)
    console.log('🧪 Testing insert with anon key...');
    const { data: testInsert, error: insertError } = await supabaseAnon
      .from('projects')
      .insert({
        name: 'TEST_PROJECT_RLS',
        description: 'Test project for RLS',
        status: 'pending'
      })
      .select('id')
      .single();
    
    if (insertError) {
      console.log('❌ Anon insert failed (expected if RLS is enabled):', insertError.message);
    } else {
      console.log('⚠️ Anon insert succeeded (RLS might be disabled)');
      // Clean up test project
      await supabaseAdmin.from('projects').delete().eq('id', testInsert.id);
      console.log('🧹 Cleaned up test project');
    }
    
    // Test 5: Check all projects with both keys
    console.log('\n📋 Test 5: All projects comparison');
    
    const { data: allAdminProjects, error: allAdminError } = await supabaseAdmin
      .from('projects')
      .select('id, name, status');
    
    const { data: allAnonProjects, error: allAnonError } = await supabaseAnon
      .from('projects')
      .select('id, name, status');
    
    console.log(`📊 Admin sees ${allAdminProjects?.length || 0} total projects`);
    console.log(`📊 Anon sees ${allAnonProjects?.length || 0} total projects`);
    
    if (allAdminProjects && allAnonProjects) {
      const adminIds = allAdminProjects.map(p => p.id).sort();
      const anonIds = allAnonProjects.map(p => p.id).sort();
      
      if (JSON.stringify(adminIds) === JSON.stringify(anonIds)) {
        console.log('✅ Both keys see the same projects');
      } else {
        console.log('❌ Different projects visible to admin vs anon');
        console.log('🔍 Admin projects:', adminIds);
        console.log('🔍 Anon projects:', anonIds);
      }
    }
    
    console.log('\n🎉 RLS test completed!');
    
  } catch (error) {
    console.error('❌ Error checking RLS:', error);
  }
}

checkProjectsRLS(); 