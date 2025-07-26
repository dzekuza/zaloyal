const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testProjectVisibility() {
  try {
    console.log('🔍 Testing project visibility...\n');
    
    // Test 1: Get all projects
    console.log('📋 All projects in database:');
    const { data: allProjects, error: allError } = await supabase
      .from('projects')
      .select('id, name, status, created_at, owner_id')
      .order('created_at', { ascending: false });
    
    if (allError) {
      console.error('❌ Error fetching all projects:', allError);
      return;
    }
    
    console.log(`✅ Found ${allProjects?.length || 0} total projects`);
    if (allProjects && allProjects.length > 0) {
      allProjects.forEach(project => {
        console.log(`   - ${project.name} (${project.status}) - ${project.created_at}`);
      });
    }
    
    // Test 2: Get only approved projects (like main page)
    console.log('\n📋 Approved projects only:');
    const { data: approvedProjects, error: approvedError } = await supabase
      .from('projects')
      .select('id, name, status, created_at, owner_id')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });
    
    if (approvedError) {
      console.error('❌ Error fetching approved projects:', approvedError);
      return;
    }
    
    console.log(`✅ Found ${approvedProjects?.length || 0} approved projects`);
    if (approvedProjects && approvedProjects.length > 0) {
      approvedProjects.forEach(project => {
        console.log(`   - ${project.name} (${project.status}) - ${project.created_at}`);
      });
    }
    
    // Test 3: Check for any projects with different statuses
    console.log('\n📋 Projects by status:');
    const { data: statusProjects, error: statusError } = await supabase
      .from('projects')
      .select('status, count')
      .select('status')
      .order('status');
    
    if (statusError) {
      console.error('❌ Error fetching projects by status:', statusError);
      return;
    }
    
    // Group by status
    const statusCounts = {};
    if (statusProjects) {
      statusProjects.forEach(project => {
        statusCounts[project.status] = (statusCounts[project.status] || 0) + 1;
      });
    }
    
    console.log('📊 Status breakdown:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   - ${status}: ${count} projects`);
    });
    
    // Test 4: Check if there are any projects with null status
    console.log('\n📋 Projects with null status:');
    const { data: nullStatusProjects, error: nullStatusError } = await supabase
      .from('projects')
      .select('id, name, status, created_at')
      .is('status', null);
    
    if (nullStatusError) {
      console.error('❌ Error fetching null status projects:', nullStatusError);
    } else {
      console.log(`✅ Found ${nullStatusProjects?.length || 0} projects with null status`);
      if (nullStatusProjects && nullStatusProjects.length > 0) {
        nullStatusProjects.forEach(project => {
          console.log(`   - ${project.name} (null status) - ${project.created_at}`);
        });
      }
    }
    
    // Test 5: Check the most recent project
    console.log('\n📋 Most recent project:');
    const { data: recentProject, error: recentError } = await supabase
      .from('projects')
      .select('id, name, status, created_at, owner_id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (recentError) {
      console.error('❌ Error fetching most recent project:', recentError);
    } else if (recentProject) {
      console.log(`✅ Most recent: ${recentProject.name} (${recentProject.status}) - ${recentProject.created_at}`);
    }
    
    console.log('\n🎉 Project visibility test completed!');
    
  } catch (error) {
    console.error('❌ Error testing project visibility:', error);
  }
}

testProjectVisibility(); 