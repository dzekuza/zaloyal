import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, username, taskId } = await request.json()

    if (!userWallet || !username || !taskId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user and task from database
    const { data: user } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", userWallet.toLowerCase())
      .single()

    const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).single()

    if (!user || !task) {
      return NextResponse.json({ error: "User or task not found" }, { status: 404 })
    }

    // Real Twitter API v2 verification
    const isFollowing = await verifyTwitterFollow(username, task.social_username)

    if (isFollowing) {
      // Create task submission
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { username, verified_at: new Date().toISOString() },
        verification_data: { method: "twitter_api_v2", verified: true },
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

async function verifyTwitterFollow(userHandle: string, targetHandle: string): Promise<boolean> {
  try {
    // Twitter API v2 requires Bearer Token
    const bearerToken = process.env.TWITTER_BEARER_TOKEN

    if (!bearerToken) {
      throw new Error("Twitter Bearer Token not configured")
    }

    // Step 1: Get user ID from username
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    if (!userResponse.ok) {
      throw new Error("User not found on Twitter")
    }

    const userData = await userResponse.json()
    const userId = userData.data?.id

    if (!userId) {
      return false
    }

    // Step 2: Get target user ID
    const targetResponse = await fetch(`https://api.twitter.com/2/users/by/username/${targetHandle}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    if (!targetResponse.ok) {
      throw new Error("Target user not found on Twitter")
    }

    const targetData = await targetResponse.json()
    const targetUserId = targetData.data?.id

    if (!targetUserId) {
      return false
    }

    // Step 3: Check if user follows target
    const followResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/following?user.fields=id&max_results=1000`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    )

    if (!followResponse.ok) {
      throw new Error("Failed to check following status")
    }

    const followData = await followResponse.json()
    const following = followData.data || []

    // Check if target user is in the following list
    return following.some((user: any) => user.id === targetUserId)
  } catch (error) {
    console.error("Twitter API error:", error)
    return false
  }
}
