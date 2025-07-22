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

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")
  const pathname = usePathname();
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<{ email: string; profile: any } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setUser(user)
    })

    // Check for email user
    const checkEmailAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user && user.email) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ email: user.email, profile })
      }
    }

    checkEmailAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        setEmailUser(null)
      }
    })

    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

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
      setUser(null)
    }
    if (emailUser) {
      await supabase.auth.signOut()
      setEmailUser(null)
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

  return (
    <div className={inter.className + " bg-[#181818] min-h-screen"}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <Toaster />
        {/* Onboarding Alert Bar: always rendered, handles its own logic */}
        <OnboardingAlertBar />
        <SidebarProvider>
          <Sidebar variant="inset">
            <SidebarHeader>
              <div className="flex items-center justify-start py-6 pl-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/belinklogo.svg" alt="Belink Logo" className="h-8 w-auto" />
              </div>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>Platform</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {items.map((item) => (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                          asChild
                          isActive={
                            item.url === "/project"
                              ? pathname.startsWith("/project")
                              : pathname === item.url
                          }
                          className="data-[active=true]:text-green-500 data-[active=true]:bg-transparent"
                        >
                          <Link href={item.url} className="flex items-center gap-2">
                            <item.icon />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <div className="flex flex-col gap-2 p-2">
                <button
                  type="button"
                  className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-green-500 focus:outline-none mt-2"
                  onClick={() => setShowOnboarding(true)}
                >
                  <Info className="w-4 h-4" /> Setup Guide
                </button>
                {(user || emailUser) ? (
                  <ProfileDropdown
                    displayName={displayName}
                    user={user}
                    emailUser={emailUser}
                    handleSignOut={handleSignOut}
                    copied={copied}
                    onCopyAddress={handleCopyAddress}
                  />
                ) : (
                  <Button className="w-full bg-green-600 hover:bg-green-700 text-white" onClick={() => setShowAuthDialog(true)}>
                    Log In
                  </Button>
                )}
              </div>
              <div className="p-4 text-center">
                <p className="text-xs text-gray-400">Web3Quest Platform</p>
                <div className="flex justify-center gap-4 mt-2">
                  <a href="/terms" className="text-xs text-gray-400 hover:text-white underline">Terms of Service</a>
                  <a href="/privacy" className="text-xs text-gray-400 hover:text-white underline">Privacy Policy</a>
                </div>
              </div>
            </SidebarFooter>
            <SidebarRail />
          </Sidebar>
          <SidebarInset className="bg-[#181818]">
            {/* Navigation removed, logic merged into sidebar */}
            <main className="flex-1 pb-20 md:pb-0 bg-[#181818]">{children}</main>
          </SidebarInset>
        </SidebarProvider>

        {/* Auth Dialog */}
        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                <span className="sr-only">Sign In or Register</span>
              </DialogTitle>
            </DialogHeader>
            <EmailAuth onSuccess={handleEmailAuthSuccess} onError={handleEmailAuthError} />
            {authError && (
              <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
                {authError}
              </div>
            )}
          </DialogContent>
        </Dialog>
        {/* Onboarding Modal */}
        <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Setup Guide</DialogTitle>
            </DialogHeader>
            <div className="text-gray-300 text-center py-4">Follow the steps in the onboarding bar at the bottom right to get started.</div>
            <Button className="mx-auto mt-2" onClick={() => setShowOnboarding(false)}>Got it</Button>
          </DialogContent>
        </Dialog>
      </ThemeProvider>
      <MobileBottomNav />
    </div>
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
