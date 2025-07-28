'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/loading-spinner';

export default function SupabaseAuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing) return;
      setIsProcessing(true);

      try {
        console.log('DEBUG: Handling Supabase auth callback...');
        
        // Get URL parameters
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');
        const state = searchParams.get('state');
        
        console.log('DEBUG: URL search params:', { error, errorCode, errorDescription, state });
        console.log('DEBUG: Callback timestamp:', new Date().toISOString());

        // Parse state if it exists
        let linkAction = null;
        if (state) {
          try {
            const stateData = JSON.parse(atob(state));
            linkAction = stateData.action;
            console.log('DEBUG: State data:', stateData);
          } catch (e) {
            console.log('DEBUG: Could not parse state parameter');
          }
        }

        // Handle OAuth errors
        if (error) {
          console.error('OAuth error:', error, errorCode, errorDescription);
          
          // Handle specific Discord errors
          if (error === 'server_error' && errorDescription?.includes('Unable to exchange external code')) {
            console.error('Discord OAuth exchange failed - this usually means the code has expired or been used');
            router.push('/profile?error=discord_code_expired');
            return;
          }
          
          // Handle email already exists error
          if (error === 'signup_disabled' || errorDescription?.includes('already exists') || errorDescription?.includes('email')) {
            console.error('Account with this email already exists - trying to link accounts');
            router.push('/profile?error=email_exists&message=Please log in with your existing account first, then try linking Discord');
            return;
          }

          // Handle Discord-specific errors
          if (errorDescription?.includes('Discord') || errorDescription?.includes('discord')) {
            console.error('Discord OAuth error:', errorDescription);
            router.push('/profile?error=discord_oauth_failed&message=Discord authentication failed. Please try again.');
            return;
          }
          
          router.push(`/profile?error=${error}`);
          return;
        }

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          router.push('/profile?error=session_error');
          return;
        }

        if (!session) {
          console.log('DEBUG: No session found, redirecting to home');
          router.push('/');
          return;
        }

        const user = session.user;
        console.log('DEBUG: User authenticated:', user.email);
        
        // Check if this is a social OAuth connection (X or Discord)
        const isSocialAuth = user.app_metadata?.provider === 'twitter' || 
                           user.app_metadata?.provider === 'discord' ||
                           user.user_metadata?.provider === 'twitter' ||
                           user.user_metadata?.provider === 'discord' ||
                           user.identities?.some((identity: any) => 
                             identity.provider === 'twitter' || identity.provider === 'discord'
                           );
        
        let socialIdentity: any = null;
        
        if (isSocialAuth) {
          console.log('DEBUG: Processing social OAuth connection...');
          
          try {
            // Get user identities to find social identity
            const { data: identities } = await supabase.auth.getUserIdentities();
            socialIdentity = identities?.identities?.find(
              (identity: any) => identity.provider === 'twitter' || identity.provider === 'discord'
            );
            
            if (socialIdentity) {
              console.log('DEBUG: Found social identity, storing social account...');
              
              const platform = socialIdentity.provider === 'twitter' ? 'x' : 'discord';
              const platformData: any = {
                user_id: user.id,
                platform: platform,
                account_id: socialIdentity.identity_id,
                username: user.user_metadata?.username || user.user_metadata?.name || socialIdentity.identity_data?.username,
                access_token: '', // Will be updated via API calls if needed
                refresh_token: null,
                expires_at: null,
                profile_data: {
                  id: socialIdentity.identity_id,
                  username: user.user_metadata?.username || user.user_metadata?.name,
                  name: user.user_metadata?.name,
                  avatar_url: user.user_metadata?.avatar_url,
                  // Additional Discord-specific data
                  discriminator: user.user_metadata?.discriminator,
                  global_name: user.user_metadata?.global_name,
                  verified: user.user_metadata?.verified,
                  flags: user.user_metadata?.flags,
                  banner: user.user_metadata?.banner,
                  accent_color: user.user_metadata?.accent_color,
                  locale: user.user_metadata?.locale,
                  mfa_enabled: user.user_metadata?.mfa_enabled,
                  premium_type: user.user_metadata?.premium_type
                },
                verified: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };

              // Add platform-specific fields
              if (platform === 'x') {
                platformData.x_account_id = socialIdentity.identity_id;
                platformData.x_username = user.user_metadata?.username || user.user_metadata?.name;
              } else if (platform === 'discord') {
                platformData.discord_account_id = socialIdentity.identity_id;
                platformData.discord_username = user.user_metadata?.username || user.user_metadata?.name;
              }
              
              // Store or update social account with better error handling
              try {
                const { error: socialError } = await supabase
                  .from('social_accounts')
                  .upsert(platformData, {
                    onConflict: 'user_id,platform'
                  });

                if (socialError) {
                  console.error('Error storing social account:', socialError);
                  // Don't fail the entire auth flow, just log the error
                  // The user can still proceed with their account
                } else {
                  console.log('DEBUG: Social account stored successfully');
                }
              } catch (socialError) {
                console.error('Error storing social account:', socialError);
                // Continue with the auth flow even if social account storage fails
              }
            }
          } catch (identityError) {
            console.error('Error handling social identity:', identityError);
            // Continue with the auth flow even if social identity handling fails
          }
        }
        
        // Check if user record exists in users table
        const { data: userRecord, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        console.log('DEBUG: User record lookup:', { userRecord: !!userRecord, userError });

        if (!userRecord) {
          console.log('DEBUG: User record not found, creating...');
          // The trigger should have created the user, but let's ensure it exists
          try {
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.user_metadata?.name || user.email?.split('@')[0],
                avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture,
                social_links: {
                  twitter: user.user_metadata?.provider === 'twitter' ? {
                    username: user.user_metadata?.username,
                    id: user.user_metadata?.id,
                    avatar_url: user.user_metadata?.avatar_url
                  } : null,
                  discord: user.user_metadata?.provider === 'discord' ? {
                    username: user.user_metadata?.username,
                    id: user.user_metadata?.id,
                    avatar_url: user.user_metadata?.avatar_url
                  } : null
                }
              })
              .select()
              .single();

            console.log('DEBUG: User creation result:', { newUser, createError });

            if (createError) {
              console.error('Error creating user record:', createError);
              // Don't fail the auth flow, just log the error
            } else {
              console.log('DEBUG: User record created successfully');
            }
          } catch (createError) {
            console.error('Error creating user record:', createError);
            // Continue with the auth flow even if user creation fails
          }
        }

        // Redirect to profile page to show the new connection
        const successParam = isSocialAuth ? `${socialIdentity?.provider || 'social'}_connected` : 'authenticated';
        router.push(`/profile?success=${successParam}`);
        
      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.push('/profile?error=auth_failed');
      } finally {
        setIsProcessing(false);
      }
    };

    handleAuthCallback();
  }, [router, searchParams, isProcessing]);

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-white mt-4">Completing authentication...</p>
      </div>
    </div>
  );
} 