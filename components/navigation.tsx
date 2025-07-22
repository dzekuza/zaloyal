"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Trophy, Building2, Home, BarChart3, Users, Copy, Check, Info } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import OnboardingAlertBar from "@/components/onboarding-alert-bar";

interface NavigationProps {
  onAuthClick: () => void
}

export default function Navigation({ onAuthClick }: NavigationProps) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<{ email: string; profile: any } | null>(null)
  const [copied, setCopied] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false);
  const router = useRouter()
  const pathname = usePathname();
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

  const handleSignOut = async () => {
    if (user) {
      await walletAuth.disconnectWallet()
    }
    if (emailUser) {
      await supabase.auth.signOut()
      window.location.reload()
    }
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

  // Only render sign-in/profile button after loading is false
  return (
    <>
      {/* Sidebar Navigation */}
      <div className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-full md:w-64 bg-[#111111]/80 backdrop-blur-md border-r border-[#282828] z-40">
        <div className="flex items-center justify-center py-6">
          <Link href="/">
            <Image src="/belinklogo.svg" alt="Belink Logo" width={40} height={40} className="h-10 w-auto" priority />
          </Link>
        </div>
        <nav className="flex flex-col flex-1 px-4 py-6">
          <Link href="/" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/" ? "text-green-500" : "text-gray-300"}`}> <Home className="w-4 h-4" /> Home </Link>
          <Link href="/project" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname.startsWith("/project") ? "text-green-500" : "text-gray-300"}`}> <Users className="w-4 h-4" /> My Projects </Link>
          <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/dashboard" ? "text-green-500" : "text-gray-300"}`}> <BarChart3 className="w-4 h-4" /> Dashboard </Link>
          <Link href="/leaderboard" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/leaderboard" ? "text-green-500" : "text-gray-300"}`}> <Trophy className="w-4 h-4" /> Leaderboard </Link>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-green-500 focus:outline-none mt-2"
            onClick={() => setShowOnboarding(true)}
          >
            <Info className="w-4 h-4" /> Setup Guide
          </button>
        </nav>
        <div className="px-4 pb-6">
          <ProfileDropdown
            displayName={displayName}
            user={user}
            emailUser={emailUser}
            handleSignOut={handleSignOut}
            copied={copied}
            onCopyAddress={handleCopyAddress}
          />
        </div>
      </div>
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
    </>
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
        <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10 py-2 h-10 md:py-3 md:h-14">
          <Avatar className="w-6 h-6 md:w-8 md:h-8">
            <AvatarImage src={emailUser?.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-[#111111] border border-[#282828] text-white text-xs md:text-sm">
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden sm:block text-left">
            <div className="text-white text-sm font-medium">{displayName}</div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
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
      <DropdownMenuContent align="end" className="w-56 md:w-64 border-[#282828] bg-[#111111]">
        <div className="px-2 py-1.5">
          <p className="text-sm font-medium text-white">{displayName}</p>
          <div className="flex items-center gap-1 text-xs text-gray-400">
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
        <DropdownMenuItem asChild className="hover:bg-[#161616] hover:text-white">
          <Link href="/profile">
            <User className="w-4 h-4 mr-2" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#282828]" />
        <DropdownMenuItem asChild className="hover:bg-[#161616] hover:text-white">
          <Link href="/register-project">
            <Building2 className="w-4 h-4 mr-2" />
            Register Project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
