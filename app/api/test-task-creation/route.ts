import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Testing task creation...')

    // Try to create a simple task with only the basic fields that definitely exist
    const { data, error } = await supabase
      .from('tasks')
      .insert({
        quest_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        type: 'social',
        title: 'Test Task',
        description: 'Test task description',
        xp_reward: 100,
        status: 'pending'
        // Only include the basic fields that we know exist
      })
      .select()

    if (error) {
      console.error('Error creating test task:', error)
      return NextResponse.json({ 
        error: "Failed to create task", 
        details: error.message,
        code: error.code
      }, { status: 500 })
    }

    console.log('Successfully created test task:', data)

    // Clean up the test task
    if (data && data.length > 0) {
      const { error: deleteError } = await supabase
        .from('tasks')
        .delete()
        .eq('id', data[0].id)

      if (deleteError) {
        console.error('Error cleaning up test task:', deleteError)
      } else {
        console.log('Cleaned up test task')
      }
    }

    return NextResponse.json({ 
      success: true,
      message: "Task creation test successful",
      task: data?.[0] || null
    })

  } catch (error) {
    console.error('Error in test-task-creation:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 