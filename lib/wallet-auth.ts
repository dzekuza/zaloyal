"use client"

import { supabase } from './supabase'

export interface WalletUser {
  walletAddress: string
  username?: string
  totalXP?: number
  level?: number
  rank?: string
}

class WalletAuth {
  private currentUser: WalletUser | null = null
  private listeners: ((user: WalletUser | null) => void)[] = []
  private isInitialized = false

  // Get the correct URI for wallet authentication
  private getWalletAuthUri(): string {
    // Use the current domain or fallback to localhost for development
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/terms`
    }
    // Fallback for server-side rendering
    return process.env.NEXT_PUBLIC_APP_URL 
      ? `${process.env.NEXT_PUBLIC_APP_URL}/terms`
      : 'http://localhost:3000/terms'
  }

  // Link wallet to the current authenticated user (email/social)
  async linkWalletToCurrentUser(): Promise<string> {
    const provider = (window as any).solana;
    if (!provider) throw new Error('No Solana wallet found');
    
    // Get the current authenticated user first
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      throw new Error('You must be logged in to link a wallet');
    }
    
    // Connect to wallet
    await provider.connect();
    const walletAddress = provider.publicKey.toString();
    
    console.log('[Wallet Auth] Linking wallet:', {
      userId: currentUser.id,
      walletAddress: walletAddress.substring(0, 10) + '...',
      platform: 'solana'
    });
    
    try {
      // Use the new database function to handle wallet linking with uniqueness check
      const { data, error } = await supabase.rpc('link_wallet_to_user', {
        p_user_id: currentUser.id,
        p_wallet_address: walletAddress
      });
      
      if (error) {
        console.error('Error linking wallet:', error);
        throw new Error(error.message || 'Failed to link wallet');
      }
      
      console.log('[Wallet Auth] Successfully linked wallet');
      
      this.currentUser = { walletAddress } as WalletUser;
      this.notifyListeners();
      localStorage.setItem("wallet_user", JSON.stringify({ walletAddress }));
      return walletAddress;
      
    } catch (error) {
      console.error('Wallet linking error:', error);
      throw error;
    }
  }

  // Unlink wallet from current user
  async unlinkWalletFromCurrentUser(): Promise<void> {
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      throw new Error('You must be logged in to unlink a wallet');
    }
    
    try {
      const { error } = await supabase.rpc('unlink_wallet_from_user', {
        p_user_id: currentUser.id
      });
      
      if (error) {
        console.error('Error unlinking wallet:', error);
        throw new Error(error.message || 'Failed to unlink wallet');
      }
      
      console.log('[Wallet Auth] Successfully unlinked wallet');
      
      this.currentUser = null;
      this.notifyListeners();
      localStorage.removeItem("wallet_user");
      
    } catch (error) {
      console.error('Wallet unlinking error:', error);
      throw error;
    }
  }

  // For backward compatibility, connectWallet calls linkWalletToCurrentUser
  async connectWallet(): Promise<string> {
    return this.linkWalletToCurrentUser();
  }

  async signInWithSolanaWallet(): Promise<string> {
    // For wallet-only login (not linking)
    const provider = (window as any).solana;
    if (!provider) throw new Error('No Solana wallet found');
    await provider.connect();
    
    const { data, error } = await supabase.auth.signInWithWeb3({
      chain: 'solana',
      statement: `I accept the Terms of Service at ${this.getWalletAuthUri()}`,
      wallet: provider,
    });
    if (error) throw error;
    
    const walletAddress = provider.publicKey.toString();
    this.currentUser = { walletAddress } as WalletUser;
    this.notifyListeners();
    localStorage.setItem("wallet_user", JSON.stringify({ walletAddress }));
    return walletAddress;
  }

  async disconnectWallet(): Promise<void> {
    const provider = (window as any).solana
    if (provider && provider.isPhantom) {
      await provider.disconnect()
    }
    this.currentUser = null
    this.notifyListeners()
    localStorage.removeItem("wallet_user")
    await supabase.auth.signOut();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser))
  }

  async getCurrentUser(): Promise<WalletUser | null> {
    if (typeof window !== 'undefined') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // First try to get wallet from users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('wallet_address, username, total_xp, level')
          .eq('id', user.id)
          .single();
        
        if (!userError && userData?.wallet_address) {
          const walletUser: WalletUser = {
            walletAddress: userData.wallet_address,
            username: userData.username || undefined,
            totalXP: userData.total_xp || undefined,
            level: userData.level || undefined,
          };
          this.currentUser = walletUser;
          localStorage.setItem("wallet_user", JSON.stringify(walletUser));
          return walletUser;
        }
        
        // Fallback: Extract wallet address from user identity data (Solana public key)
        const solanaIdentity = user.identities?.find(
          (id: any) => id.provider === 'web3' && id.identity_data?.public_key
        );
        if (solanaIdentity && solanaIdentity.identity_data && solanaIdentity.identity_data.public_key) {
          const walletUser: WalletUser = {
            walletAddress: solanaIdentity.identity_data.public_key,
            username: user.user_metadata?.username || undefined,
          };
          this.currentUser = walletUser;
          localStorage.setItem("wallet_user", JSON.stringify(walletUser));
          return walletUser;
        }
      }
      // Fallback to localStorage
      const stored = localStorage.getItem("wallet_user")
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored)
        } catch (error) {
          console.error("Failed to parse stored user:", error)
          localStorage.removeItem("wallet_user")
          this.currentUser = null
        }
      } else {
        this.currentUser = null
      }
      return this.currentUser
    }
    return null
  }

  onAuthStateChange(callback: (user: WalletUser | null) => void): () => void {
    // Always restore from Supabase/localStorage before subscribing
    if (!this.isInitialized) {
      this.isInitialized = true
      this.getCurrentUser().then(() => {
        this.listeners.push(callback)
        callback(this.currentUser)
      })
    } else {
      this.listeners.push(callback)
      callback(this.currentUser)
    }
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }
}

export const walletAuth = new WalletAuth()
