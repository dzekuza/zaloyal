import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, username, postId, taskId } = await request.json()

    if (!userWallet || !username || !postId || !taskId) {
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

    // Check cache
    const { data: cached } = await supabase
      .from("social_verification_cache")
      .select("*")
      .eq("user_id", user.id)
      .eq("platform", "twitter")
      .eq("action", "like")
      .eq("target_id", postId)
      .gt("expires_at", new Date().toISOString())
      .single()

    if (cached) {
      return NextResponse.json({
        verified: cached.verified,
        cached: true,
        message: cached.verified ? "Already verified" : "Post not liked",
      })
    }

    // Simulate Twitter API call to check if user liked the post
    const hasLiked = await simulateTwitterLikeCheck(username, postId)

    // Cache the result
    await supabase.from("social_verification_cache").upsert({
      user_id: user.id,
      platform: "twitter",
      action: "like",
      target_id: postId,
      verified: hasLiked,
      verification_data: { checked_at: new Date().toISOString() },
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })

    if (hasLiked) {
      // Create task submission
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { username, post_id: postId, verified_at: new Date().toISOString() },
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
      verified: hasLiked,
      message: hasLiked ? "Like verified!" : "Please like the post first",
      xpEarned: hasLiked ? task.xp_reward : 0,
    })
  } catch (error) {
    console.error("Twitter like verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

async function simulateTwitterLikeCheck(userHandle: string, postId: string): Promise<boolean> {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return Math.random() > 0.3
}
