import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, username, taskId } = await request.json()

    if (!userWallet || !username || !taskId) {
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

    // Check if already verified recently (cache)
    const { data: cached } = await supabase
      .from("social_verification_cache")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "twitter")
      .eq("action", "follow")
      .eq("target_id", task.social_username)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (cached) {
      return NextResponse.json({
        verified: cached.verified,
        cached: true,
        message: cached.verified ? "Already verified" : "Not following",
      })
    }

    // In a real implementation, you would use Twitter API to verify
    // For demo purposes, we'll simulate verification
    const isFollowing = await simulateTwitterFollowCheck(username, task.social_username)

    // Cache the result
    await supabase.from("social_verification_cache").upsert({
      user_id: user.id,
      platform: "twitter",
      action: "follow",
      target_id: task.social_username,
      verified: isFollowing,
      verification_data: { checked_at: new Date().toISOString() },
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
    })

    if (isFollowing) {
      // Create or update task submission
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { username, verified_at: new Date().toISOString() },
        verification_data: { method: "twitter_api", verified: true },
        xp_earned: task.xp_reward,
        verified_at: new Date().toISOString(),
      })

      // Update user XP
      await supabase.rpc("increment_user_xp", {
        user_wallet: userWallet.toLowerCase(),
        xp_amount: task.xp_reward,
      })
    }

    return NextResponse.json({
      verified: isFollowing,
      message: isFollowing ? "Follow verified!" : "Please follow the account first",
      xpEarned: isFollowing ? task.xp_reward : 0,
    })
  } catch (error) {
    console.error("Twitter follow verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

// Simulate Twitter API call (replace with real Twitter API)
async function simulateTwitterFollowCheck(userHandle: string, targetHandle: string): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Use Twitter API v2 to check if userHandle follows targetHandle
  // 2. Handle rate limiting and authentication
  // 3. Return actual follow status

  // For demo, randomly return true 70% of the time
  await new Promise((resolve) => setTimeout(resolve, 1000)) // Simulate API delay
  return Math.random() > 0.3
}
