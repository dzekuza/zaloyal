import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// Verify if user joined a specific Discord server
async function verifyDiscordJoin(userDiscordId: string, guildId: string, userAccessToken: string): Promise<boolean> {
  if (!userAccessToken) {
    console.error('User access token not provided');
    return false;
  }

  try {
    const url = 'https://discord.com/api/users/@me/guilds';
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${userAccessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Discord API error:', response.status, response.statusText);
      return false;
    }

    const data = await response.json();
    console.log('Discord API response:', data);

    // Check if the guild is in the user's server list
    return data.some((guild: any) => guild.id === guildId) || false;
  } catch (error) {
    console.error('Error verifying Discord join:', error);
    return false;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, guildId } = body;

    if (!userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'User ID is required' 
      }, { status: 400 });
    }

    if (!guildId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Guild ID is required' 
      }, { status: 400 });
    }

    // Get user's Discord data from auth.users
    const { data: { user }, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);
    
    if (userError || !user) {
      return NextResponse.json({ 
        success: false, 
        error: 'User not found' 
      }, { status: 404 });
    }

    // Check if user has Discord authentication
    const hasDiscordAuth = user.app_metadata?.providers?.includes('discord');
    if (!hasDiscordAuth) {
      return NextResponse.json({ 
        success: false, 
        error: 'User does not have Discord authentication linked' 
      }, { status: 400 });
    }

    // Get Discord user ID from user metadata
    const discordUserId = user.user_metadata?.provider_id || user.user_metadata?.sub;
    if (!discordUserId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Discord user ID not found in user metadata' 
      }, { status: 400 });
    }

    // Note: For Discord verification, we would need the user's access token
    // This is typically stored during the OAuth flow. For now, we'll return an error
    // indicating that access token is required for Discord verification
    return NextResponse.json({ 
      success: false, 
      error: 'Discord verification requires user access token. This feature needs to be implemented with proper token storage during OAuth flow.' 
    }, { status: 501 });

    // TODO: Implement proper Discord verification with access token
    // const verificationResult = await verifyDiscordJoin(discordUserId, guildId, userAccessToken);
    // return NextResponse.json({ 
    //   success: verificationResult,
    //   userDiscordId: discordUserId,
    //   guildId
    // });

  } catch (error) {
    console.error('Error in Discord verification:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
} 