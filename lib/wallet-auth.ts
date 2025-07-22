"use client"

import { supabase } from "./supabase"
import bs58 from "bs58"

declare global {
  interface Window {
    ethereum?: any
    solana?: any
  }
}

export interface WalletUser {
  walletAddress: string
  username?: string
  totalXP: number
  level: number
  rank?: number
}

class WalletAuth {
  private currentUser: WalletUser | null = null
  private listeners: ((user: WalletUser | null) => void)[] = []

  // Only allow wallet linking, not authentication
  async connectWallet(): Promise<string> {
    const provider = window.solana
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
    this.currentUser = null
    localStorage.removeItem("wallet_user")
    this.notifyListeners()
  }

  async createOrGetUser(walletAddress: string): Promise<WalletUser> {
    // First, try to get existing user
    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("wallet_address", walletAddress)
      .single()

    if (existingUser && !fetchError) {
      return {
        walletAddress: existingUser.wallet_address,
        username: existingUser.username || undefined,
        totalXP: existingUser.total_xp,
        level: existingUser.level,
        rank: existingUser.rank || undefined,
      }
    }

    // Create new user if doesn't exist
    const { data: newUser, error: insertError } = await supabase
      .from("users")
      .insert({
        wallet_address: walletAddress,
        username: `User${walletAddress.slice(-6)}`,
        total_xp: 0,
        level: 1,
        completed_quests: 0,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Failed to create user: ${insertError.message}`)
    }

    return {
      walletAddress: newUser.wallet_address,
      username: newUser.username || undefined,
      totalXP: newUser.total_xp,
      level: newUser.level,
      rank: newUser.rank || undefined,
    }
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
    this.getCurrentUser().then(() => {
      this.listeners.push(callback)
      callback(this.currentUser)
    })
    return () => {
      this.listeners = this.listeners.filter((listener) => listener !== callback)
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => listener(this.currentUser))
  }

  async updateProfile(updates: Partial<Pick<WalletUser, "username">>): Promise<void> {
    if (!this.currentUser) {
      throw new Error("No user connected")
    }

    const { error } = await supabase.from("users").update(updates).eq("wallet_address", this.currentUser.walletAddress)

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    // Update local user
    this.currentUser = { ...this.currentUser, ...updates }
    localStorage.setItem("wallet_user", JSON.stringify(this.currentUser))
    this.notifyListeners()
  }
}

export const walletAuth = new WalletAuth()

export async function linkWalletToProfile() {
  const provider = window.solana;
  if (!provider || !provider.isPhantom) {
    throw new Error("Phantom Wallet is not installed");
  }
  await provider.connect();
  const walletAddress = provider.publicKey.toString();
  // Save wallet address to user profile
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const { error } = await supabase
    .from("users")
    .update({ wallet_address: walletAddress })
    .eq("id", user.id);
  if (error) throw error;
  return walletAddress;
}
