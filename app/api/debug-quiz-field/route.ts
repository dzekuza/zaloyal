import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function GET(request: NextRequest) {
  try {
    console.log('Debugging quiz field...')

    // Try to get the task with all fields
    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (error) {
      console.error('Error fetching task:', error)
      return NextResponse.json({ error: "Failed to fetch task", details: error }, { status: 500 })
    }

    // Check if the field exists in the response
    const hasQuizCorrectAnswer = 'quiz_correct_answer' in task
    const quizCorrectAnswerValue = task.quiz_correct_answer

    console.log('Task fields:', Object.keys(task))
    console.log('Has quiz_correct_answer field:', hasQuizCorrectAnswer)
    console.log('quiz_correct_answer value:', quizCorrectAnswerValue)

    return NextResponse.json({ 
      success: true, 
      task: task,
      hasQuizCorrectAnswerField: hasQuizCorrectAnswer,
      quizCorrectAnswerValue: quizCorrectAnswerValue,
      allFields: Object.keys(task)
    })

  } catch (error) {
    console.error('Error in debug-quiz-field:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('Testing quiz field update...')

    // Try different approaches to update the field
    const updateData = {
      quiz_correct_answer: 0,
      updated_at: new Date().toISOString()
    }

    console.log('Attempting update with data:', updateData)

    const { data, error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .select()

    if (error) {
      console.error('Error updating task:', error)
      return NextResponse.json({ 
        error: "Failed to update task", 
        details: error,
        updateData: updateData
      }, { status: 500 })
    }

    console.log('Update result:', data)

    // Fetch the task again to verify
    const { data: verifyTask, error: verifyError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', '1b6ff809-85e5-4453-97af-cb82769de670')
      .single()

    if (verifyError) {
      console.error('Error verifying update:', verifyError)
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Update attempted',
      updateResult: data,
      verificationResult: verifyTask,
      updateData: updateData
    })

  } catch (error) {
    console.error('Error in debug-quiz-field POST:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 