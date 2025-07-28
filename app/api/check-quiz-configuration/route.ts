import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    console.log('Checking quiz configuration...')

    // Get the current quiz task
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (error) {
      console.error('Error fetching quiz task:', error)
      return NextResponse.json({ error: "Failed to fetch quiz task" }, { status: 500 })
    }

    console.log('Current quiz task:', task)

    return NextResponse.json({ 
      success: true, 
      task: task,
      needsFix: task.quiz_correct_answer === null
    })

  } catch (error) {
    console.error('Error in check-quiz-configuration:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing quiz configuration...')

    // First check current state
    const { data: currentTask, error: fetchError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (fetchError) {
      console.error('Error fetching current task:', fetchError)
      return NextResponse.json({ error: "Failed to fetch current task" }, { status: 500 })
    }

    console.log('Current task before fix:', currentTask)

    // Update the quiz task to set the correct answer
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        quiz_correct_answer: 0, // Answer 1 (index 0) is "Correct"
        updated_at: new Date().toISOString()
      })
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .select()

    if (error) {
      console.error('Error fixing quiz configuration:', error)
      return NextResponse.json({ error: "Failed to fix quiz configuration" }, { status: 500 })
    }

    console.log('Quiz configuration fixed successfully:', data)

    // Verify the fix by fetching the task again
    const { data: updatedTask, error: verifyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (verifyError) {
      console.error('Error verifying fix:', verifyError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz configuration fixed successfully',
      beforeFix: currentTask,
      afterFix: updatedTask,
      data: data
    })

  } catch (error) {
    console.error('Error in fix-quiz-configuration:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 