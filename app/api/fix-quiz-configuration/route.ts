import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    console.log('Fixing quiz configuration...')

    // Update the quiz task to set the correct answer
    // Based on the task data, answer 1 is "Correct" so that should be the correct answer (index 0)
    const { data, error } = await supabase
      .from('tasks')
      .update({ 
        quiz_correct_answer: 0, // Answer 1 (index 0) is "Correct"
        updated_at: new Date().toISOString()
      })
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670') // The quiz task ID
      .select()

    if (error) {
      console.error('Error fixing quiz configuration:', error)
      return NextResponse.json({ error: "Failed to fix quiz configuration" }, { status: 500 })
    }

    console.log('Quiz configuration fixed successfully:', data)

    return NextResponse.json({ 
      success: true, 
      message: 'Quiz configuration fixed successfully',
      data: data
    })

  } catch (error) {
    console.error('Error in fix-quiz-configuration:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 