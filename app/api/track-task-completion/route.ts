import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use admin client to bypass RLS
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('Track task completion request body:', body)
    
    const { 
      taskId, 
      userId, 
      questId, 
      action, 
      taskType, 
      socialPlatform, 
      socialAction, 
      visitUrl, 
      downloadUrl,
      quizAnswers,
      duration,
      metadata 
    } = body

    // Get user session for validation
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 })
    }

    // Create task completion record - filter out undefined values
    const completionData = {
      user_id: userId || user.id,
      task_id: taskId,
      quest_id: questId,
      action: action, // 'completed', 'downloaded', 'visited', 'verified'
      task_type: taskType,
      social_platform: socialPlatform || null,
      social_action: socialAction || null,
      visit_url: visitUrl || null,
      download_url: downloadUrl || null,
      quiz_answers: quizAnswers || null,
      duration_seconds: duration || null,
      metadata: metadata || null,
      completed_at: new Date().toISOString(),
      ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    }

    // Remove any undefined values that might cause database issues
    const cleanCompletionData = Object.fromEntries(
      Object.entries(completionData).filter(([_, value]) => value !== undefined)
    )

    // Validate that required fields exist
    if (!cleanCompletionData.user_id || !cleanCompletionData.task_id || !cleanCompletionData.quest_id) {
      console.error('Missing required fields:', { user_id: cleanCompletionData.user_id, task_id: cleanCompletionData.task_id, quest_id: cleanCompletionData.quest_id })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    console.log('Attempting to insert task completion with data:', cleanCompletionData)
    
    // Try to insert into task_completions first, fallback to user_task_submissions
    let completionResult = null
    let completionError = null
    
    try {
      const { data, error } = await supabaseAdmin
        .from('task_completions')
        .insert(cleanCompletionData)
        .select('id')
      
      completionResult = data
      completionError = error
    } catch (error) {
      console.log('task_completions table not available, using user_task_submissions')
      completionError = error
    }

    // If task_completions failed, use user_task_submissions instead
    if (completionError) {
      console.log('Falling back to user_task_submissions table')
      
      const submissionData = {
        user_id: userId || user.id,
        task_id: taskId,
        quest_id: questId,
        status: 'completed',
        submitted_at: new Date().toISOString(),
        submission_data: {
          task_type: taskType,
          action: action,
          metadata: metadata || {}
        },
        verification_data: {
          method: 'track_task_completion',
          verified: false
        }
      }

      const { data, error } = await supabaseAdmin
        .from('user_task_submissions')
        .insert(submissionData)
        .select('id')

      if (error) {
        console.error('Error tracking task completion in user_task_submissions:', error)
        console.error('Completion data that failed:', submissionData)
        return NextResponse.json({ error: "Failed to track completion", details: error.message }, { status: 500 })
      }

      completionResult = data
      console.log('Task completion tracked in user_task_submissions:', data)
    } else {
      console.log('Task completion tracked in task_completions:', completionResult)
    }

    return NextResponse.json({ 
      success: true, 
      message: "Task completion tracked successfully",
      completionId: completionResult?.[0]?.id || null
    })

  } catch (error) {
    console.error('Error in track-task-completion:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 