"use client"

import { supabase } from "./supabase"

declare global {
  interface Window {
    ethereum?: any
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
      if (!window.ethereum) {
        throw new Error("MetaMask is not installed")
      }

      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      if (accounts.length === 0) {
        throw new Error("No accounts found")
      }

      const walletAddress = accounts[0].toLowerCase()

      // Sign a message to verify wallet ownership
      const message = `Sign this message to authenticate with QuestHub: ${Date.now()}`
      const signature = await window.ethereum.request({
        method: "personal_sign",
        params: [message, walletAddress],
      })

      // ❶ Try to create a (short-lived) anonymous session so RLS policies
      //    receive a JWT that includes our custom claims. Some Supabase
      //    projects have anonymous sign-ins turned off, so we fall back
      //    gracefully if that’s the case.
      try {
        const { error: anonErr } = await supabase.auth.signInAnonymously({
          options: {
            data: {
              wallet_address: walletAddress,
              signature,
              message,
            },
          },
        })

        if (anonErr && !/anonymous sign[- ]?ins? are disabled/i.test(anonErr.message)) {
          // Any error _other_ than “anonymous sign-ins are disabled” is fatal
          throw anonErr
        }
      } catch (e) {
        // Log and continue when the project has anonymous sign-ins disabled.
        // All public selects will still work; inserts/updates use RLS fallbacks.
        console.warn("Anon sign-in skipped:", (e as Error).message)
      }

      // Create (or fetch) the user via server route so RLS is bypassed
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
