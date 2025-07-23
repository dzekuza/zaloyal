
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

    // Get the username from the request body
    const { username } = await request.json();
    
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Clean the username (remove @ if present)
    const cleanUsername = username.replace(/^@/, '');

    // Get Twitter API credentials
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!twitterBearerToken) {
      return NextResponse.json(
        { error: 'Twitter API not configured' },
        { status: 500 }
      );
    }

    // Fetch user data from Twitter API
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!userResponse.ok) {
      if (userResponse.status === 404) {
        return NextResponse.json(
          { error: 'X user not found. Please check the username and try again.' },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to fetch X user data' },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();
    const twitterUser = userData.data;

    if (!twitterUser) {
      return NextResponse.json(
        { error: 'Invalid X user data received' },
        { status: 500 }
      );
    }

    // Get high-resolution profile image
    let profileImageUrl = null;
    if (twitterUser.profile_image_url) {
      // Replace _normal with _400x400 for higher resolution
      profileImageUrl = twitterUser.profile_image_url.replace('_normal', '_400x400');
    }

    // Create Twitter identity object
    const twitterIdentity = {
      id: twitterUser.id,
      provider: 'twitter',
      identity_data: {
        user_name: twitterUser.username,
        name: twitterUser.name,
        avatar_url: profileImageUrl,
        profile_url: `https://x.com/${twitterUser.username}`,
        verified: twitterUser.verified || false
      }
    };

    // Update user profile with Twitter data
    try {
      // Try RPC function first
      const { error: rpcError } = await supabase.rpc('update_user_twitter_profile', {
        user_id: user.id,
        twitter_id: twitterUser.id,
        twitter_username: twitterUser.username,
        twitter_avatar_url: profileImageUrl || null
      });

      if (rpcError) {
        console.warn('RPC function not available, using direct update');
        // Fallback to direct table update
        const { error: updateError } = await supabase.from('users').update({
          x_id: twitterUser.id,
          x_username: twitterUser.username,
          x_avatar_url: profileImageUrl,
        }).eq('id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          return NextResponse.json(
            { error: 'Failed to update user profile' },
            { status: 500 }
          );
        }
      }
    } catch (err) {
      console.warn('Database function not available, using direct update');
      // Fallback to direct table update
      const { error: updateError } = await supabase.from('users').update({
        x_id: twitterUser.id,
        x_username: twitterUser.username,
        x_avatar_url: profileImageUrl,
      }).eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        return NextResponse.json(
          { error: 'Failed to update user profile' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: 'X account linked successfully',
      identity: twitterIdentity,
      user: {
        id: twitterUser.id,
        username: twitterUser.username,
        name: twitterUser.name,
        avatar_url: profileImageUrl,
        verified: twitterUser.verified || false
      }
    });
  } catch (error) {
    console.error('Twitter link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
