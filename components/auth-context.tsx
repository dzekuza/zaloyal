"use client"

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
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

  useEffect(() => {
    let isMounted = true

    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      if (isMounted) {
        setUser(user)
        setIsLoading(false)
      }
    })

    // Check for email user
    const checkEmailAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (isMounted && user && user.email) {
          const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
          setEmailUser({ email: user.email, profile })
        }
        if (isMounted) {
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error checking email auth:', error)
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    checkEmailAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        if (event === "SIGNED_IN" && session?.user) {
          checkEmailAuth()
        } else if (event === "SIGNED_OUT") {
          setEmailUser(null)
          setIsLoading(false)
        }
      }
    })

    return () => {
      isMounted = false
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

  const isAuthenticated = !!(user || emailUser)

  return (
    <AuthContext.Provider value={{ user, emailUser, isLoading, isAuthenticated }}>
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