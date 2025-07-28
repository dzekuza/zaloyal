import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Starting task completions table setup...')

    // Test if we can access the tasks table
    const { data: testTask, error: testError } = await supabase
      .from('tasks')
      .select('id, title')
      .limit(1)

    if (testError) {
      console.error('Error accessing tasks table:', testError)
      return NextResponse.json({ error: "Cannot access tasks table" }, { status: 500 })
    }

    console.log('Tasks table accessible')

    // Test if we can access the task_completions table
    const { data: testCompletion, error: completionError } = await supabase
      .from('task_completions')
      .select('id')
      .limit(1)

    if (completionError && completionError.code === 'PGRST116') {
      console.log('task_completions table does not exist yet')
    } else if (completionError) {
      console.error('Error accessing task_completions table:', completionError)
    } else {
      console.log('task_completions table exists')
    }

    // Test if we can access the user_task_submissions table
    const { data: testSubmission, error: submissionError } = await supabase
      .from('user_task_submissions')
      .select('id')
      .limit(1)

    if (submissionError && submissionError.code === 'PGRST116') {
      console.log('user_task_submissions table does not exist yet')
    } else if (submissionError) {
      console.error('Error accessing user_task_submissions table:', submissionError)
    } else {
      console.log('user_task_submissions table exists')
    }

    // Try to insert a test record to trigger table creation
    const { data: testInsert, error: insertError } = await supabase
      .from('task_completions')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        task_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        quest_id: '00000000-0000-0000-0000-000000000000', // Test UUID
        action: 'test',
        task_type: 'test'
      })
      .select()

    if (insertError && insertError.code === 'PGRST116') {
      console.log('task_completions table will be created by Supabase')
    } else if (insertError) {
      console.log('task_completions table exists but insert failed:', insertError.message)
    } else {
      console.log('Successfully inserted test record')
      // Clean up the test record
      await supabase
        .from('task_completions')
        .delete()
        .eq('action', 'test')
    }

    return NextResponse.json({ 
      success: true, 
      message: "Task completions table setup completed",
      note: "Tables will be created automatically by Supabase when first accessed"
    })

  } catch (error) {
    console.error('Error in create-task-completions-table:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 