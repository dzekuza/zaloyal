import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

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

    // Get user session
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 })
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
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
    
    const { data, error } = await supabase
      .from('task_completions')
      .insert(cleanCompletionData)
      .select('id')

    if (error) {
      console.error('Error tracking task completion:', error)
      console.error('Completion data that failed:', cleanCompletionData)
      return NextResponse.json({ error: "Failed to track completion", details: error.message }, { status: 500 })
    }

    console.log('Task completion inserted successfully:', data)

    return NextResponse.json({ 
      success: true, 
      message: "Task completion tracked successfully",
      completionId: data?.[0]?.id || null
    })

  } catch (error) {
    console.error('Error in track-task-completion:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 