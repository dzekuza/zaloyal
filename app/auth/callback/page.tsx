"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/components/ui/use-toast'

export default function AuthCallback() {
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('DEBUG: Handling auth callback...')
        
        // Check for OAuth errors in URL params
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          console.error('OAuth error:', error, errorDescription)
          toast({
            title: "OAuth Error",
            description: errorDescription || error || "Authentication failed",
            variant: "destructive",
          })
          router.push('/profile?error=oauth_failed')
          return
        }
        
        // Get the current session after OAuth redirect
        const { data, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Auth callback error:', sessionError)
          toast({
            title: "Authentication Error",
            description: sessionError.message || "Failed to authenticate",
            variant: "destructive",
          })
          router.push('/profile?error=auth_failed')
          return
        }

        if (data.session) {
          console.log('DEBUG: Session found, user:', data.session.user.id)
          
          // User successfully authenticated
          const user = data.session.user
          
          // Check if user profile exists, create if not
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()

          if (profileError && profileError.code === 'PGRST116') {
            console.log('DEBUG: Creating user profile...')
            // Profile doesn't exist, create it
            const { error: insertError } = await supabase
              .from('users')
              .insert({
                id: user.id,
                email: user.email,
                username: user.user_metadata?.username || user.user_metadata?.name || `user_${user.id.slice(-6)}`
              })

            if (insertError) {
              console.error('Error creating user profile:', insertError)
            }
          }

          // Handle X authentication - store social account data
          if (user.app_metadata?.provider === 'twitter') {
            console.log('DEBUG: User authenticated with X, storing social account...')
            
            // Get user identities to find X identity
            const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
            
            if (!identitiesError && identities?.identities) {
              const twitterIdentity = identities.identities.find(
                (identity: any) => identity.provider === 'twitter'
              )
              
              if (twitterIdentity) {
                console.log('DEBUG: Found X identity, storing in social_accounts...')
                
                // Store or update social account
                const { error: socialError } = await supabase
                  .from('social_accounts')
                  .upsert({
                    user_id: user.id,
                    platform: 'x',
                    account_id: twitterIdentity.identity_id,
                    username: user.user_metadata?.username || user.user_metadata?.name || twitterIdentity.identity_id,
                    access_token: '', // Will be updated via API calls
                    refresh_token: null,
                    expires_at: null,
                    profile_data: {
                      id: twitterIdentity.identity_id,
                      username: user.user_metadata?.username || user.user_metadata?.name,
                      name: user.user_metadata?.name
                    },
                    verified: true,
                    // Platform-specific fields
                    x_account_id: twitterIdentity.identity_id,
                    x_username: user.user_metadata?.username || user.user_metadata?.name,
                    x_access_token: '', // Will be updated via API calls
                    x_refresh_token: null,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  }, {
                    onConflict: 'user_id,platform'
                  })

                if (socialError) {
                  console.error('Error storing social account:', socialError)
                } else {
                  console.log('DEBUG: Social account stored successfully')
                }
              }
            }
          }

          toast({
            title: "Success",
            description: "Successfully authenticated!",
          })
          
          // Redirect to profile page
          router.push('/profile?success=authenticated')
        } else {
          console.log('DEBUG: No session found')
          // No session found
          toast({
            title: "Authentication Failed",
            description: "No authentication session found",
            variant: "destructive",
          })
          router.push('/profile?error=no_session')
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        toast({
          title: "Error",
          description: "An unexpected error occurred during authentication",
          variant: "destructive",
        })
        router.push('/profile?error=internal_error')
      } finally {
        setLoading(false)
      }
    }

    handleAuthCallback()
  }, [router, toast, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Completing authentication...</p>
        </div>
      </div>
    )
  }

  return null
} 