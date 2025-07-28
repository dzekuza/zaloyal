import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const { submissionId } = await request.json()

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required" }, { status: 400 })
    }

    // Get the submission and task details
    const { data: submission, error: submissionError } = await supabaseAdmin
      .from('user_task_submissions')
      .select('*, tasks(xp_reward)')
      .eq('id', submissionId)
      .single()

    if (submissionError || !submission) {
      return NextResponse.json({ error: "Submission not found" }, { status: 404 })
    }

    // Update the submission with the correct XP earned
    const { error: updateError } = await supabaseAdmin
      .from('user_task_submissions')
      .update({ 
        xp_earned: submission.status === 'verified' ? submission.tasks?.xp_reward || 0 : 0 
      })
      .eq('id', submissionId)

    if (updateError) {
      console.error('Error updating submission XP:', updateError)
      return NextResponse.json({ error: "Failed to update submission XP" }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      xp_earned: submission.status === 'verified' ? submission.tasks?.xp_reward || 0 : 0 
    })
  } catch (error) {
    console.error('Error in update-submission-xp:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 