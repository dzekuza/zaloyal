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

  // Only allow wallet linking, not authentication
  async connectWallet(): Promise<string> {
    const provider = (window as any).solana
    if (!provider || !provider.isPhantom) {
      throw new Error("Phantom Wallet is not installed")
    }
    await provider.connect()
    const walletAddress = provider.publicKey.toString()
    // Only link wallet to profile, do not authenticate
    // Save wallet address to user profile
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");
    const { error } = await supabase
      .from("users")
      .update({ wallet_address: walletAddress })
      .eq("id", user.id);
    if (error) throw error;
    // Optionally update local state
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
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentUser))
  }

  async getCurrentUser(): Promise<WalletUser | null> {
    // 1. Check if authenticated with Supabase
    if (typeof window !== 'undefined') {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // Fetch wallet address from users table
        const { data: profile } = await supabase.from("users").select("wallet_address,username,total_xp,level,rank").eq("id", user.id).single()
        if (profile && profile.wallet_address) {
          const walletUser: WalletUser = {
            walletAddress: profile.wallet_address,
            username: profile.username || undefined,
            totalXP: profile.total_xp,
            level: profile.level,
            rank: profile.rank || undefined,
          }
          this.currentUser = walletUser
          localStorage.setItem("wallet_user", JSON.stringify(walletUser))
          return walletUser
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
