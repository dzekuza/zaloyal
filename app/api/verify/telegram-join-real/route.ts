import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const { userWallet, username, groupId, taskId } = await request.json()

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

    // Real Telegram Bot API verification
    const isMember = await verifyTelegramMembership(username, groupId)

    if (isMember) {
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { username, group_id: groupId, verified_at: new Date().toISOString() },
        verification_data: { method: "telegram_bot_api", verified: true },
        xp_earned: task.xp_reward,
        verified_at: new Date().toISOString(),
      })

      await supabase.rpc("increment_user_xp", {
        user_wallet: userWallet.toLowerCase(),
        xp_amount: task.xp_reward,
      })
    }

    return NextResponse.json({
      verified: isMember,
      message: isMember ? "Membership verified!" : "Please join the group first",
      xpEarned: isMember ? task.xp_reward : 0,
    })
  } catch (error) {
    console.error("Telegram verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}

async function verifyTelegramMembership(username: string, groupId: string): Promise<boolean> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      throw new Error("Telegram Bot Token not configured")
    }

    // Step 1: Get user ID from username (requires the user to have messaged the bot first)
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`)
    const updatesData = await updatesResponse.json()

    // Find user by username in recent messages
    let userId: number | null = null
    for (const update of updatesData.result || []) {
      if (update.message?.from?.username === username) {
        userId = update.message.from.id
        break
      }
    }

    if (!userId) {
      // Alternative: Ask user to send a specific message to the bot first
      throw new Error("User must message the bot first for verification")
    }

    // Step 2: Check if user is member of the group/channel
    const memberResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${groupId}&user_id=${userId}`,
    )

    if (!memberResponse.ok) {
      return false
    }

    const memberData = await memberResponse.json()

    if (!memberData.ok) {
      return false
    }

    // Check if user is a member (not left or kicked)
    const status = memberData.result?.status
    return ["member", "administrator", "creator"].includes(status)
  } catch (error) {
    console.error("Telegram API error:", error)
    return false
  }
}
