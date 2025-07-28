"use client"

import { ReactNode } from 'react'
import { useAuth } from '@/components/auth-provider-wrapper'
import AuthRequired from '@/components/auth-required'
import LoadingSpinner from '@/components/loading-spinner'

interface AuthWrapperProps {
  children: ReactNode
  requireAuth?: boolean
  title?: string
  message?: string
  showSignInButton?: boolean
  onAuthClick?: () => void
}

export default function AuthWrapper({
  children,
  requireAuth = true,
  title = "Sign In Required",
  message = "Please sign in with your email or wallet to access this page.",
  showSignInButton = true,
  onAuthClick
}: AuthWrapperProps) {
  const { user, loading } = useAuth()

  // Show loading spinner while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <div className="text-center">
          <LoadingSpinner size="lg" text="Loading..." />
        </div>
      </div>
    )
  }

  // If auth is not required, render children
  if (!requireAuth) {
    return <>{children}</>
  }

  // If auth is required but user is not authenticated
  if (!user) {
    return (
      <AuthRequired
        title={title}
        message={message}
        showSignInButton={showSignInButton}
        onAuthClick={onAuthClick}
      />
    )
  }

  // User is authenticated, render children
  return <>{children}</>
}