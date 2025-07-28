import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      taskId, 
      userId, 
      questId, 
      visitUrl,
      duration,
      metadata 
    } = body

    console.log('Visit completion verification request:', body)

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

    // For visit tasks, we'll implement a simple verification system
    // In a real implementation, you might want to:
    // 1. Track actual page visits via analytics
    // 2. Use browser extensions to verify visits
    // 3. Implement server-side tracking
    
    // For now, we'll assume the user has visited the URL if they're submitting this request
    const verified = true
    const message = `Visit to ${visitUrl} verified successfully`

    if (verified) {
      // Create task completion record
      const completionData = {
        user_id: userId || user.id,
        task_id: taskId,
        quest_id: questId,
        action: 'visited',
        task_type: 'visit',
        visit_url: visitUrl,
        duration_seconds: duration,
        metadata: metadata,
        completed_at: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      }

      const { data, error } = await supabase
        .from('task_completions')
        .insert(completionData)
        .select('id')

      if (error) {
        console.error('Error tracking visit completion:', error)
        return NextResponse.json({ error: "Failed to track visit completion", details: error.message }, { status: 500 })
      }

      // Also create a task submission record
      const submissionData = {
        user_id: userId || user.id,
        task_id: taskId,
        quest_id: questId,
        status: 'verified',
        submitted_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        submission_data: {
          task_type: 'visit',
          visit_url: visitUrl,
          duration_seconds: duration
        },
        verification_data: {
          method: 'visit_verification',
          verified: true,
          visit_url: visitUrl
        },
        xp_earned: 0, // Will be calculated based on task
        xp_awarded: 0
      }

      const { error: submissionError } = await supabase
        .from('user_task_submissions')
        .insert(submissionData)

      if (submissionError) {
        console.error('Error creating visit submission:', submissionError)
        // Don't fail the request, just log the error
      }

      return NextResponse.json({ 
        success: true, 
        message: message,
        verified: true,
        completionId: data?.[0]?.id || null
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Visit verification failed',
        verified: false
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in visit-completion verification:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 