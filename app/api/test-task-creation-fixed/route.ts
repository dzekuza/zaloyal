import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    console.log('Testing task creation with minimal fields...')

    // Test with only the fields that definitely exist in the database
    const testTask = {
      quest_id: '00000000-0000-0000-0000-000000000000', // dummy quest ID
      type: 'social',
      title: 'Test Task',
      description: 'Test description',
      xp_reward: 100,
      status: 'pending'
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert(testTask)
      .select()

    if (error) {
      console.error('Error creating test task:', error)
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        code: error.code 
      }, { status: 400 })
    }

    console.log('Test task created successfully:', data)

    // Clean up - delete the test task
    const { error: deleteError } = await supabase
      .from('tasks')
      .delete()
      .eq('id', data[0].id)

    if (deleteError) {
      console.error('Error deleting test task:', deleteError)
    }

    return NextResponse.json({
      success: true,
      message: 'Task creation test passed',
      task: data[0]
    })

  } catch (error) {
    console.error('Error in test-task-creation-fixed:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 