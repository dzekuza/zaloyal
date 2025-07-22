import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=not_authenticated`);
    }

    // Get OAuth parameters from URL
    const { searchParams } = new URL(request.url);
    const oauthToken = searchParams.get('oauth_token');
    const oauthVerifier = searchParams.get('oauth_verifier');
    const denied = searchParams.get('denied');

    if (denied) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=access_denied`);
    }

    if (!oauthToken || !oauthVerifier) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_oauth_response`);
    }

    // Check if we have Twitter API credentials
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    
    if (!twitterApiKey || !twitterApiSecret) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=api_not_configured`);
    }

    // Create OAuth 1.0a instance
    const oauth = new OAuth({
      consumer: {
        key: twitterApiKey,
        secret: twitterApiSecret,
      },
      signature_method: 'HMAC-SHA1',
      hash_function(base_string: string, key: string) {
        return crypto
          .createHmac('sha1', key)
          .update(base_string)
          .digest('base64');
      },
    });

    // Exchange request token for access token
    const accessTokenData = {
      url: 'https://api.twitter.com/oauth/access_token',
      method: 'POST',
      data: {
        oauth_token: oauthToken,
        oauth_verifier: oauthVerifier,
      },
    };

    const accessTokenHeaders = oauth.toHeader(oauth.authorize(accessTokenData));

    try {
      const response = await fetch(accessTokenData.url, {
        method: accessTokenData.method,
        headers: {
          ...accessTokenHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(accessTokenData.data).toString(),
      });

      if (!response.ok) {
        console.error('Twitter OAuth access token error:', response.status, response.statusText);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=access_token_failed`);
      }

      const responseText = await response.text();
      const params = new URLSearchParams(responseText);
      const accessToken = params.get('oauth_token');
      const accessTokenSecret = params.get('oauth_token_secret');
      const userId = params.get('user_id');
      const screenName = params.get('screen_name');

      if (!accessToken || !accessTokenSecret || !userId || !screenName) {
        console.error('Invalid access token response:', responseText);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_access_token`);
      }

      // Get user profile information using the access token
      const profileData = {
        url: 'https://api.twitter.com/1.1/account/verify_credentials.json',
        method: 'GET',
      };

      const profileHeaders = oauth.toHeader(oauth.authorize(profileData, {
        key: accessToken,
        secret: accessTokenSecret,
      }));

      const profileResponse = await fetch(profileData.url, {
        method: profileData.method,
        headers: {
          ...profileHeaders,
        },
      });

      if (!profileResponse.ok) {
        console.error('Twitter profile fetch error:', profileResponse.status, profileResponse.statusText);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_fetch_failed`);
      }

      const profile = await profileResponse.json();

      // Get profile image URL
      let profileImageUrl = null;
      if (profile.profile_image_url_https) {
        // Convert to higher resolution
        profileImageUrl = profile.profile_image_url_https.replace('_normal', '_400x400');
      }

      // Update user profile with Twitter data
      try {
        // Try RPC function first
        const { error: rpcError } = await supabase.rpc('update_user_twitter_profile', {
          user_id: user.id,
          twitter_id: userId,
          twitter_username: screenName,
          twitter_avatar_url: profileImageUrl || null
        });

        if (rpcError) {
          console.warn('RPC function not available, using direct update');
          // Fallback to direct table update
          const { error: updateError } = await supabase.from('users').update({
            x_id: userId,
            x_username: screenName,
            x_avatar_url: profileImageUrl,
          }).eq('id', user.id);

          if (updateError) {
            console.error('Profile update error:', updateError);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_update_failed`);
          }
        } else {
          console.log('Successfully updated user profile via RPC function');
        }
      } catch (err) {
        console.warn('Database function not available, using direct update');
        // Fallback to direct table update
        const { error: updateError } = await supabase.from('users').update({
          x_id: userId,
          x_username: screenName,
          x_avatar_url: profileImageUrl,
        }).eq('id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_update_failed`);
        }
      }

      console.log('X account linked successfully for user:', user.id);

      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?success=twitter_linked`);

    } catch (error) {
      console.error('Twitter OAuth error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=oauth_error`);
    }

  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=callback_error`);
  }
} 