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

      // Call our API to initiate OAuth flow
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate X authentication');
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to initiate X authentication');
      }

      // Redirect to X for authentication
      if (result.authUrl) {
        window.location.href = result.authUrl;
        return { success: true, redirecting: true };
      }

      throw new Error('No authentication URL received');

    } catch (error) {
      console.error('Twitter link error:', error);
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

      // Get user profile to check for linked X account
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