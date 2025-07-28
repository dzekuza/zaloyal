"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export interface AuthUser {
  id: string
  email: string | null
  username?: string
  avatar_url?: string
  bio?: string
  social_links?: any
  email_confirmed_at?: string | null
  email_verified?: boolean
  profile?: any
}

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  signInWithX: () => Promise<void>
  signInWithDiscord: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, username?: string) => Promise<void>
  signOut: () => Promise<void>
  clearOAuthState: () => void
  clearAuthState: () => void
  verifyEmail: (email: string, token: string) => Promise<void>
  resendVerificationEmail: (email: string) => Promise<void>
  setPassword: (password: string) => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast()
  const isProcessingAuth = useRef(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    let isMounted = true

    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...')
        
        // Get the current session
        console.log('DEBUG: Getting initial session...')
        const { data: { session }, error } = await supabase.auth.getSession()
        
        console.log('DEBUG: Initial session result:', { session, error })
        
        if (error) {
          console.error('Error getting session:', error)
          if (isMounted) {
            setLoading(false)
          }
          return
        }

        if (session?.user) {
          console.log('Found Supabase user:', session.user.email)
          console.log('DEBUG: Initial user metadata:', session.user.user_metadata)
          console.log('DEBUG: Initial app metadata:', session.user.app_metadata)
          
          // Get user profile from database
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          console.log('DEBUG: Initial profile query result:', { profile })

          if (isMounted) {
            const authUser: AuthUser = {
              id: session.user.id,
              email: session.user.email || null,
              username: profile?.username || session.user.user_metadata?.username,
              avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
              bio: profile?.bio,
              social_links: profile?.social_links,
              email_confirmed_at: session.user.email_confirmed_at,
              email_verified: session.user.email_confirmed_at ? true : false,
              profile
            }
            setUser(authUser)
            setLoading(false)
          }
        } else {
          console.log('No authenticated user found')
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    // Single auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Event:", event)
        console.log("Session:", session)
        console.log('Auth state changed:', event, session?.user?.email)
        console.log('DEBUG: isProcessingAuth:', isProcessingAuth.current)
        
        if (!isMounted) return
        
        // Prevent processing during auth flow
        if (isProcessingAuth.current && event === 'SIGNED_OUT') {
          console.log('DEBUG: Ignoring SIGNED_OUT during auth processing')
          return
        }
        
        // Handle INITIAL_SESSION events (when page loads with existing session)
        if (event === 'INITIAL_SESSION') {
          if (session?.user) {
            try {
              console.log('DEBUG: Initial session found, processing...')
              
              // Get user profile from database
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (isMounted) {
                const authUser: AuthUser = {
                  id: session.user.id,
                  email: session.user.email || null,
                  username: profile?.username || session.user.user_metadata?.username,
                  avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
                  bio: profile?.bio,
                  social_links: profile?.social_links,
                  email_confirmed_at: session.user.email_confirmed_at,
                  email_verified: session.user.email_confirmed_at ? true : false,
                  profile
                }
                
                console.log('DEBUG: Setting user state from initial session:', authUser)
                setUser(authUser)
                setLoading(false)
              }
            } catch (error) {
              console.error('Error in initial session:', error)
              if (isMounted) {
                setUser(null)
                setLoading(false)
              }
            }
          } else {
            console.log('DEBUG: No initial session found')
            if (isMounted) {
              setUser(null)
              setLoading(false)
            }
          }
          return
        }
        
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          if (session?.user) {
            try {
              console.log('DEBUG: User authenticated, processing...')
              isProcessingAuth.current = true
              
              // Get user profile from database
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (isMounted) {
                const authUser: AuthUser = {
                  id: session.user.id,
                  email: session.user.email || null,
                  username: profile?.username || session.user.user_metadata?.username,
                  avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
                  bio: profile?.bio,
                  social_links: profile?.social_links,
                  email_confirmed_at: session.user.email_confirmed_at,
                  email_verified: session.user.email_confirmed_at ? true : false,
                  profile
                }
                
                console.log('DEBUG: Setting user state:', authUser)
                setUser(authUser)
                setLoading(false)
                
                // Reset processing flag after a delay
                setTimeout(() => {
                  isProcessingAuth.current = false
                }, 5000)
              }
            } catch (error) {
              console.error('Error in auth state change:', error)
              if (isMounted) {
                setUser(null)
                setLoading(false)
              }
              isProcessingAuth.current = false
            }
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('DEBUG: User signed out')
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
      }
    )

    return () => {
      isMounted = false
      subscription?.unsubscribe()
    }
  }, [])

  const signInWithX = async () => {
    try {
      console.log('DEBUG: Initiating X OAuth via Supabase Auth')

      // Use Supabase Auth for X authentication
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          scopes: 'tweet.read users.read follows.read offline.access'
        }
      })
      
      if (error) throw error
      
      console.log('DEBUG: OAuth initiated, redirecting to X...')
      
      toast({
        title: "Success",
        description: "Redirecting to X for authentication...",
      })
      
      // The redirect should happen automatically
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('X authentication error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to initiate X authentication",
        variant: "destructive",
      })
      throw error
    }
  }

  const signInWithDiscord = async () => {
    try {
      console.log('DEBUG: Initiating Discord OAuth via Supabase Auth')

      // Use Supabase Auth for Discord authentication
              const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'discord',
          options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
            scopes: 'identify email'
          }
        })
      
      if (error) throw error
      
      console.log('DEBUG: OAuth initiated, redirecting to Discord...')
      
      toast({
        title: "Success",
        description: "Redirecting to Discord for authentication...",
      })
      
      // The redirect should happen automatically
      if (data?.url) {
        window.location.href = data.url
      }
    } catch (error: any) {
      console.error('Discord authentication error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to initiate Discord authentication",
        variant: "destructive",
      })
      throw error
    }
  }

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Signed in successfully!",
      })
    } catch (error: any) {
      console.error('Email sign in error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      })
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, username?: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback/supabase`,
          data: username ? { username } : undefined,
        },
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Please check your email to verify your account.",
      })
    } catch (error: any) {
      console.error('Email sign up error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to sign up",
        variant: "destructive",
      })
      throw error
    }
  }

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      setUser(null)
      toast({
        title: "Success",
        description: "Signed out successfully!",
      })
    } catch (error: any) {
      console.error('Sign out error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      })
      throw error
    }
  }

  const clearOAuthState = () => {
    sessionStorage.removeItem('oauth_state')
    sessionStorage.removeItem('oauth_timestamp')
  }

  const clearAuthState = () => {
    setUser(null)
    setLoading(false)
  }

  const verifyEmail = async (email: string, token: string) => {
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'signup'
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Email verified successfully!",
      })
    } catch (error: any) {
      console.error('Email verification error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to verify email",
        variant: "destructive",
      })
      throw error
    }
  }

  const resendVerificationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback/supabase`,
        },
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Verification email sent!",
      })
    } catch (error: any) {
      console.error('Resend verification error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to resend verification email",
        variant: "destructive",
      })
      throw error
    }
  }

  const setPassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Password updated successfully!",
      })
    } catch (error: any) {
      console.error('Set password error:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to set password",
        variant: "destructive",
      })
      throw error
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithX,
    signInWithDiscord,
    signInWithEmail,
    signUpWithEmail,
    signOut,
    clearOAuthState,
    clearAuthState,
    verifyEmail,
    resendVerificationEmail,
    setPassword,
  }

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 