'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import LoadingSpinner from '@/components/loading-spinner';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          router.push('/?error=auth_failed');
          return;
        }

        if (data.session) {
          const user = data.session.user;
          console.log('User authenticated:', user.email);
          
          // Check if this is a Discord OAuth connection
          const isDiscordAuth = user.app_metadata?.provider === 'discord' || 
                               user.user_metadata?.provider === 'discord' ||
                               user.identities?.some((identity: any) => identity.provider === 'discord');
          
          if (isDiscordAuth) {
            console.log('Processing Discord OAuth connection...');
            
            try {
              // Get user identities to find Discord identity
              const { data: identities } = await supabase.auth.getUserIdentities();
              const discordIdentity = identities?.identities?.find(
                (identity: any) => identity.provider === 'discord'
              );
              
              if (discordIdentity) {
                console.log('Found Discord identity, storing social account...');
                
                // Store or update social account
                const { error: socialError } = await supabase
                  .from('social_accounts')
                  .upsert({
                    user_id: user.id,
                    platform: 'discord',
                    platform_user_id: discordIdentity.identity_id,
                    username: user.user_metadata?.username || user.user_metadata?.name || discordIdentity.identity_data?.username,
                    access_token: '', // Will be updated via API calls if needed
                    refresh_token: null,
                    token_expires_at: null,
                    profile_data: {
                      id: discordIdentity.identity_id,
                      username: user.user_metadata?.username || user.user_metadata?.name,
                      name: user.user_metadata?.name,
                      avatar_url: user.user_metadata?.avatar_url
                    },
                    verified: true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id,platform'
                  });

                if (socialError) {
                  console.error('Error storing Discord social account:', socialError);
                } else {
                  console.log('Discord social account stored successfully');
                }
              }
            } catch (identityError) {
              console.error('Error handling Discord identity:', identityError);
            }
          }
          
          // Redirect to profile page to show the new connection
          router.push('/profile?success=discord_connected');
        } else {
          // No session found, redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Error handling auth callback:', error);
        router.push('/?error=auth_failed');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner />
        <p className="text-white mt-4">Completing authentication...</p>
      </div>
    </div>
  );
} 