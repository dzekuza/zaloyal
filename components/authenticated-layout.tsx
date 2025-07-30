"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Inter } from 'next/font/google'
import Navigation from '@/components/navigation'
import MobileNavigation from '@/components/mobile-navigation'
import LoadingSpinner from '@/components/loading-spinner'
import OnboardingAlertBar from '@/components/onboarding-alert-bar'
import AIQuestChat from '@/components/ai-quest-chat'
import { useAuth } from '@/components/auth-provider-wrapper'
import { useToast } from '@/hooks/use-toast'
import AuthDialog from '@/components/auth-dialog'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const { toast } = useToast();
  const { user, loading } = useAuth();

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Memoized loading screen with proper auth context
  const LoadingScreen = React.memo(() => {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" text={loading ? "Loading..." : "Initializing..."} />
          {user && (
            <p className="text-gray-400 text-sm mt-2">Welcome back, {user.username || user.email}</p>
          )}
        </div>
      </div>
    )
  })
  LoadingScreen.displayName = 'LoadingScreen'

  const handleOpenAuthDialog = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  // Memoized main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => (
    <div className={`${inter.className} min-h-screen bg-[#111111] flex`}>
      {/* Desktop Navigation */}
      <Navigation />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64 pb-16 md:pb-0 overflow-x-hidden">
        {children}
      </div>
      
      {/* Mobile Navigation */}
      <MobileNavigation />
      
      {/* Onboarding Alert Bar */}
      <OnboardingAlertBar />
      
      {/* AI Quest Chat - Only show for project owners */}
      {user && <AIQuestChat />}
    </div>
  ), [children, user]);

  // Memoized auth dialog event handler
  useEffect(() => {
    const handler = handleOpenAuthDialog;
    window.addEventListener('open-auth-dialog', handler);
    return () => window.removeEventListener('open-auth-dialog', handler);
  }, [handleOpenAuthDialog]);

  // Memoized theme provider content
  const themeProviderContent = useMemo(() => (
    <>
      {mainContent}
      <AuthDialog
        open={showAuthDialog}
        onOpenChange={setShowAuthDialog}
      />
    </>
  ), [mainContent, showAuthDialog]);

  // Show loading screen while auth is loading or not mounted
  if (loading || !isMounted) {
    return <LoadingScreen />
  }

  return themeProviderContent
} 