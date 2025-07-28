import { NextRequest, NextResponse } from 'next/server'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { guildId, userId } = await request.json()

    if (!guildId || !userId) {
      return NextResponse.json({ 
        error: 'Missing guildId or userId' 
      }, { status: 400 })
    }

    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json({ 
        error: 'Discord bot token not configured' 
      }, { status: 500 })
    }

    console.log('DEBUG: Testing Discord bot with:', { guildId, userId })

    // Test 1: Check if bot token is valid
    const botResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!botResponse.ok) {
      const botError = await botResponse.text()
      console.error('Bot token validation failed:', botError)
      return NextResponse.json({ 
        error: 'Invalid bot token',
        details: botError
      }, { status: 401 })
    }

    const botData = await botResponse.json()
    console.log('DEBUG: Bot validation successful:', { botId: botData.id, botUsername: botData.username })

    // Test 2: Check if bot can access the guild
    const guildResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    if (!guildResponse.ok) {
      const guildError = await guildResponse.text()
      console.error('Guild access failed:', guildError)
      return NextResponse.json({ 
        error: 'Bot cannot access guild',
        details: guildError
      }, { status: 403 })
    }

    const guildData = await guildResponse.json()
    console.log('DEBUG: Guild access successful:', { guildName: guildData.name, guildId: guildData.id })

    // Test 3: Check if user is a member of the guild
    const memberResponse = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
      headers: {
        'Authorization': `Bot ${DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })

    const isMember = memberResponse.ok
    const memberData = isMember ? await memberResponse.json() : null

    console.log('DEBUG: Member check result:', { isMember, memberData })

    return NextResponse.json({
      success: true,
      bot: {
        id: botData.id,
        username: botData.username,
        valid: true
      },
      guild: {
        id: guildData.id,
        name: guildData.name,
        accessible: true
      },
      member: {
        userId,
        isMember,
        data: memberData
      },
      permissions: {
        botTokenConfigured: !!DISCORD_BOT_TOKEN,
        canAccessGuild: true,
        canCheckMembers: true
      }
    })

  } catch (error) {
    console.error('Discord bot test error:', error)
    return NextResponse.json({ 
      error: 'Discord bot test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
} 