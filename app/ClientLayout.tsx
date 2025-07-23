"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
} from "@/components/ui/sidebar"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Calendar, Home, Inbox, Users } from "lucide-react"
import EmailAuth from "@/components/email-auth"
import MobileBottomNav from "@/components/mobile-bottom-nav"
import { usePathname } from "next/navigation"
import { Toaster } from "@/components/ui/sonner"
import OnboardingAlertBar from "@/components/onboarding-alert-bar"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Trophy, Building2, BarChart3, Copy, Check, Info } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";
import { useAuth } from "@/components/auth-context";
import LoadingSpinner from "@/components/loading-spinner";
import { AuthProvider } from "@/components/auth-context";

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'arial']
})

// Menu items for sidebar
const items = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "My Projects",
    url: "/project",
    icon: Users,
  },
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Inbox,
  },
  {
    title: "Leaderboard",
    url: "/leaderboard",
    icon: Calendar,
  },
]

function ClientLayoutContent({ children }: { children: React.ReactNode }) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")
  const pathname = usePathname();
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  const handleSignOut = async () => {
    if (user) {
      await walletAuth.disconnectWallet()
    }
    if (emailUser) {
      await supabase.auth.signOut()
    }
    window.location.reload()
  }

  const displayName = user?.username || emailUser?.profile?.username || "User"

  const handleCopyAddress = async (address: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard.",
        duration: 1200,
      });
      setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

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
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <SidebarProvider>
        <div className={`${inter.className} flex h-screen bg-[#181818]`}>
          {/* Sidebar */}
          <Sidebar className="hidden lg:flex">
            <SidebarHeader className="border-b border-[#282828]">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">B</span>
                  </div>
                  <span className="text-white font-semibold">BeLink</span>
                </div>
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel className="text-gray-400 text-xs font-medium px-4 py-2">
                  Navigation
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={pathname === item.url}>
                          <Link href={item.url} className="flex items-center gap-3 px-4 py-2 text-gray-300 hover:text-white hover:bg-[#111111] rounded-lg transition-colors">
                            <item.icon className="w-5 h-5" />
                            {item.title}
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter className="border-t border-[#282828] p-4">
              {user || emailUser ? (
                <ProfileDropdown
                  displayName={displayName}
                  user={user}
                  emailUser={emailUser}
                  handleSignOut={handleSignOut}
                  copied={copied}
                  onCopyAddress={handleCopyAddress}
                />
              ) : (
                <Button
                  onClick={() => setShowAuthDialog(true)}
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  Sign In
                </Button>
              )}
            </SidebarFooter>
          </Sidebar>

          {/* Mobile Navigation */}
          <MobileBottomNav />

          {/* Main Content */}
          <SidebarInset className="flex-1 overflow-auto">
            <div className="flex-1">
              {children}
            </div>
          </SidebarInset>
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
      </SidebarProvider>
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

function ProfileDropdown({
  displayName,
  user,
  emailUser,
  handleSignOut,
  copied,
  onCopyAddress,
}: {
  displayName: string;
  user: WalletUser | null;
  emailUser: { email: string; profile: any } | null;
  handleSignOut: () => void;
  copied: boolean;
  onCopyAddress: (address: string, e?: React.MouseEvent | React.KeyboardEvent) => void;
}) {
  const displayAddress = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : emailUser?.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10 py-2 h-10 md:py-3 md:h-14 w-full justify-start text-left">
          <Avatar className="w-6 h-6 md:w-8 md:h-8">
            <AvatarImage src={emailUser?.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-[#111111] border border-[#282828] text-white text-xs md:text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <div className="font-semibold text-white text-base truncate">{displayName}</div>
            <div className="flex items-center gap-1 text-xs text-gray-400 truncate">
              {displayAddress}
              {user?.walletAddress && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => onCopyAddress(user.walletAddress, e)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCopyAddress(user.walletAddress, e);
                    }
                  }}
                  className="ml-1 p-1 rounded hover:bg-white/10 focus:outline-none cursor-pointer"
                  title="Copy wallet address"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-emerald-400" />
                  )}
                </span>
              )}
            </div>
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 md:w-64 border-[#282828] bg-[#111111] p-0">
        <div className="px-0 py-1.5 text-left">
          <p className="text-sm font-medium text-white pl-4">{displayName}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400 pl-4">
            {displayAddress}
            {user?.walletAddress && (
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => onCopyAddress(user.walletAddress, e)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCopyAddress(user.walletAddress, e);
                  }
                }}
                className="ml-1 p-1 rounded hover:bg-white/10 focus:outline-none cursor-pointer"
                title="Copy wallet address"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-emerald-400" />
                )}
              </span>
            )}
          </div>
        </div>
        <DropdownMenuSeparator className="bg-[#282828]" />
        <DropdownMenuItem asChild className="hover:bg-[#161616] hover:text-white text-left pl-4">
          <a href="/profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#282828]" />
        <DropdownMenuItem asChild className="hover:bg-[#161616] hover:text-white text-left pl-4">
          <a href="/register-project">
            <Building2 className="w-4 h-4 mr-2" />
            Register Project
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300 text-left pl-4"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
