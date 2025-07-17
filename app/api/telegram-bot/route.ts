import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { message, callback_query } = body

    // Handle callback queries (button clicks)
    if (callback_query) {
      return handleCallbackQuery(callback_query)
    }

    // Handle regular messages
    if (message) {
      return handleMessage(message)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("Telegram bot webhook error:", error)
    return NextResponse.json({ error: "Webhook error" }, { status: 500 })
  }
}

async function handleMessage(message: any) {
  const { text, from, chat } = message
  const userId = from?.id
  const username = from?.username

  if (!userId) {
    return NextResponse.json({ ok: true })
  }

  switch (text) {
    case "/start":
      return sendMessage(chat.id, 
        "Welcome to Zaloyal Verification Bot! 🚀\n\n" +
        "Use /verify to check your channel membership.\n" +
        "Use /help for more information."
      )

    case "/help":
      return sendMessage(chat.id,
        "📋 Available commands:\n\n" +
        "/start - Start the bot\n" +
        "/verify - Verify channel membership\n" +
        "/help - Show this help message\n\n" +
        "To verify membership:\n" +
        "1. Join the required channel\n" +
        "2. Use /verify command\n" +
        "3. Follow the verification process"
      )

    case "/verify":
      return handleVerificationRequest(chat.id, userId, username)

    default:
      return sendMessage(chat.id, 
        "Unknown command. Use /help to see available commands."
      )
  }
}

async function handleVerificationRequest(chatId: number, userId: number, username?: string) {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    const defaultChannelId = process.env.TELEGRAM_DEFAULT_CHANNEL_ID

    if (!botToken) {
      return sendMessage(chatId, "Bot configuration error. Please contact support.")
    }

    // Check if user is member of the default channel
    const memberResponse = await fetch(
      `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${defaultChannelId}&user_id=${userId}`,
      { method: 'GET' }
    )

    if (memberResponse.ok) {
      const memberData = await memberResponse.json()
      
      if (memberData.ok) {
        const status = memberData.result?.status
        const isMember = ["member", "administrator", "creator"].includes(status)
        
        if (isMember) {
          // Store verification in database
          await storeVerification(userId, true, username, defaultChannelId)
          
          return sendMessage(chatId, 
            "✅ Verification successful!\n\n" +
            "You are a member of the required channel.\n" +
            "You can now complete tasks in the Zaloyal app."
          )
        } else {
          return sendMessage(chatId,
            "❌ Verification failed!\n\n" +
            "You are not a member of the required channel.\n" +
            "Please join the channel first and try again."
          )
        }
      }
    }

    return sendMessage(chatId,
      "❌ Verification failed!\n\n" +
      "Unable to verify channel membership.\n" +
      "Please make sure you've joined the channel and try again."
    )

  } catch (error) {
    console.error("Verification error:", error)
    return sendMessage(chatId,
      "❌ Verification error!\n\n" +
      "Please try again later or contact support."
    )
  }
}

async function handleCallbackQuery(callbackQuery: any) {
  const { data, message, from } = callbackQuery
  const userId = from?.id

  if (!userId || !message) {
    return NextResponse.json({ ok: true })
  }

  // Handle different callback data
  switch (data) {
    case "verify":
      return handleVerificationRequest(message.chat.id, userId, from.username)
    
    default:
      return NextResponse.json({ ok: true })
  }
}

async function sendMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  
  if (!botToken) {
    console.error("Bot token not configured")
    return NextResponse.json({ ok: true })
  }

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })
  } catch (error) {
    console.error("Failed to send message:", error)
  }

  return NextResponse.json({ ok: true })
}

async function storeVerification(userId: number, verified: boolean, username?: string, channelId?: string) {
  try {
    await supabase.from("telegram_verifications").upsert({
      telegram_user_id: userId,
      telegram_username: username,
      channel_id: channelId,
      verified: verified,
      verified_at: new Date().toISOString()
    })
  } catch (error) {
    console.error("Failed to store verification:", error)
  }
} 