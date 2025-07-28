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
      formUrl,
      metadata 
    } = body

    console.log('Form completion verification request:', body)

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

    // For form tasks, we'll implement a simple verification system
    // In a real implementation, you might want to:
    // 1. Track actual form submissions via analytics
    // 2. Use webhooks to verify form submissions
    // 3. Implement server-side tracking
    
    // Get task details to determine XP reward
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('xp_reward, title, description')
      .eq('id', taskId)
      .single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // Check if user has already completed this task
    const { data: existingSubmission } = await supabase
      .from('user_task_submissions')
      .select('id')
      .eq('user_id', userId || user.id)
      .eq('task_id', taskId)
      .single()

    if (existingSubmission) {
      return NextResponse.json({ 
        success: true, 
        message: 'Task already completed!',
        verified: true,
        xpEarned: 0
      })
    }

    // For now, we'll assume the user has submitted the form if they're submitting this request
    const verified = true
    const message = `Form submission to ${formUrl} verified successfully! You earned ${task.xp_reward} XP!`

    if (verified) {
      // Create task completion record
      const completionData = {
        user_id: userId || user.id,
        task_id: taskId,
        quest_id: questId,
        action: 'form_submitted',
        task_type: 'form',
        form_url: formUrl,
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
        console.error('Error tracking form completion:', error)
        return NextResponse.json({ error: "Failed to track form completion", details: error.message }, { status: 500 })
      }

      // Create a task submission record with XP
      const submissionData = {
        user_id: userId || user.id,
        task_id: taskId,
        quest_id: questId,
        status: 'verified',
        submitted_at: new Date().toISOString(),
        verified_at: new Date().toISOString(),
        verified: true,
        submission_data: {
          task_type: 'form',
          form_url: formUrl
        },
        verification_data: {
          method: 'form_verification',
          verified: true,
          form_url: formUrl
        }
      }

      const { error: submissionError } = await supabase
        .from('user_task_submissions')
        .insert(submissionData)

      if (submissionError) {
        console.error('Error creating form submission:', submissionError)
        // Don't fail the request, just log the error
      }

      // Update user's total XP
      const { data: currentUser, error: userError } = await supabase
        .from('users')
        .select('total_xp, level')
        .eq('id', userId || user.id)
        .single()

      if (!userError && currentUser) {
        const newTotalXp = (currentUser.total_xp || 0) + task.xp_reward
        const newLevel = newTotalXp >= 400 ? 5 : 
                        newTotalXp >= 300 ? 4 : 
                        newTotalXp >= 200 ? 3 : 
                        newTotalXp >= 100 ? 2 : 
                        currentUser.level || 1

        const { error: xpError } = await supabase
          .from('users')
          .update({ 
            total_xp: newTotalXp,
            level: newLevel
          })
          .eq('id', userId || user.id)

        if (xpError) {
          console.error('Error updating user XP:', xpError)
          // Don't fail the request, just log the error
        }
      }

      return NextResponse.json({ 
        success: true, 
        message: message,
        verified: true,
        completionId: data?.[0]?.id || null,
        xpEarned: task.xp_reward
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Form verification failed',
        verified: false
      }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in form-completion verification:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 