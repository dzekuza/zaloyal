"use client"

import { supabase } from "@/lib/supabase"

export interface WalletUser {
  walletAddress: string
  username?: string
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

  // Link wallet to the current authenticated user (email/social) using web3 payments
  async linkWalletToCurrentUser(): Promise<string> {
    // Get the current authenticated user first
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    if (userError || !currentUser) {
      throw new Error('You must be logged in with email or social account to link a wallet');
    }
    
    // Use web3 payments integration for wallet connection
    const provider = (window as any).solana;
    if (!provider) throw new Error('No Solana wallet found');
    
    // Connect to wallet using web3 payments
    await provider.connect();
    const walletAddress = provider.publicKey.toString();
    
    console.log('[Wallet Auth] Linking wallet via web3 payments:', {
      userId: currentUser.id,
      walletAddress: walletAddress.substring(0, 10) + '...',
      platform: 'solana'
    });
    
    try {
      // Use the database function to handle wallet linking with web3 payments integration
      const { data, error } = await supabase.rpc('link_wallet_to_user', {
        p_user_id: currentUser.id,
        p_wallet_address: walletAddress
      });
      
      if (error) {
        console.error('Error linking wallet:', error);
        throw new Error(error.message || 'Failed to link wallet');
      }
      
      console.log('[Wallet Auth] Successfully linked wallet via web3 payments');
      
      this.currentUser = { walletAddress } as WalletUser;
      this.notifyListeners();
      localStorage.setItem("wallet_user", JSON.stringify({ walletAddress }));
      return walletAddress;
      
    } catch (error) {
      console.error('Wallet linking error:', error);
      throw error;
    }
  }

  // Sign in with wallet using web3 payments (for wallet-only users)
  async signInWithSolanaWallet(): Promise<string> {
    const provider = (window as any).solana;
    if (!provider) throw new Error('No Solana wallet found');
    await provider.connect();
    
    // Use Supabase web3 authentication with web3 payments integration
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

  // Disconnect wallet
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

  // Get current user with web3 payments integration
  async getCurrentUser(): Promise<WalletUser | null> {
    if (typeof window !== 'undefined') {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get wallet from social_accounts table (web3 payments integration)
        const { data: socialAccount, error: socialError } = await supabase
          .from('social_accounts')
          .select('wallet_address, username')
          .eq('user_id', user.id)
          .eq('platform', 'solana')
          .single();
        
        // Don't throw error if no solana account found - just return null
        if (!socialError && socialAccount?.wallet_address) {
          const walletUser: WalletUser = {
            walletAddress: socialAccount.wallet_address,
            username: socialAccount.username || undefined,
          };
          this.currentUser = walletUser;
          localStorage.setItem("wallet_user", JSON.stringify(walletUser));
          return walletUser;
        }
        
        // Fallback: Extract wallet address from user identity data (web3 payments)
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

  // Initialize wallet auth with web3 payments
  async initialize(): Promise<void> {
    if (this.isInitialized) return
    this.isInitialized = true
    await this.getCurrentUser()
  }

  // Listen for auth state changes
  onAuthStateChange(listener: (user: WalletUser | null) => void): () => void {
    this.listeners.push(listener)
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentUser))
  }
}

export const walletAuth = new WalletAuth()
