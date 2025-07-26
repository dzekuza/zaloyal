const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function applyRLSFixesSimple() {
  try {
    console.log('🔧 Applying RLS policy fixes (simple approach)...')
    
    // Test current access
    console.log('🧪 Testing current access...')
    
    const { data: quests, error: questsError } = await supabase
      .from('quests')
      .select('id, title, project_id, status')
      .limit(5)
    
    if (questsError) {
      console.error('❌ Error accessing quests:', questsError)
    } else {
      console.log(`✅ Quests access successful - found ${quests?.length || 0} quests`)
      if (quests && quests.length > 0) {
        console.log('📋 Sample quest:', {
          id: quests[0].id,
          title: quests[0].title,
          project_id: quests[0].project_id,
          status: quests[0].status
        })
      }
    }
    
    const { data: projects, error: projectsError } = await supabase
      .from('projects')
      .select('id, name, owner_id, status')
      .limit(5)
    
    if (projectsError) {
      console.error('❌ Error accessing projects:', projectsError)
    } else {
      console.log(`✅ Projects access successful - found ${projects?.length || 0} projects`)
      if (projects && projects.length > 0) {
        console.log('📋 Sample project:', {
          id: projects[0].id,
          name: projects[0].name,
          owner_id: projects[0].owner_id,
          status: projects[0].status
        })
      }
    }
    
    console.log('\n📋 Manual RLS Policy Setup Required:')
    console.log('\n1. Go to Supabase Dashboard > Authentication > Policies')
    console.log('2. Find the "quests" table')
    console.log('3. Apply these policies:')
    console.log('\n   Policy 1: "Allow public read access to active quests"')
    console.log('   - FOR: SELECT')
    console.log('   - TO: public')
    console.log('   - USING: status = \'active\'')
    console.log('\n   Policy 2: "Allow authenticated users to read all quests"')
    console.log('   - FOR: SELECT')
    console.log('   - TO: authenticated')
    console.log('   - USING: true')
    console.log('\n   Policy 3: "Allow project owners to insert quests"')
    console.log('   - FOR: INSERT')
    console.log('   - TO: authenticated')
    console.log('   - WITH CHECK: EXISTS (SELECT 1 FROM projects WHERE projects.id = quests.project_id AND projects.owner_id::text = auth.uid()::text)')
    console.log('\n   Policy 4: "Allow project owners to update quests"')
    console.log('   - FOR: UPDATE')
    console.log('   - TO: authenticated')
    console.log('   - USING: EXISTS (SELECT 1 FROM projects WHERE projects.id = quests.project_id AND projects.owner_id::text = auth.uid()::text)')
    console.log('   - WITH CHECK: EXISTS (SELECT 1 FROM projects WHERE projects.id = quests.project_id AND projects.owner_id::text = auth.uid()::text)')
    console.log('\n   Policy 5: "Allow project owners to delete quests"')
    console.log('   - FOR: DELETE')
    console.log('   - TO: authenticated')
    console.log('   - USING: EXISTS (SELECT 1 FROM projects WHERE projects.id = quests.project_id AND projects.owner_id::text = auth.uid()::text)')
    console.log('\n   Policy 6: "Allow service role full access"')
    console.log('   - FOR: ALL')
    console.log('   - TO: service_role')
    console.log('   - USING: true')
    console.log('   - WITH CHECK: true')
    
    console.log('\n4. Find the "tasks" table')
    console.log('5. Apply similar policies for tasks table')
    
    console.log('\n🎉 RLS policy setup instructions completed!')
    console.log('\n💡 After applying these policies:')
    console.log('- Any authenticated user can view quests and tasks')
    console.log('- Project owners can create/modify/delete quests and tasks')
    console.log('- Service role has full access for admin operations')
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

applyRLSFixesSimple() 