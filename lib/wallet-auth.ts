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
  role: "participant" | "creator" | "admin"
}

class WalletAuth {
  private currentUser: WalletUser | null = null
  private listeners: ((user: WalletUser | null) => void)[] = []

  async connectWallet(): Promise<WalletUser | null> {
    try {
      const provider = window.solana
      if (!provider || !provider.isPhantom) {
        throw new Error("Phantom Wallet is not installed")
      }

      await provider.connect()
      const walletAddress = provider.publicKey.toString()
      const message = `Sign this message to authenticate with QuestHub: ${Date.now()}`
      const encodedMessage = new TextEncoder().encode(message)

      // Sign the message with Phantom
      const signed = await provider.signMessage(encodedMessage, "utf8")
      const signature = bs58.encode(signed.signature) // base58 encode

      // 1. Get a custom JWT from the backend
      const jwtRes = await fetch("/api/auth/wallet-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature, message }),
      })
      const { token } = await jwtRes.json()
      if (!token) throw new Error("Failed to get JWT for wallet login")

      // 2. Sign in to Supabase with the custom JWT
      const { error: jwtError } = await supabase.auth.signInWithIdToken({
        provider: "custom",
        token,
      })
      if (jwtError) throw jwtError

      // 3. Create (or fetch) the user via server route so RLS is bypassed
      const res = await fetch("/api/users/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      })

      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(`Failed to create user: ${error}`)
      }

      const { user } = (await res.json()) as { user: any }

      const formattedUser: WalletUser = {
        walletAddress: user.wallet_address,
        username: user.username ?? undefined,
        totalXP: user.total_xp,
        level: user.level,
        rank: user.rank ?? undefined,
        role: user.role,
      }

      this.currentUser = formattedUser
      this.notifyListeners()

      // Store in localStorage
      localStorage.setItem("wallet_user", JSON.stringify(formattedUser))

      return formattedUser
    } catch (error) {
      console.error("Wallet connection failed:", error)
      throw error
    }
  }

  async disconnectWallet(): Promise<void> {
    this.currentUser = null
    localStorage.removeItem("wallet_user")
    await supabase.auth.signOut()
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
        role: existingUser.role,
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
        role: "participant",
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
      role: newUser.role,
    }
  }

  getCurrentUser(): WalletUser | null {
    if (!this.currentUser) {
      // Try to restore from localStorage
      const stored = localStorage.getItem("wallet_user")
      if (stored) {
        try {
          this.currentUser = JSON.parse(stored)
        } catch (error) {
          console.error("Failed to parse stored user:", error)
          localStorage.removeItem("wallet_user")
        }
      }
    }
    return this.currentUser
  }

  onAuthStateChange(callback: (user: WalletUser | null) => void): () => void {
    this.listeners.push(callback)

    // Call immediately with current state
    callback(this.getCurrentUser())

    // Return unsubscribe function
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
  const message = `Link this wallet to your account: ${Date.now()}`;
  const encodedMessage = new TextEncoder().encode(message);
  const signed = await provider.signMessage(encodedMessage, "utf8");
  const signature = bs58.encode(signed.signature);

  // Optionally verify signature here or on backend

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
