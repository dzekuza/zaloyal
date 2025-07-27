import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

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
          redirectTo: `${window.location.origin}/profile`,
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
    try {
      setState(prev => ({ ...prev, isUnlinking: true, error: null }));

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Remove X account from social_accounts table
      const { error: deleteError } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'x');

      if (deleteError) {
        console.error('Social account deletion error:', deleteError);
        throw new Error('Failed to unlink X account');
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
      const { data: identitiesData } = await supabase.auth.getUserIdentities();
      const identities = identitiesData?.identities || [];
      const twitterIdentity = identities.find((identity: any) => identity.provider === 'twitter');
      
      if (twitterIdentity) {
        return {
          id: twitterIdentity.identity_id,
          user_name: twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name,
          avatar_url: twitterIdentity.identity_data?.avatar_url,
          profile_url: twitterIdentity.identity_data?.user_name ? `https://x.com/${twitterIdentity.identity_data.user_name}` : undefined,
        };
      }

      // Fallback: Check social_accounts table for linked X account
      const { data: socialAccount, error } = await supabase
        .from('social_accounts')
        .select('x_account_id, x_username, profile_data')
        .eq('user_id', user.id)
        .eq('platform', 'x')
        .single();

      if (error || !socialAccount?.x_account_id) return null;

      return {
        id: socialAccount.x_account_id,
        user_name: socialAccount.x_username,
        avatar_url: socialAccount.profile_data?.profile_image_url,
        profile_url: socialAccount.x_username ? `https://x.com/${socialAccount.x_username}` : undefined,
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