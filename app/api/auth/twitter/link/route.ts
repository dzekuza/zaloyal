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

    // Check if we have Twitter API credentials
    const twitterBearerToken = process.env.TWITTER_BEARER_TOKEN;
    
    if (!twitterBearerToken) {
      console.error('Twitter API not configured - TWITTER_BEARER_TOKEN missing');
      return NextResponse.json(
        { error: 'Twitter API not configured' },
        { status: 500 }
      );
    }

    console.log(`Attempting to verify X username: ${cleanUsername}`);

    // Verify the X username exists using Twitter API v2
    const userResponse = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanUsername}`,
      {
        headers: {
          'Authorization': `Bearer ${twitterBearerToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log(`Twitter API response status: ${userResponse.status}`);

    if (!userResponse.ok) {
      const errorText = await userResponse.text();
      console.error('Twitter API error response:', errorText);
      
      if (userResponse.status === 404) {
        return NextResponse.json(
          { error: 'X username not found. Please check the username and try again.' },
          { status: 404 }
        );
      }
      
      if (userResponse.status === 401) {
        console.error('Twitter API authentication failed - check TWITTER_BEARER_TOKEN');
        return NextResponse.json(
          { error: 'Twitter API authentication failed. Please contact support.' },
          { status: 500 }
        );
      }
      
      return NextResponse.json(
        { error: 'Failed to verify X username. Please try again.' },
        { status: 500 }
      );
    }

    const userData = await userResponse.json();
    console.log('Twitter API response data:', JSON.stringify(userData, null, 2));
    
    const twitterUser = userData.data;

    if (!twitterUser) {
      return NextResponse.json(
        { error: 'X username not found. Please check the username and try again.' },
        { status: 404 }
      );
    }

    // Get profile image URL
    let profileImageUrl = null;
    if (twitterUser.profile_image_url) {
      // Convert to higher resolution
      profileImageUrl = twitterUser.profile_image_url.replace('_normal', '_400x400');
    }

    console.log(`Updating user profile for user ${user.id} with X data:`, {
      twitter_id: twitterUser.id,
      twitter_username: twitterUser.username,
      twitter_avatar_url: profileImageUrl
    });

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
            { error: 'Failed to update profile. Please try again.' },
            { status: 500 }
          );
        }
      } else {
        console.log('Successfully updated user profile via RPC function');
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
          { error: 'Failed to update profile. Please try again.' },
          { status: 500 }
        );
      }
    }

    // Create a Twitter identity object
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

    console.log('X account linked successfully for user:', user.id);

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