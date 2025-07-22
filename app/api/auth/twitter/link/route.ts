import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Check if we have Twitter API credentials
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    
    if (!twitterApiKey || !twitterApiSecret) {
      console.error('Twitter API not configured - TWITTER_API_KEY and TWITTER_API_SECRET missing');
      return NextResponse.json(
        { error: 'Twitter API not configured' },
        { status: 500 }
      );
    }

    // For OAuth flow, we redirect to the authorize endpoint
    // The actual linking happens in the callback
    return NextResponse.json({
      success: true,
      message: 'Redirecting to X for authentication',
      redirectTo: '/api/auth/twitter/authorize'
    });

  } catch (error) {
    console.error('Twitter link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 