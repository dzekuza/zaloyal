import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing quiz configuration with admin client...')

    // First check current state
    const { data: currentTask, error: fetchError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (fetchError) {
      console.error('Error fetching current task:', fetchError)
      return NextResponse.json({ error: "Failed to fetch current task" }, { status: 500 })
    }

    console.log('Current task before fix:', currentTask)

    // Update the quiz task to set the correct answer using admin client
    const { data, error } = await supabaseAdmin
      .from('tasks')
      .update({ 
        quiz_correct_answer: 0, // Answer 1 (index 0) is "Correct"
        updated_at: new Date().toISOString()
      })
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .select()

    if (error) {
      console.error('Error fixing quiz configuration:', error)
      return NextResponse.json({ error: "Failed to fix quiz configuration", details: error }, { status: 500 })
    }

    console.log('Quiz configuration fixed successfully:', data)

    // Verify the fix by fetching the task again
    const { data: updatedTask, error: verifyError } = await supabaseAdmin
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
    console.error('Error in fix-quiz-admin:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 