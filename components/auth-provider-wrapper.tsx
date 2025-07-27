"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"

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
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, username: string) => Promise<void>
  signInWithX: () => Promise<void>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  clearAuthState: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  // Initialize authentication state
  useEffect(() => {
    let isMounted = true // Prevent state updates on unmounted component
    
    const initializeAuth = async () => {
      try {
        console.log('Initializing authentication...')
        
        // Check Supabase auth
        const { data: { user: supabaseUser }, error } = await supabase.auth.getUser()
        
        if (!isMounted) return // Don't update state if component unmounted
        
        if (supabaseUser && !error) {
          console.log('Found Supabase user:', supabaseUser.email)
          
          // Fetch user profile from database
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', supabaseUser.id)
            .single()
          
          if (!isMounted) return // Don't update state if component unmounted
          
          const authUser: AuthUser = {
            id: supabaseUser.id,
            email: supabaseUser.email || null,
            username: profile?.username,
            avatar_url: profile?.avatar_url,
            bio: profile?.bio,
            social_links: profile?.social_links,
            email_confirmed_at: supabaseUser.email_confirmed_at,
            email_verified: supabaseUser.email_confirmed_at ? true : false,
            profile
          }
          
          setUser(authUser)
        } else {
          console.log('No authenticated user found')
          setUser(null)
        }
        
        if (isMounted) {
          setLoading(false)
        }
              } catch (error) {
          console.error('Error initializing auth:', error)
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
        }
    }

    initializeAuth()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        if (!isMounted) return // Don't update state if component unmounted
        
        if (session?.user) {
          try {
            console.log('DEBUG: User authenticated, processing...')
            
            // Ensure user exists in public.users and public.profiles tables
            const { error: userError } = await supabase
              .from('users')
              .upsert({
                id: session.user.id,
                user_id: session.user.id,
                email: session.user.email,
                username: session.user.user_metadata?.username || `user_${session.user.id.substring(0, 8)}`,
                avatar_url: session.user.user_metadata?.avatar_url,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })

            if (userError) {
              console.error('Error ensuring user exists:', userError)
            }

            // Ensure profile exists
            const { error: profileError } = await supabase
              .from('profiles')
              .upsert({
                id: session.user.id,
                user_id: session.user.id,
                email: session.user.email,
                username: session.user.user_metadata?.username || `user_${session.user.id.substring(0, 8)}`,
                total_xp: 0,
                level: 1,
                completed_quests: 0,
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }, {
                onConflict: 'id'
              })

            if (profileError) {
              console.error('Error ensuring profile exists:', profileError)
            }
            
            // User signed in with email or OAuth
            const { data: profile } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()
            
            // Handle X authentication via Supabase Auth (not direct OAuth)
            // Check for X authentication in multiple ways
            const isXAuth = session.user.app_metadata?.provider === 'twitter' || 
                           session.user.user_metadata?.provider === 'twitter' ||
                           session.user.identities?.some((identity: any) => identity.provider === 'twitter');
            
            if (isXAuth) {
              console.log('DEBUG: Processing X authentication...')
              try {
                // Get user identities to find X identity
                const { data: identities } = await supabase.auth.getUserIdentities()
                const twitterIdentity = identities?.identities?.find(
                  (identity: any) => identity.provider === 'twitter'
                )
                
                if (twitterIdentity) {
                  console.log('DEBUG: Found X identity, storing social account...')
                  // Store or update social account via Supabase Auth
                  const { error: socialError } = await supabase
                    .from('social_accounts')
                    .upsert({
                      user_id: session.user.id,
                      platform: 'x',
                      account_id: twitterIdentity.identity_id,
                      username: session.user.user_metadata?.username || session.user.user_metadata?.name || twitterIdentity.identity_data?.screen_name,
                      access_token: '', // Will be updated via API calls
                      refresh_token: null,
                      expires_at: null,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString()
                    }, {
                      onConflict: 'user_id,platform'
                    })

                  if (socialError) {
                    console.error('Error storing social account:', socialError)
                  } else {
                    console.log('DEBUG: Social account stored successfully in auth provider')
                  }
                } else {
                  console.log('DEBUG: No X identity found in user identities')
                }
              } catch (identityError) {
                console.error('Error handling X identity in auth provider:', identityError)
              }
            } else {
              console.log('DEBUG: Not X authentication, provider:', session.user.app_metadata?.provider)
            }
            
            if (!isMounted) return // Don't update state if component unmounted
            
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
            
            // If this is a new authentication (not just a page refresh), redirect to profile
            if (event === 'SIGNED_IN') {
              console.log('DEBUG: New sign-in detected, redirecting to profile...')
              // Use a small delay to ensure the state is updated
              setTimeout(() => {
                if (typeof window !== 'undefined') {
                  window.location.href = '/profile?success=authenticated'
                }
              }, 100)
            }
          } catch (error) {
            console.error('Error in auth state change:', error)
            if (isMounted) {
              setUser(null)
              setLoading(false)
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
      subscription.unsubscribe()
    }
  }, [])

  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      })
      
      if (error) throw error
      
      toast({
        title: "Success",
        description: "Signed in successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign in",
        variant: "destructive",
      })
      throw error
    }
  }

  const signUpWithEmail = async (email: string, password: string, username: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username
          }
        }
      })
      
      if (error) throw error
      
      // Create user profile in database
      if (data.user) {
        const { error: profileError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email,
            username
          })
        
        if (profileError) {
          console.error('Error creating profile:', profileError)
        }
      }
      
      toast({
        title: "Success",
        description: "Account created! Please check your email to verify your account.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      })
      throw error
    }
  }

  const signInWithX = async () => {
    try {
      // Use Supabase Auth for X authentication (not direct OAuth)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          scopes: 'tweet.read users.read follows.read offline.access'
        }
      })
      
      if (error) throw error
      
      // If we get here, the OAuth flow was initiated successfully
      // The user should be redirected to Twitter/X for authentication
      console.log('DEBUG: OAuth initiated, redirecting to X...')
      
      toast({
        title: "Success",
        description: "Redirecting to X for authentication...",
      })
      
      // The redirect should happen automatically, but if it doesn't,
      // we can force it by checking the URL
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

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      
      toast({
        title: "Success",
        description: "Signed out successfully!",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sign out",
        variant: "destructive",
      })
    }
  }

  const refreshUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single()
        
        const authUser: AuthUser = {
          id: user.id,
          email: user.email || null,
          username: profile?.username || user.user_metadata?.username,
          avatar_url: profile?.avatar_url || user.user_metadata?.avatar_url,
          bio: profile?.bio,
          social_links: profile?.social_links,
          email_confirmed_at: user.email_confirmed_at,
          email_verified: user.email_confirmed_at ? true : false,
          profile
        }
        setUser(authUser)
      } else {
        setUser(null)
      }
    } catch (error) {
      console.error('Error refreshing user:', error)
      // If there's a JWT token issue, clear the session
      if (error && typeof error === 'object' && 'message' in error && 
          (error.message as string).includes('user_not_found')) {
        console.log('JWT token issue detected, clearing session...')
        await supabase.auth.signOut()
        setUser(null)
      }
    }
  }

  // Function to clear authentication state and resolve JWT issues
  const clearAuthState = async () => {
    try {
      await supabase.auth.signOut()
      setUser(null)
      console.log('Authentication state cleared')
    } catch (error) {
      console.error('Error clearing auth state:', error)
    }
  }

  const value: AuthContextType = {
    user,
    loading,
    signInWithEmail,
    signUpWithEmail,
    signInWithX,
    signOut,
    refreshUser,
    clearAuthState
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
} 