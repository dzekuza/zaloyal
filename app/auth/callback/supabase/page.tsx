"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'

export default function SupabaseAuthCallback() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log('DEBUG: Handling Supabase auth callback...')
        
        // Check for OAuth errors in URL params
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        
        if (error) {
          console.error('OAuth error:', error, errorDescription)
          
          // Handle specific error cases
          if (error === 'server_error' && errorDescription?.includes('Error creating identity')) {
            toast({
              title: "Configuration Error",
              description: "Twitter OAuth is not properly configured. Please check your Supabase Auth settings.",
              variant: "destructive",
            })
            router.push('/profile?error=oauth_config_error')
            return
          }
          
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
        
        if (data?.session) {
          console.log('DEBUG: Session found, user authenticated')
          
          // Get user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.session.user.id)
            .single()
          
          // Handle social account linking for X (Twitter)
          if (data.session.user.app_metadata?.provider === 'twitter') {
            try {
              // Ensure user exists in users table first
              const { error: userError } = await supabase
                .from('users')
                .upsert({
                  id: data.session.user.id,
                  user_id: data.session.user.id,
                  email: data.session.user.email,
                  username: data.session.user.user_metadata?.preferred_username || data.session.user.user_metadata?.screen_name || 'user_' + data.session.user.id.substring(0, 8),
                  avatar_url: data.session.user.user_metadata?.profile_image_url || data.session.user.user_metadata?.avatar_url,
                  total_xp: 0,
                  level: 1,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }, {
                  onConflict: 'id'
                })
              
              if (userError) {
                console.error('Error ensuring user exists:', userError)
              } else {
                console.log('DEBUG: User ensured in database successfully')
              }

              // Also store social account data for backward compatibility
              const { error: socialError } = await supabase
                .from('social_accounts')
                .upsert({
                  user_id: data.session.user.id,
                  platform: 'x',
                  platform_user_id: data.session.user.user_metadata?.sub || data.session.user.id,
                  username: data.session.user.user_metadata?.preferred_username || data.session.user.user_metadata?.screen_name,
                  display_name: data.session.user.user_metadata?.name,
                  profile_image_url: data.session.user.user_metadata?.profile_image_url,
                  access_token: data.session.user.user_metadata?.access_token,
                  refresh_token: data.session.user.user_metadata?.refresh_token,
                  expires_at: data.session.user.user_metadata?.expires_at,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
              
              if (socialError) {
                console.error('Error storing social account:', socialError)
              } else {
                console.log('DEBUG: Social account data stored successfully')
              }
            } catch (error) {
              console.error('Error handling social account:', error)
            }
          }
          
          toast({
            title: "Success",
            description: "Authentication completed successfully",
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