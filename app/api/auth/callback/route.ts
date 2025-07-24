import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const error = requestUrl.searchParams.get('error')
  const errorDescription = requestUrl.searchParams.get('error_description')

  if (error) {
    console.error('OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${requestUrl.origin}/profile?error=${encodeURIComponent(errorDescription || error)}`
    );
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createRouteHandlerClient({ cookies: () => Promise.resolve(cookieStore) })
    
    try {
      const { data, error: sessionError } = await supabase.auth.exchangeCodeForSession(code)
      
      if (sessionError) {
        console.error('Session exchange error:', sessionError);
        return NextResponse.redirect(
          `${requestUrl.origin}/profile?error=${encodeURIComponent(sessionError.message)}`
        );
      }

      if (data.user) {
        // Successfully authenticated
        console.log('OAuth callback successful for user:', data.user.id);
        
        // Update user profile with Twitter data if available
        if (data.user.identities) {
          const twitterIdentity = data.user.identities.find(
            (identity: any) => identity.provider === 'twitter'
          );
          
          if (twitterIdentity) {
            try {
              await supabase.from('users').update({
                x_id: twitterIdentity.identity_data?.id_str || twitterIdentity.identity_data?.id,
                x_username: twitterIdentity.identity_data?.screen_name || twitterIdentity.identity_data?.user_name,
                x_avatar_url: twitterIdentity.identity_data?.profile_image_url_https,
              }).eq('id', data.user.id);
              
              console.log('Updated user profile with Twitter data');
            } catch (updateError) {
              console.error('Failed to update user profile:', updateError);
            }
          }
        }
        
        return NextResponse.redirect(`${requestUrl.origin}/profile?success=twitter_linked`);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      return NextResponse.redirect(
        `${requestUrl.origin}/profile?error=${encodeURIComponent('Authentication failed')}`
      );
    }
  }

  // Fallback redirect
  return NextResponse.redirect(`${requestUrl.origin}/profile`);
}