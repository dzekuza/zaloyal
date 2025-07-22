import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

interface TwitterLinkState {
  isLinking: boolean;
  isUnlinking: boolean;
  error: string | null;
}

interface TwitterIdentity {
  id: string;
  user_name: string;
  avatar_url?: string;
  profile_url?: string;
}

export const useTwitterLink = () => {
  const [state, setState] = useState<TwitterLinkState>({
    isLinking: false,
    isUnlinking: false,
    error: null,
  });
  
  const { toast } = useToast();

  const linkTwitter = useCallback(async () => {
    setState(prev => ({ ...prev, isLinking: true, error: null }));
    
    try {
      // Ensure user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to link your X (Twitter) account.');
      }

      // Start the OAuth flow
      const { data, error } = await supabase.auth.linkIdentity({ 
        provider: 'twitter' 
      });
      
      if (error) throw error;
      
      if (!data?.url) {
        throw new Error('No OAuth URL returned from Supabase.');
      }

      // Open popup window
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      
      const popup = window.open(
        data.url,
        'zaloyal-twitter-oauth',
        `width=${width},height=${height},left=${left},top=${top},resizable,scrollbars=yes`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups and try again.');
      }

      // Listen for completion message from popup
      return new Promise<{ success: boolean; identity?: TwitterIdentity }>((resolve) => {
        const onMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data === 'zaloyal-twitter-oauth-success') {
            try {
              // Refresh session and get updated user data
              await supabase.auth.getSession();
              const { data: identities } = await supabase.auth.getUserIdentities();
              
              const twitterIdentity = identities?.identities?.find(
                (identity: any) => identity.provider === 'twitter'
              );

              if (twitterIdentity) {
                const identity: TwitterIdentity = {
                  id: twitterIdentity.id,
                  user_name: twitterIdentity.identity_data?.user_name || '',
                  avatar_url: twitterIdentity.identity_data?.avatar_url,
                  profile_url: twitterIdentity.identity_data?.user_name 
                    ? `https://x.com/${twitterIdentity.identity_data.user_name}` 
                    : undefined,
                };

                // Try to use database function first, fallback to direct update
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                  try {
                    // Try RPC function first
                    const { error: rpcError } = await supabase.rpc('update_user_twitter_profile', {
                      user_id: user.id,
                      twitter_id: identity.id,
                      twitter_username: identity.user_name,
                      twitter_avatar_url: identity.avatar_url || null
                    });

                    if (rpcError) {
                      console.warn('RPC function not available, using direct update');
                      // Fallback to direct table update
                      const { error: updateError } = await supabase.from('users').update({
                        x_id: identity.id,
                        x_username: identity.user_name,
                        x_avatar_url: identity.avatar_url,
                      }).eq('id', user.id);

                      if (updateError) {
                        console.error('Profile update error:', updateError);
                      }
                    }
                  } catch (err) {
                    console.warn('Database function not available, using direct update');
                    // Fallback to direct table update
                    const { error: updateError } = await supabase.from('users').update({
                      x_id: identity.id,
                      x_username: identity.user_name,
                      x_avatar_url: identity.avatar_url,
                    }).eq('id', user.id);

                    if (updateError) {
                      console.error('Profile update error:', updateError);
                    }
                  }
                }

                setState(prev => ({ ...prev, isLinking: false }));
                window.removeEventListener('message', onMessage);
                popup.close();
                
                toast({ 
                  title: 'X (Twitter) account linked successfully!',
                  description: `Connected to @${identity.user_name}`,
                });
                
                resolve({ success: true, identity });
              } else {
                throw new Error('Twitter identity not found after linking.');
              }
            } catch (err: any) {
              setState(prev => ({ 
                ...prev, 
                isLinking: false, 
                error: err.message 
              }));
              window.removeEventListener('message', onMessage);
              popup.close();
              toast({ 
                title: 'Failed to link X account',
                description: err.message,
                variant: 'destructive'
              });
              resolve({ success: false });
            }
          } else if (event.data === 'zaloyal-twitter-oauth-fail') {
            setState(prev => ({ ...prev, isLinking: false }));
            window.removeEventListener('message', onMessage);
            popup.close();
            toast({ 
              title: 'Failed to link X account',
              description: 'The OAuth process was cancelled or failed.',
              variant: 'destructive'
            });
            resolve({ success: false });
          }
        };

        window.addEventListener('message', onMessage);

        // Poll for popup close (fallback)
        const popupInterval = setInterval(() => {
          if (popup.closed) {
            setState(prev => ({ ...prev, isLinking: false }));
            window.removeEventListener('message', onMessage);
            clearInterval(popupInterval);
            resolve({ success: false });
          }
        }, 500);
      });

    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isLinking: false, 
        error: err.message 
      }));
      toast({ 
        title: 'Failed to link X account',
        description: err.message,
        variant: 'destructive'
      });
      return { success: false };
    }
  }, [toast]);

  const unlinkTwitter = useCallback(async () => {
    setState(prev => ({ ...prev, isUnlinking: true, error: null }));
    
    try {
      const { data: identities } = await supabase.auth.getUserIdentities();
      if (!identities?.identities) {
        throw new Error('No linked accounts found.');
      }

      const twitterIdentity = identities.identities.find(
        (identity: any) => identity.provider === 'twitter'
      );

      if (!twitterIdentity) {
        throw new Error('No X (Twitter) account linked.');
      }

      // Unlink from Supabase Auth
      await supabase.auth.unlinkIdentity(twitterIdentity);

      // Clear from users table using database function or fallback
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          // Try RPC function first
          const { error: rpcError } = await supabase.rpc('clear_user_twitter_profile', {
            user_id: user.id
          });

          if (rpcError) {
            console.warn('RPC function not available, using direct update');
            // Fallback to direct table update
            const { error: clearError } = await supabase.from('users').update({
              x_id: null,
              x_username: null,
              x_avatar_url: null,
            }).eq('id', user.id);

            if (clearError) {
              console.error('Error clearing Twitter profile:', clearError);
            }
          }
        } catch (err) {
          console.warn('Database function not available, using direct update');
          // Fallback to direct table update
          const { error: clearError } = await supabase.from('users').update({
            x_id: null,
            x_username: null,
            x_avatar_url: null,
          }).eq('id', user.id);

          if (clearError) {
            console.error('Error clearing Twitter profile:', clearError);
          }
        }
      }

      setState(prev => ({ ...prev, isUnlinking: false }));
      toast({ 
        title: 'X (Twitter) account unlinked successfully!',
      });

      return { success: true };
    } catch (err: any) {
      setState(prev => ({ 
        ...prev, 
        isUnlinking: false, 
        error: err.message 
      }));
      toast({ 
        title: 'Failed to unlink X account',
        description: err.message,
        variant: 'destructive'
      });
      return { success: false };
    }
  }, [toast]);

  const getTwitterIdentity = useCallback(async (): Promise<TwitterIdentity | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Try database function first, fallback to direct query
      try {
        const { data, error } = await supabase.rpc('get_twitter_identity', {
          user_id: user.id
        });

        if (!error && data && data.length > 0) {
          const identity = data[0];
          return {
            id: identity.id,
            user_name: identity.user_name || '',
            avatar_url: identity.avatar_url,
            profile_url: identity.profile_url,
          };
        }
      } catch (err) {
        console.warn('Database function not available, using direct query');
      }

      // Fallback to direct identities query
      const { data: identities } = await supabase.auth.getUserIdentities();
      const twitterIdentity = identities?.identities?.find(
        (identity: any) => identity.provider === 'twitter'
      );

      if (twitterIdentity) {
        return {
          id: twitterIdentity.id,
          user_name: twitterIdentity.identity_data?.user_name || '',
          avatar_url: twitterIdentity.identity_data?.avatar_url,
          profile_url: twitterIdentity.identity_data?.user_name 
            ? `https://x.com/${twitterIdentity.identity_data.user_name}` 
            : undefined,
        };
      }
      return null;
    } catch (err) {
      console.error('Error getting Twitter identity:', err);
      return null;
    }
  }, []);

  const syncTwitterIdentity = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      try {
        const { data, error } = await supabase.rpc('sync_twitter_identity', {
          user_id: user.id
        });

        if (!error) {
          return data || false;
        }
      } catch (err) {
        console.warn('Database function not available, sync skipped');
      }

      return false;
    } catch (err) {
      console.error('Error syncing Twitter identity:', err);
      return false;
    }
  }, []);

  return {
    ...state,
    linkTwitter,
    unlinkTwitter,
    getTwitterIdentity,
    syncTwitterIdentity,
  };
}; 