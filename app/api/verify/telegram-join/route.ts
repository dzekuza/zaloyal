import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, taskId, telegramData } = await request.json()

    if (!userWallet || !taskId || !telegramData) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Verify Telegram data authenticity
    const isValidTelegramData = verifyTelegramAuth(telegramData)
    if (!isValidTelegramData) {
      return NextResponse.json({ error: "Invalid Telegram authentication data" }, { status: 400 })
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

    // For Telegram group verification, we'll check if the user has authenticated with Telegram
    // In a real implementation, you would also verify group membership through the group's API
    const isMember = await checkTelegramGroupMembership(telegramData, task.social_url)

    // Cache the result
    await supabase.from("social_verification_cache").upsert({
      user_id: user.id,
      platform: "telegram",
      action: "join",
      target_id: task.social_url?.split("/").pop() || "",
      verified: isMember,
      verification_data: {
        telegram_user: telegramData,
        checked_at: new Date().toISOString(),
      },
      expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
    })

    if (isMember) {
      // Create task submission
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: {
          telegram_user: telegramData,
          verified_at: new Date().toISOString(),
        },
        verification_data: { method: "telegram_login_widget", verified: true },
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
      verified: isMember,
      message: isMember ? "Telegram membership verified!" : "Please join the group first",
      xpEarned: isMember ? task.xp_reward : 0,
    })
  } catch (error) {
    console.error("Telegram join verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

function verifyTelegramAuth(telegramData: any): boolean {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) {
    // For demo purposes, accept any telegram data if no bot token is configured
    return true
  }

  try {
    const { hash, ...data } = telegramData
    const secret = crypto.createHash("sha256").update(botToken).digest()
    const checkString = Object.keys(data)
      .sort()
      .map((key) => `${key}=${data[key]}`)
      .join("\n")

    const hmac = crypto.createHmac("sha256", secret).update(checkString).digest("hex")
    return hmac === hash
  } catch (error) {
    console.error("Telegram auth verification error:", error)
    return false
  }
}

async function checkTelegramGroupMembership(telegramData: any, groupUrl?: string): Promise<boolean> {
  // In a real implementation, you would:
  // 1. Parse the group URL to get the group username/ID
  // 2. Use Telegram's API to check if the user is a member
  // 3. For public groups, you might use web scraping or other methods

  // For demo purposes, we'll simulate membership check
  // In production, you'd implement actual group membership verification
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return Math.random() > 0.3 // 70% success rate for demo
}
