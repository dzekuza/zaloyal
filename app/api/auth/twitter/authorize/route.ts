import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
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
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!twitterBearerToken) {
      return NextResponse.json(
        { error: 'Twitter API not configured. Please set TWITTER_BEARER_TOKEN environment variable.' },
        { status: 500 }
      );
    }

    // For now, we'll return a simple response indicating the API is ready
    // The actual linking will happen when the user provides their X username
    return NextResponse.json({ 
      success: true,
      message: 'X linking API ready',
      requiresUsername: true
    });
  } catch (error) {
    console.error('Twitter authorize error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
