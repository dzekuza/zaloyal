import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    console.log('Testing projects access for user:', user.id)

    // Test reading all projects
    const { data: allProjects, error: allProjectsError } = await supabase
      .from('projects')
      .select('*')
      .limit(5)

    if (allProjectsError) {
      console.error('Error reading all projects:', allProjectsError)
      return NextResponse.json({ 
        error: 'Failed to read all projects',
        details: allProjectsError 
      }, { status: 500 })
    }

    // Test reading user's own projects
    const { data: myProjects, error: myProjectsError } = await supabase
      .from('projects')
      .select('*')
      .eq('owner_id', user.id)

    if (myProjectsError) {
      console.error('Error reading my projects:', myProjectsError)
      return NextResponse.json({ 
        error: 'Failed to read my projects',
        details: myProjectsError 
      }, { status: 500 })
    }

    // Test creating a test project
    const testProject = {
      name: 'Test Project',
      description: 'This is a test project',
      category: 'test',
      owner_id: user.id,
      status: 'active',
      featured: false,
      total_participants: 0
    }

    const { data: createdProject, error: createError } = await supabase
      .from('projects')
      .insert(testProject)
      .select()
      .single()

    if (createError) {
      console.error('Error creating test project:', createError)
      return NextResponse.json({ 
        error: 'Failed to create test project',
        details: createError 
      }, { status: 500 })
    }

    // Clean up test project
    await supabase
      .from('projects')
      .delete()
      .eq('id', createdProject.id)

    return NextResponse.json({ 
      success: true,
      message: 'Projects table test passed',
      allProjectsCount: allProjects?.length || 0,
      myProjectsCount: myProjects?.length || 0,
      testProjectCreated: createdProject
    })

  } catch (error) {
    console.error('Test projects error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 })
  }
} 