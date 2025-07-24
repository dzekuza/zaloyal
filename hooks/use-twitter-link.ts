import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/components/ui/use-toast';

export interface TwitterIdentity {
  id: string;
  user_name: string;
  avatar_url?: string;
  profile_url?: string;
}

interface TwitterLinkState {
  isLinking: boolean;
  isUnlinking: boolean;
  error: string | null;
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
      // Check if user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to link your X (Twitter) account.');
      }

      // Use Supabase's built-in Twitter OAuth provider with redirect
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
          queryParams: {
            // Request additional scopes for Twitter API access
            scope: 'tweet.read users.read follows.read like.read offline.access',
          },
        },
      });

      if (error) {
        console.error('Twitter OAuth error:', error);
        throw new Error(error.message || 'Failed to initiate X OAuth');
      }

      if (data?.url) {
        // Redirect to Twitter OAuth
        window.location.href = data.url;
        return { success: true };
      } else {
        throw new Error('No OAuth URL received from Supabase');
      }

    } catch (error) {
      console.error('Twitter OAuth error:', error);
      setState(prev => ({ 
        ...prev, 
        isLinking: false, 
        error: error instanceof Error ? error.message : 'Failed to link X account' 
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to link X account',
        variant: "destructive",
      });
      return { success: false };
    }
  }, [toast]);

  const unlinkTwitter = useCallback(async () => {
    setState(prev => ({ ...prev, isUnlinking: true, error: null }));
    
    try {
      // Ensure user is authenticated
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('You must be logged in to unlink your X (Twitter) account.');
      }

      // Clear Twitter data from user profile
      try {
        // Try RPC function first
        const { error: rpcError } = await supabase.rpc('clear_user_twitter_profile', {
          user_id: user.id
        });

        if (rpcError) {
          console.warn('RPC function not available, using direct update');
          // Fallback to direct table update
          const { error: updateError } = await supabase.from('users').update({
            x_id: null,
            x_username: null,
            x_avatar_url: null,
          }).eq('id', user.id);

          if (updateError) {
            console.error('Profile update error:', updateError);
            throw new Error('Failed to unlink X account');
          }
        }
      } catch (err) {
        console.warn('Database function not available, using direct update');
        // Fallback to direct table update
        const { error: updateError } = await supabase.from('users').update({
          x_id: null,
          x_username: null,
          x_avatar_url: null,
        }).eq('id', user.id);

        if (updateError) {
          console.error('Profile update error:', updateError);
          throw new Error('Failed to unlink X account');
        }
      }

      setState(prev => ({ ...prev, isUnlinking: false, error: null }));
      toast({
        title: "Success!",
        description: "X account unlinked successfully!",
      });
      
      return { success: true };

    } catch (error) {
      console.error('Twitter unlink error:', error);
      setState(prev => ({ 
        ...prev, 
        isUnlinking: false, 
        error: error instanceof Error ? error.message : 'Failed to unlink X account' 
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to unlink X account',
        variant: "destructive",
      });
      return { success: false };
    }
  }, [toast]);

  const getTwitterIdentity = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Check for Twitter identity in Supabase Auth
      const { data: { identities } } = await supabase.auth.getUserIdentities();
      const twitterIdentity = identities?.find(identity => identity.provider === 'twitter');
      
      if (twitterIdentity) {
        return {
          id: twitterIdentity.identity_id,
          user_name: twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name,
          avatar_url: twitterIdentity.identity_data?.avatar_url,
          profile_url: twitterIdentity.identity_data?.user_name ? `https://x.com/${twitterIdentity.identity_data.user_name}` : undefined,
        };
      }

      // Fallback: Check user profile for linked X account
      const { data: profile, error } = await supabase
        .from('users')
        .select('x_id, x_username, x_avatar_url')
        .eq('id', user.id)
        .single();

      if (error || !profile?.x_id) return null;

      return {
        id: profile.x_id,
        user_name: profile.x_username,
        avatar_url: profile.x_avatar_url,
        profile_url: profile.x_username ? `https://x.com/${profile.x_username}` : undefined,
      };
    } catch (error) {
      console.error('Get Twitter identity error:', error);
      return null;
    }
  }, []);

  return {
    isLinking: state.isLinking,
    isUnlinking: state.isUnlinking,
    error: state.error,
    linkTwitter,
    unlinkTwitter,
    getTwitterIdentity,
  };
}; 