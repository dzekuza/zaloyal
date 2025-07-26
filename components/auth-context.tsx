"use client"

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react'
import { supabase } from '@/lib/supabase'
import { walletAuth, type WalletUser } from '@/lib/wallet-auth'

interface AuthContextType {
  user: WalletUser | null
  emailUser: { email: string; profile: any } | null
  isLoading: boolean
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<{ email: string; profile: any } | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Memoized check email auth function to prevent unnecessary re-renders
  const checkEmailAuth = useCallback(async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && user.email) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ email: user.email, profile })
      }
      setIsLoading(false)
    } catch (error) {
      console.error('Error checking email auth:', error)
      setIsLoading(false)
    }
  }, [])

  // Memoized wallet auth handler
  const handleWalletAuthChange = useCallback((user: WalletUser | null) => {
    setUser(user)
    setIsLoading(false)
  }, [])

  // Memoized supabase auth handler
  const handleSupabaseAuthChange = useCallback((event: string, session: any) => {
    if (event === "SIGNED_IN" && session?.user) {
      checkEmailAuth();
    } else if (event === "SIGNED_OUT") {
      setEmailUser(null);
      checkEmailAuth(); // Force re-fetch to clear any stale state
    }
  }, [checkEmailAuth])

  useEffect(() => {
    let isMounted = true

    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      if (isMounted) {
        handleWalletAuthChange(user)
      }
    })

    // Check for email user
    checkEmailAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(handleSupabaseAuthChange);

    return () => {
      isMounted = false
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [handleWalletAuthChange, checkEmailAuth, handleSupabaseAuthChange])

  // Memoized context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => {
    const isAuthenticated = !!(user || emailUser)
    return { user, emailUser, isLoading, isAuthenticated }
  }, [user, emailUser, isLoading])

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 