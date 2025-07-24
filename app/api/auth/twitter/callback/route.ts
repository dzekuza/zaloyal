import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';
import { validateOAuthState } from '@/lib/oauth-utils';

export async function GET(request: NextRequest) {
  try {
    // Pass the cookies function directly
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
    const state = searchParams.get('state');
    const timestamp = searchParams.get('timestamp');

    console.log('Twitter callback received:', {
      oauthToken: oauthToken ? 'present' : 'missing',
      oauthVerifier: oauthVerifier ? 'present' : 'missing',
      denied: denied || 'none',
      state: state || 'none',
      timestamp: timestamp || 'none'
    });

    if (denied) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=access_denied`);
    }

    if (!oauthToken || !oauthVerifier) {
      console.error('Missing OAuth parameters:', { oauthToken, oauthVerifier });
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=invalid_oauth_response`);
    }

    // Validate state parameter if present
    if (state && timestamp) {
      const validation = validateOAuthState(state, timestamp);
      if (!validation.valid) {
        console.error('OAuth state validation failed:', validation);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=request_expired`);
      }
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
      console.log('Exchanging OAuth token for access token...');
      
      const response = await fetch(accessTokenData.url, {
        method: accessTokenData.method,
        headers: {
          ...accessTokenHeaders,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(accessTokenData.data).toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Access token exchange failed:', response.status, errorText);
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

      console.log('Access token obtained successfully for user:', screenName);

      // --- v2 API: Get user info ---
      const profileData = {
        url: 'https://api.twitter.com/2/users/me?user.fields=profile_image_url,username,name',
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
        const errorText = await profileResponse.text();
        console.error('Profile fetch failed:', profileResponse.status, errorText);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_fetch_failed`);
      }

      const profileJson = await profileResponse.json();
      const profile = profileJson.data;

      // Get profile image URL
      let profileImageUrl = null;
      if (profile && profile.profile_image_url) {
        // Use the highest resolution available
        profileImageUrl = profile.profile_image_url.replace('_normal', '_400x400');
      }

      console.log('Profile fetched successfully:', profile?.username);

      // Update user profile with Twitter data
      try {
        // Try RPC function first
        const { error: rpcError } = await supabase.rpc('update_user_twitter_profile', {
          user_id: user.id,
          twitter_id: userId,
          twitter_username: profile?.username || screenName,
          twitter_avatar_url: profileImageUrl || null
        });

        if (rpcError) {
          console.warn('RPC function failed, using direct update:', rpcError);
          // Fallback to direct table update
          const { error: updateError } = await supabase.from('users').update({
            x_id: userId,
            x_username: profile?.username || screenName,
            x_avatar_url: profileImageUrl,
          }).eq('id', user.id);

          if (updateError) {
            console.error('Profile update failed:', updateError);
            return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_update_failed`);
          }
        }
      } catch (err) {
        console.warn('Database function not available, using direct update');
        // Fallback to direct table update
        const { error: updateError } = await supabase.from('users').update({
          x_id: userId,
          x_username: profile?.username || screenName,
          x_avatar_url: profileImageUrl,
        }).eq('id', user.id);

        if (updateError) {
          console.error('Profile update failed:', updateError);
          return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=profile_update_failed`);
        }
      }

      console.log('Twitter profile updated successfully');

      // Store OAuth tokens in Supabase Auth identities
      try {
        // Create a custom identity for the user with OAuth tokens
        const { error: identityError } = await supabase.auth.updateUser({
          data: {
            twitter_oauth_token: accessToken,
            twitter_oauth_token_secret: accessTokenSecret,
            twitter_user_id: userId,
            twitter_username: profile?.username || screenName,
          }
        });

        if (identityError) {
          console.warn('Failed to store OAuth tokens in user data:', identityError);
        } else {
          console.log('OAuth tokens stored successfully');
        }
      } catch (err) {
        console.warn('Could not store OAuth tokens:', err);
      }

      // Redirect to profile with success message (no reload parameter)
      const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/profile?success=twitter_linked`;
      return NextResponse.redirect(redirectUrl);

    } catch (error) {
      console.error('OAuth exchange error:', error);
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=oauth_error`);
    }

  } catch (error) {
    console.error('Twitter callback error:', error);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/profile?error=callback_error`);
  }
} 