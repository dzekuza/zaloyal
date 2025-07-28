import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const discordClientSecret = process.env.DISCORD_CLIENT_SECRET;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  
  return NextResponse.json({
    configured: {
      clientId: !!discordClientId,
      clientSecret: !!discordClientSecret,
      supabaseUrl: !!supabaseUrl,
    },
    values: {
      clientId: discordClientId,
      supabaseUrl: supabaseUrl,
      // Don't expose the secret
      hasSecret: !!discordClientSecret,
    },
    testUrl: discordClientId && supabaseUrl ? 
      `https://discord.com/oauth2/authorize?client_id=${discordClientId}&response_type=code&redirect_uri=${encodeURIComponent(supabaseUrl + '/auth/v1/callback')}&scope=identify%20email` : 
      null
  });
} 