import { NextResponse } from "next/server"

export async function GET() {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      return NextResponse.json({ 
        error: "Telegram Bot Token not configured",
        status: "error"
      })
    }

    // Test 1: Get bot information
    const botInfoResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
    const botInfo = await botInfoResponse.json()

    if (!botInfo.ok) {
      return NextResponse.json({
        error: "Failed to get bot information",
        details: botInfo,
        status: "error"
      })
    }

    // Test 2: Get bot updates (to check if bot is receiving messages)
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`)
    const updates = await updatesResponse.json()

    return NextResponse.json({
      status: "success",
      botInfo: {
        id: botInfo.result.id,
        name: botInfo.result.first_name,
        username: botInfo.result.username,
        canJoinGroups: botInfo.result.can_join_groups,
        canReadAllGroupMessages: botInfo.result.can_read_all_group_messages,
        supportsInlineQueries: botInfo.result.supports_inline_queries
      },
      updates: {
        total: updates.result?.length || 0,
        recent: updates.result?.slice(-5) || []
      },
      message: "Telegram bot is configured and working correctly"
    })

  } catch (error) {
    console.error("Telegram bot test error:", error)
    return NextResponse.json({
      error: "Failed to test Telegram bot",
      details: error instanceof Error ? error.message : "Unknown error",
      status: "error"
    }, { status: 500 })
  }
} 