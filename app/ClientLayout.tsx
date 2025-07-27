"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { Inter } from 'next/font/google'
import Navigation from '@/components/navigation'
import LoadingSpinner from '@/components/loading-spinner'
import { useAuth, AuthProvider } from '@/components/auth-provider-wrapper'
import { useToast } from '@/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import AuthDialog from '@/components/auth-dialog'
import { supabase } from '@/lib/supabase'

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

// Memoized loading screen to prevent re-renders
const LoadingScreen = React.memo(() => (
  <div className="min-h-screen bg-[#111111] flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
))
LoadingScreen.displayName = 'LoadingScreen'

// Separate component that uses auth context
function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const { toast } = useToast();
  const { user, loading } = useAuth();

  // Memoized auth state change handlers to prevent unnecessary re-renders
  const handleAuthStateChange = useCallback((event: string, session: any) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/";
    }
  }, []);

  const handleOpenAuthDialog = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  // Memoized main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => (
    <div className={`${inter.className} min-h-screen bg-[#111111] flex`}>
      {/* Navigation */}
      <Navigation onAuthClick={handleOpenAuthDialog} />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        {children}
      </div>
    </div>
  ), [children, handleOpenAuthDialog]);

  // Memoized auth dialog event handler
  useEffect(() => {
    const handler = handleOpenAuthDialog;
    window.addEventListener('open-auth-dialog', handler);
    return () => window.removeEventListener('open-auth-dialog', handler);
  }, [handleOpenAuthDialog]);

  // Memoized supabase auth subscription
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);
    return () => subscription.unsubscribe();
  }, [handleAuthStateChange]);

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

  // Show loading screen while auth is loading
  if (loading) {
    return <LoadingScreen />
  }

  return themeProviderContent
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    </AuthProvider>
  )
}

