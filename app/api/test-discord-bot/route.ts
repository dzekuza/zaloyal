import { NextRequest, NextResponse } from 'next/server'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

export async function GET(request: NextRequest) {
  try {
    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json({
        error: 'Discord bot token not configured',
        message: 'DISCORD_BOT_TOKEN environment variable is not set'
      }, { status: 500 })
    }

    // Test the bot token by getting bot info
    const botResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!botResponse.ok) {
      return NextResponse.json({
        error: 'Invalid Discord bot token',
        message: 'The Discord bot token is invalid or expired',
        status: botResponse.status
      }, { status: 500 })
    }

    const botInfo = await botResponse.json()

    // Test guild access for the specific server
    const guildId = '1399394969722294445' // The guild ID from the logs
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    return NextResponse.json({
      success: true,
      botInfo: {
        id: botInfo.id,
        username: botInfo.username,
        bot: botInfo.bot
      },
      guildAccess: {
        guildId,
        canAccess: guildResponse.ok,
        status: guildResponse.status,
        statusText: guildResponse.statusText
      },
      message: guildResponse.ok 
        ? 'Bot is properly configured and can access the guild'
        : 'Bot cannot access the guild - it may not be in the server'
    })

  } catch (error) {
    console.error('Error testing Discord bot:', error)
    return NextResponse.json({
      error: 'Failed to test Discord bot',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 