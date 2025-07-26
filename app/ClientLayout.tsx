"use client"

import React from "react"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EmailAuth from "@/components/email-auth"
import { Toaster } from "@/components/ui/sonner"
import OnboardingAlertBar from "@/components/onboarding-alert-bar"
import { walletAuth } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/components/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { AuthProvider } from "@/components/auth-context";
import Navigation from "@/components/navigation";
import PageContainer from "@/components/PageContainer";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

// Memoized loading component to prevent unnecessary re-renders
const LoadingScreen = React.memo(() => (
  <div className="min-h-screen bg-[#111111] flex items-center justify-center">
    <LoadingSpinner size="lg" text="Loading..." />
  </div>
))
LoadingScreen.displayName = 'LoadingScreen'

// Memoized auth dialog to prevent re-renders
const AuthDialog = React.memo(({ 
  showAuthDialog, 
  setShowAuthDialog, 
  handleEmailAuthSuccess, 
  handleEmailAuthError 
}: {
  showAuthDialog: boolean
  setShowAuthDialog: (show: boolean) => void
  handleEmailAuthSuccess: (authUser: unknown) => void
  handleEmailAuthError: (errorMessage: string) => void
}) => (
  <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>Sign In</DialogTitle>
        <DialogDescription>
          Choose your preferred authentication method
        </DialogDescription>
      </DialogHeader>
      <div className="p-4">
        <EmailAuth
          onSuccess={handleEmailAuthSuccess}
          onError={handleEmailAuthError}
          onNavigate={() => window.location.href = '/dashboard'}
        />
      </div>
    </DialogContent>
  </Dialog>
))
AuthDialog.displayName = 'AuthDialog'

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  // All hooks must be called at the top level, before any conditional logic
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")
  const { toast } = useToast();
  const { user, emailUser, isLoading } = useAuth();

  // Memoized auth state change handlers to prevent unnecessary re-renders
  const handleAuthStateChange = useCallback((event: string, session: any) => {
    if (event === "SIGNED_OUT") {
      window.location.href = "/";
    }
  }, []);

  const handleOpenAuthDialog = useCallback(() => {
    setShowAuthDialog(true);
  }, []);

  const handleEmailAuthSuccess = useCallback((authUser: unknown) => {
    console.log("Email auth success:", authUser)
    setShowAuthDialog(false)
    setAuthError("")
    window.location.reload()
  }, []);

  const handleEmailAuthError = useCallback((errorMessage: string) => {
    setAuthError(errorMessage)
  }, []);

  // Memoized main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => (
    <div className={`${inter.className} min-h-screen bg-[#111111] flex`}>
      {/* Navigation */}
      <Navigation onAuthClick={handleOpenAuthDialog} />
      
      {/* Main Content */}
      <div className="flex-1 md:ml-64">
        <PageContainer>
          {children}
        </PageContainer>
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

      {/* Auth Dialog */}
      <AuthDialog 
        showAuthDialog={showAuthDialog}
        setShowAuthDialog={setShowAuthDialog}
        handleEmailAuthSuccess={handleEmailAuthSuccess}
        handleEmailAuthError={handleEmailAuthError}
      />

      {/* Onboarding Alert */}
      <OnboardingAlertBar />

      {/* Toast Notifications */}
      <Toaster />
    </>
  ), [mainContent, showAuthDialog, handleEmailAuthSuccess, handleEmailAuthError]);

  // Show loading state while auth is being checked
  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      {themeProviderContent}
    </ThemeProvider>
  )
}

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ClientLayoutContent>{children}</ClientLayoutContent>
    </AuthProvider>
  )
}

