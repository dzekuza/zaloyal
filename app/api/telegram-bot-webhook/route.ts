import { NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Verify this is from Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN
    if (!botToken) {
      return NextResponse.json({ error: "Bot token not configured" }, { status: 500 })
    }

    // Handle different types of updates
    if (body.message) {
      const message = body.message
      const chatId = message.chat.id
      const userId = message.from.id
      const username = message.from.username
      const text = message.text

      console.log('Telegram message received:', { chatId, userId, username, text })

      // Handle /start command with verification code
      if (text && text.startsWith('/start')) {
        const parts = text.split(' ')
        if (parts.length > 1) {
          const verificationCode = parts[1]
          
          // Look up the verification code
          const { data: codeData, error: codeError } = await supabaseAdmin
            .from('telegram_verification_codes')
            .select('*')
            .eq('verification_code', verificationCode)
            .gte('expires_at', new Date().toISOString())
            .single()

          if (codeError || !codeData) {
            await sendTelegramMessage(chatId, "❌ Invalid or expired verification code. Please try again.")
            return NextResponse.json({ success: true })
          }

          // Store the Telegram account information
          const { error: insertError } = await supabaseAdmin
            .from('social_accounts')
            .insert({
              user_id: codeData.user_id,
              platform: 'telegram',
              telegram_account_id: userId,
              telegram_username: username,
              created_at: new Date().toISOString()
            })

          if (insertError) {
            console.error('Error storing Telegram account:', insertError)
            await sendTelegramMessage(chatId, "❌ Failed to link your Telegram account. Please try again.")
            return NextResponse.json({ success: true })
          }

          // Delete the verification code
          await supabaseAdmin
            .from('telegram_verification_codes')
            .delete()
            .eq('verification_code', verificationCode)

          await sendTelegramMessage(chatId, "✅ Your Telegram account has been successfully linked to your BeLink profile!")
          return NextResponse.json({ success: true })
        } else {
          await sendTelegramMessage(chatId, "👋 Welcome to BeLink Verification Bot!\n\nTo link your Telegram account, please use the verification code from your BeLink profile.")
          return NextResponse.json({ success: true })
        }
      }

      // Handle verification code directly
      if (text && text.length === 6 && /^[A-Z0-9]{6}$/.test(text)) {
        const verificationCode = text
        
        // Look up the verification code
        const { data: codeData, error: codeError } = await supabaseAdmin
          .from('telegram_verification_codes')
          .select('*')
          .eq('verification_code', verificationCode)
          .gte('expires_at', new Date().toISOString())
          .single()

        if (codeError || !codeData) {
          await sendTelegramMessage(chatId, "❌ Invalid or expired verification code. Please try again.")
          return NextResponse.json({ success: true })
        }

        // Store the Telegram account information
        const { error: insertError } = await supabaseAdmin
          .from('social_accounts')
          .insert({
            user_id: codeData.user_id,
            platform: 'telegram',
            telegram_account_id: userId,
            telegram_username: username,
            created_at: new Date().toISOString()
          })

        if (insertError) {
          console.error('Error storing Telegram account:', insertError)
          await sendTelegramMessage(chatId, "❌ Failed to link your Telegram account. Please try again.")
          return NextResponse.json({ success: true })
        }

        // Delete the verification code
        await supabaseAdmin
          .from('telegram_verification_codes')
          .delete()
          .eq('verification_code', verificationCode)

        await sendTelegramMessage(chatId, "✅ Your Telegram account has been successfully linked to your BeLink profile!")
        return NextResponse.json({ success: true })
      }

      // Handle other messages
      await sendTelegramMessage(chatId, "Please send your verification code to link your Telegram account to BeLink.")
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Telegram webhook error:', error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}

async function sendTelegramMessage(chatId: number, text: string) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  if (!botToken) return

  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML'
      })
    })
  } catch (error) {
    console.error('Error sending Telegram message:', error)
  }
} 