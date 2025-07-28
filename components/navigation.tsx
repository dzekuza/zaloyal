"use client"

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import { LogOut, User, Settings, Home, Search, Trophy, Plus, Users, BarChart3, Info, Copy, Check, Building2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AuthDialog from './auth-dialog'
import { useAuth } from '@/components/auth-provider-wrapper'

// Safe auth hook with fallback
function useSafeAuth() {
  try {
    return useAuth()
  } catch (error) {
    console.warn('Auth context not available:', error)
    return { 
      user: null, 
      loading: false, 
      signOut: async () => {},
      signInWithX: async () => {},
      signInWithDiscord: async () => {}
    }
  }
}

export default function Navigation() {
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [copied, setCopied] = useState(false)
  const pathname = usePathname()
  const { toast } = useToast()

  // Use safe auth hook
  const { user, loading, signOut } = useSafeAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      })
    } catch (error) {
      console.error('Sign out error:', error)
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      })
    }
  }

  const displayName = user?.username || user?.email || "User"

  const handleCopyAddress = async (address: string, e?: React.MouseEvent | React.KeyboardEvent) => {
    if (e) {
      e.stopPropagation()
      e.preventDefault()
    }
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Wallet address copied to clipboard.",
        duration: 1200,
      })
      setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  // Only render sign-in/profile button after loading is false
  if (loading) {
    return (
      <div className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-full md:w-64 bg-[#111111]/80 backdrop-blur-md border-r border-[#282828] z-40">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full border-b-2 border-green-500 h-8 w-8"></div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Sidebar Navigation */}
      <div className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-full md:w-64 bg-[#111111]/80 backdrop-blur-md border-r border-[#282828] z-40">
        <div className="px-4 py-6">
          <Link href="/" className="flex items-center px-3 py-2">
            <Image src="/belinklogo.svg" alt="Belink Logo" width={64} height={64} className="h-16 w-16" priority />
          </Link>
        </div>
        <nav className="flex flex-col flex-1 px-4 py-6">
          <Link href="/" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/" ? "text-green-500" : "text-gray-300"}`}>
            <Home className="w-4 h-4" /> Home
          </Link>
          <Link href="/project" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname.startsWith("/project") ? "text-green-500" : "text-gray-300"}`}>
            <Users className="w-4 h-4" /> My Projects
          </Link>
          <Link href="/dashboard" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/dashboard" ? "text-green-500" : "text-gray-300"}`}>
            <BarChart3 className="w-4 h-4" /> Dashboard
          </Link>
          <Link href="/leaderboard" className={`flex items-center gap-2 px-3 py-2 rounded-md transition-colors ${pathname === "/leaderboard" ? "text-green-500" : "text-gray-300"}`}>
            <Trophy className="w-4 h-4" /> Leaderboard
          </Link>
          <button
            type="button"
            className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors text-gray-300 hover:text-green-500 focus:outline-none mt-2"
            onClick={() => setShowOnboarding(true)}
          >
            <Info className="w-4 h-4" /> Setup Guide
          </button>
        </nav>
        <div className="px-4 pb-6">
          {user ? (
            <ProfileDropdown
              displayName={displayName}
              user={user}
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
      </div>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />

      {/* Onboarding Modal */}
      <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
        <DialogContent className="max-w-md bg-[#111111] border-[#282828]">
          <DialogHeader>
            <DialogTitle className="text-white">Setup Guide</DialogTitle>
          </DialogHeader>
          <div className="text-gray-300 text-center py-4">
            Follow the steps in the onboarding bar at the bottom right to get started.
          </div>
          <Button className="mx-auto mt-2 bg-green-600 hover:bg-green-700" onClick={() => setShowOnboarding(false)}>
            Got it
          </Button>
        </DialogContent>
      </Dialog>
    </>
  )
}

function ProfileDropdown({
  displayName,
  user,
  handleSignOut,
  copied,
  onCopyAddress,
}: {
  displayName: string
  user: any
  handleSignOut: () => void
  copied: boolean
  onCopyAddress: (address: string, e?: React.MouseEvent | React.KeyboardEvent) => void
}) {
  const displayAddress = user?.walletAddress
    ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
    : user?.email

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10 py-2 h-10 md:py-3 md:h-14">
          <Avatar className="w-6 h-6 md:w-8 md:h-8">
            <AvatarImage src={user?.avatar_url || ""} />
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
                      e.preventDefault()
                      onCopyAddress(user.walletAddress, e)
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
      <DropdownMenuContent align="end" side="bottom" sideOffset={8} className="w-56 md:w-64 border-[#282828] bg-[#111111] text-white">
        <div className="px-3 py-2">
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
                    e.preventDefault()
                    onCopyAddress(user.walletAddress, e)
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
        <DropdownMenuItem asChild className="text-white hover:bg-[#1a1a1a] hover:text-white focus:bg-[#1a1a1a] focus:text-white">
          <Link href="/profile" className="flex items-center">
            <User className="w-4 h-4 mr-2 text-gray-300" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[#282828]" />
        <DropdownMenuItem asChild className="text-white hover:bg-[#1a1a1a] hover:text-white focus:bg-[#1a1a1a] focus:text-white">
          <Link href="/register-project" className="flex items-center">
            <Building2 className="w-4 h-4 mr-2 text-gray-300" />
            Register Project
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 focus:bg-red-500/10 focus:text-red-300"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
