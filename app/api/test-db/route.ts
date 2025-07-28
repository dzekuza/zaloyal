import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    // First, try to get existing tasks
    const { data: existingTasks, error: existingError } = await supabase
      .from('tasks')
      .select('*')
      .limit(1)

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    let task = existingTasks?.[0] || null

    // If no tasks exist, create a test task
    if (!task) {
      console.log('No tasks found, creating test task...')
      
      const { data: newTask, error: createError } = await supabase
        .from('tasks')
        .insert({
          quest_id: '00000000-0000-0000-0000-000000000000', // Test UUID
          type: 'test',
          title: 'Test Task',
          description: 'Test task to check available fields',
          xp_reward: 100,
          status: 'test'
        })
        .select()
        .single()

      if (createError) {
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      task = newTask
      console.log('Test task created successfully')
    }

    return NextResponse.json({ 
      success: true,
      task: task,
      availableFields: task ? Object.keys(task) : [],
      note: "This shows the actual fields available in the tasks table"
    })

  } catch (error) {
    console.error('Error in test-db:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query } = await request.json()
    
    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 })
    }

    // Handle specific queries
    if (query.includes('user_task_submissions')) {
      const { data, error } = await supabase
        .from('user_task_submissions')
        .select('id, user_id, task_id, status')
        .limit(5)

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ 
        success: true,
        data: data
      })
    }

    return NextResponse.json({ error: "Unsupported query" }, { status: 400 })

  } catch (error) {
    console.error('Error in test-db POST:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 