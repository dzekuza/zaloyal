"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EmailAuth from "@/components/email-auth"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import OnboardingAlertBar from "@/components/onboarding-alert-bar"
import { walletAuth } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button"
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


function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")
  const { toast } = useToast();
  const { user, emailUser, isLoading } = useAuth();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Clear user state and redirect to home
        window.location.href = "/";
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handler = () => setShowAuthDialog(true);
    window.addEventListener('open-auth-dialog', handler);
    return () => window.removeEventListener('open-auth-dialog', handler);
  }, []);

  const handleEmailAuthSuccess = (authUser: unknown) => {
    console.log("Email auth success:", authUser)
    setShowAuthDialog(false)
    setAuthError("")
    window.location.reload()
  }

  const handleEmailAuthError = (errorMessage: string) => {
    setAuthError(errorMessage)
  }

  // Show loading state while auth is being checked
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#111111] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  const handleAuthClick = () => {
    setShowAuthDialog(true);
  };

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <div className={`${inter.className} min-h-screen bg-[#111111] flex`}>
        {/* Navigation */}
        <Navigation onAuthClick={handleAuthClick} />
        
        {/* Main Content */}
        <div className="flex-1 md:ml-64">
          <PageContainer>
            {children}
          </PageContainer>
        </div>
      </div>

      {/* Auth Dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sign In</DialogTitle>
            <DialogDescription>
              Choose your preferred authentication method
            </DialogDescription>
          </DialogHeader>
          <EmailAuth
            onSuccess={handleEmailAuthSuccess}
            onError={handleEmailAuthError}
          />
        </DialogContent>
      </Dialog>

      {/* Onboarding Alert */}
      <OnboardingAlertBar />

      {/* Toast Notifications */}
      <Toaster />
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

