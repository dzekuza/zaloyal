import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, taskId, submissionData } = await request.json()

    if (!userWallet || !taskId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", userWallet.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get task details
    const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single()

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 })
    }

    // For manual completion tasks (download, visit, form), we trust the user completed it
    // In a real implementation, you might want additional verification

    // Create task submission
    const { error: submissionError } = await supabase.from("user_task_submissions").upsert({
      user_id: user.id,
      task_id: taskId,
      quest_id: task.quest_id,
      status: "verified",
      submission_data: submissionData || {},
      verification_data: { method: "manual", verified_at: new Date().toISOString() },
      xp_earned: task.xp_reward,
      verified_at: new Date().toISOString(),
    })

    if (submissionError) {
      throw submissionError
    }

    // Update user XP
    const { error: xpError } = await supabase.rpc("increment_user_xp", {
      user_wallet: userWallet.toLowerCase(),
      xp_amount: task.xp_reward,
    })

    if (xpError) {
      console.error("XP update error:", xpError)
    }

    return NextResponse.json({
      verified: true,
      message: "Task completed successfully!",
      xpEarned: task.xp_reward,
    })
  } catch (error) {
    console.error("Manual completion error:", error)
    return NextResponse.json({ error: "Completion failed" }, { status: 500 })
  }
}
