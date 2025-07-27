import { useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export interface XAccount {
  id: string;
  username: string;
  name?: string;
  platform: 'x';
}

interface XAuthState {
  isConnecting: boolean;
  isVerifying: boolean;
  error: string | null;
  account: XAccount | null;
}

export const useXAuth = () => {
  const [state, setState] = useState<XAuthState>({
    isConnecting: false,
    isVerifying: false,
    error: null,
    account: null,
  });
  
  const { toast } = useToast();

  // Initialize OAuth flow using Supabase
  const connectX = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Call our API to get the Supabase OAuth URL
      const response = await fetch('/api/auth/twitter/authorize', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to initialize X connection');
      }

      const { authUrl } = await response.json();

      if (!authUrl) {
        throw new Error('No authorization URL received');
      }

      toast({
        title: "Success",
        description: "Redirecting to X for authentication...",
      });

      // Redirect to Supabase's OAuth URL
      window.location.href = authUrl;
      
    } catch (error) {
      console.error('X connection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to connect X account' 
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to connect X account',
        variant: "destructive",
      });
    }
  }, [toast]);

  // Disconnect X account
  const disconnectX = useCallback(async () => {
    setState(prev => ({ ...prev, isConnecting: true, error: null }));
    
    try {
      // Get user identities
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
      
      if (identitiesError) {
        throw identitiesError;
      }
      
      // Find X identity
      const xIdentity = identities?.identities?.find(
        (identity: any) => identity.provider === 'twitter'
      );
      
      if (xIdentity) {
        // Unlink X identity
        const { error: unlinkError } = await supabase.auth.unlinkIdentity(xIdentity);
        
        if (unlinkError) {
          throw unlinkError;
        }
      }
      
      // Remove from social_accounts table
      const { error: deleteError } = await supabase
        .from('social_accounts')
        .delete()
        .eq('platform', 'x');

      if (deleteError) {
        console.error('Error deleting social account:', deleteError);
      }

      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        account: null 
      }));
      
      toast({
        title: "Success",
        description: "X account disconnected successfully",
      });
      
    } catch (error) {
      console.error('X disconnection error:', error);
      setState(prev => ({ 
        ...prev, 
        isConnecting: false, 
        error: error instanceof Error ? error.message : 'Failed to disconnect X account' 
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to disconnect X account',
        variant: "destructive",
      });
    }
  }, [toast]);

  // Get X account info
  const getXAccount = useCallback(async () => {
    try {
      // First check if user has X identity
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities();
      
      if (identitiesError) {
        throw identitiesError;
      }
      
      const xIdentity = identities?.identities?.find(
        (identity: any) => identity.provider === 'twitter'
      );
      
      if (xIdentity) {
        // Get social account data
        const { data: socialAccount, error: socialError } = await supabase
          .from('social_accounts')
          .select('x_account_id, x_username, profile_data')
          .eq('platform', 'x')
          .single();

        if (socialError && socialError.code !== 'PGRST116') {
          throw socialError;
        }

        if (socialAccount) {
          setState(prev => ({ 
            ...prev, 
            account: {
              id: socialAccount.x_account_id || xIdentity.identity_id,
              username: socialAccount.x_username || xIdentity.identity_id,
              name: socialAccount.profile_data?.name,
              platform: 'x' as const
            }
          }));
        } else {
          // Fallback to identity data
          setState(prev => ({ 
            ...prev, 
            account: {
              id: xIdentity.identity_id,
              username: xIdentity.identity_id,
              platform: 'x' as const
            }
          }));
        }
      } else {
        setState(prev => ({ ...prev, account: null }));
      }
      
    } catch (error) {
      console.error('Error getting X account:', error);
      setState(prev => ({ ...prev, account: null }));
    }
  }, []);

  // Enqueue verification
  const enqueueVerification = useCallback(async (taskId: string) => {
    setState(prev => ({ ...prev, isVerifying: true, error: null }));
    
    try {
      const { data, error } = await supabase.rpc('enqueue_verification', {
        p_task_id: taskId
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setState(prev => ({ ...prev, isVerifying: false }));
      
      toast({
        title: "Verification Enqueued",
        description: data.message || "Verification has been queued for processing",
      });

      return data;
      
    } catch (error) {
      console.error('Verification enqueue error:', error);
      setState(prev => ({ 
        ...prev, 
        isVerifying: false, 
        error: error instanceof Error ? error.message : 'Failed to enqueue verification' 
      }));
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to enqueue verification',
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  // Get verification status
  const getVerificationStatus = useCallback(async (taskId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_verification_status', {
        p_task_id: taskId
      });

      if (error) {
        throw error;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      return data;
      
    } catch (error) {
      console.error('Verification status error:', error);
      throw error;
    }
  }, []);

  // Poll verification status
  const pollVerificationStatus = useCallback(async (taskId: string, maxAttempts = 30) => {
    let attempts = 0;
    
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const status = await getVerificationStatus(taskId);
          
          if (status.status === 'verified' || status.status === 'failed') {
            resolve(status);
            return;
          }
          
          attempts++;
          if (attempts >= maxAttempts) {
            reject(new Error('Verification timeout'));
            return;
          }
          
          // Poll every 5 seconds
          setTimeout(poll, 5000);
          
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }, [getVerificationStatus]);

  return {
    // State
    isConnecting: state.isConnecting,
    isVerifying: state.isVerifying,
    error: state.error,
    account: state.account,
    
    // Actions
    connectX,
    disconnectX,
    getXAccount,
    enqueueVerification,
    getVerificationStatus,
    pollVerificationStatus,
  };
}; 