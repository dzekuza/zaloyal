"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function SupabaseAuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      setIsProcessing(true)
      
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          toast({
            title: "Authentication Error",
            description: "Failed to get session. Please try again.",
            variant: "destructive",
          })
          router.push('/')
          return
        }

        if (!session) {
          console.log('No session found, redirecting to home')
          router.push('/')
          return
        }

        const user = session.user
        console.log('DEBUG: Processing auth callback for user:', user.id)

        // Check if this is a social OAuth connection
        const isSocialAuth = user.app_metadata?.provider === 'twitter' || user.app_metadata?.provider === 'discord'
        let socialIdentity = null

        if (isSocialAuth) {
          console.log('DEBUG: Processing social OAuth connection...')
          
          try {
            // Get user identities to find social identity
            const { data: identities } = await supabase.auth.getUserIdentities()
            socialIdentity = identities?.identities?.find(
              (identity: any) => identity.provider === 'twitter' || identity.provider === 'discord'
            )
            
            if (socialIdentity) {
              console.log('DEBUG: Found social identity, storing social account...')
              console.log('DEBUG: Social identity details:', {
                provider: socialIdentity.provider,
                identity_id: socialIdentity.identity_id,
                identity_data: socialIdentity.identity_data
              })
              
              const platform = socialIdentity.provider === 'twitter' ? 'x' : 'discord'
              const platformData: any = {
                user_id: user.id,
                platform: platform,
                account_id: socialIdentity.identity_id,
                username: user.user_metadata?.username || user.user_metadata?.name || socialIdentity.identity_data?.username,
                access_token: '', // Will be updated via API calls if needed
                refresh_token: null,
                expires_at: null,
                profile_data: {
                  id: socialIdentity.identity_id,
                  username: user.user_metadata?.username || user.user_metadata?.name,
                  name: user.user_metadata?.name,
                  avatar_url: user.user_metadata?.avatar_url,
                  // Additional Discord-specific data
                  discriminator: user.user_metadata?.discriminator,
                  global_name: user.user_metadata?.global_name,
                  verified: user.user_metadata?.verified,
                  flags: user.user_metadata?.flags,
                  banner: user.user_metadata?.banner,
                  accent_color: user.user_metadata?.accent_color,
                  locale: user.user_metadata?.locale,
                  mfa_enabled: user.user_metadata?.mfa_enabled,
                  premium_type: user.user_metadata?.premium_type
                },
                verified: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }

              // Add platform-specific fields
              if (platform === 'x') {
                platformData.x_account_id = socialIdentity.identity_id
                platformData.x_username = user.user_metadata?.username || user.user_metadata?.name
              } else if (platform === 'discord') {
                platformData.discord_account_id = socialIdentity.identity_id
                platformData.discord_username = user.user_metadata?.username || user.user_metadata?.name
              }
              
              console.log('DEBUG: Platform data prepared:', platformData)
              
              // Store or update social account with better error handling
              try {
                console.log('DEBUG: Attempting to store social account:', {
                  user_id: platformData.user_id,
                  platform: platformData.platform,
                  account_id: platformData.account_id,
                  username: platformData.username
                });

                const { data, error: socialError } = await supabase
                  .from('social_accounts')
                  .upsert(platformData, {
                    onConflict: 'user_id,platform'
                  })
                  .select();

                if (socialError) {
                  console.error('Error storing social account:', {
                    error: socialError,
                    code: socialError.code,
                    message: socialError.message,
                    details: socialError.details,
                    hint: socialError.hint
                  });
                  // Don't fail the entire auth flow, just log the error
                  // The user can still proceed with their account
                } else {
                  console.log('DEBUG: Social account stored successfully:', data);
                }
              } catch (socialError) {
                console.error('Exception storing social account:', {
                  error: socialError,
                  message: socialError instanceof Error ? socialError.message : 'Unknown error',
                  stack: socialError instanceof Error ? socialError.stack : undefined
                });
                // Continue with the auth flow even if social account storage fails
              }
            }
          } catch (identityError) {
            console.error('Error handling social identity:', identityError)
            // Continue with the auth flow even if social identity handling fails
          }
        }

        // 🔥 BEST PRACTICE: Use auth.users for authentication, not custom users table
        // The user is already authenticated via Supabase Auth
        // Social details are available via user.user_metadata and user.identities
        console.log('DEBUG: User authenticated successfully via Supabase Auth')
        console.log('DEBUG: User metadata:', user.user_metadata)
        console.log('DEBUG: User identities:', user.identities)

        // Even if social account storage failed, the user is still authenticated
        // Social details are available in user.identities for verification
        console.log('DEBUG: Auth flow completed successfully')

        // Redirect to profile page to show the new connection
        const successParam = isSocialAuth ? `${socialIdentity?.provider || 'social'}_connected` : 'authenticated'
        router.push(`/profile?success=${successParam}`)

      } catch (error) {
        console.error('Auth callback error:', error)
        toast({
          title: "Authentication Error",
          description: "An error occurred during authentication. Please try again.",
          variant: "destructive",
        })
        router.push('/')
      } finally {
        setIsProcessing(false)
      }
    }

    handleAuthCallback()
  }, [router, toast])

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">
          {isProcessing ? 'Processing authentication...' : 'Redirecting...'}
        </h2>
        <p className="text-gray-600">
          Please wait while we complete your authentication.
        </p>
      </div>
    </div>
  )
} 