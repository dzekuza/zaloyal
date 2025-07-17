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
import { User, LogOut, Trophy, Zap, Building2, Home, BarChart3, Users, Menu, X, Search, Copy, Check } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import Image from "next/image";

interface NavigationProps {
  onAuthClick: () => void
}

export default function Navigation({ onAuthClick }: NavigationProps) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setUser(user)
      setLoading(false)
    })

    // Check for email user
    const checkEmailAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()

        setEmailUser({ ...user, profile })
      }
      setLoading(false)
    }

    checkEmailAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        setEmailUser(null)
        setLoading(false)
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

  const currentUser = user || emailUser
  const displayName = user?.username || emailUser?.profile?.username || "User"
  const userStats = {
    xp: user?.totalXP || emailUser?.profile?.total_xp || 0,
    level: user?.level || emailUser?.profile?.level || 1,
    rank: user?.rank || emailUser?.profile?.rank || "---",
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchTerm.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
      setMobileMenuOpen(false)
    }
  }

  const handleCopyAddress = async (address: string) => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch (error) {
      console.error('Failed to copy address:', error)
    }
  }

  // Only render sign-in/profile button after loading is false
  return (
    <>
      {/* Mobile Top Navigation */}
      <div className="md:hidden fixed top-0 left-0 w-full z-50 flex items-center justify-between bg-[#181818]/80 backdrop-blur-md border-b-2 border-[#282828] px-4 h-16">
        <Image src="/belinklogo.svg" alt="Belink Logo" className="h-6 w-auto" width={24} height={24} />
        {!loading && !currentUser && (
          <Button
            onClick={onAuthClick}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 text-sm"
          >
            Sign In
          </Button>
        )}
        {!loading && currentUser && (
          <ProfileDropdown
            displayName={displayName}
            user={user}
            emailUser={emailUser}
            userStats={userStats}
            handleSignOut={handleSignOut}
            copied={copied}
            onCopyAddress={handleCopyAddress}
          />
        )}
      </div>

      {/* Spacer for mobile top navigation */}
      <div className="md:hidden h-16 w-full"></div>

      {/* Main Navigation (desktop and mobile) */}
      <nav className="hidden md:block sticky top-0 z-50 border-b border-[#282828] bg-[#111111]/80 backdrop-blur-md">
        <div className="px-4">
          <div className="flex items-center justify-between h-16">
            {/* Left: Search bar */}
            <div className="flex-1 max-w-md">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search projects or quests..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              </form>
            </div>

            {/* Right: Profile/User and Hamburger */}
            <div className="flex items-center gap-4">
              {!loading && (currentUser ? (
                <ProfileDropdown
                  displayName={displayName}
                  user={user}
                  emailUser={emailUser}
                  userStats={userStats}
                  handleSignOut={handleSignOut}
                  copied={copied}
                  onCopyAddress={handleCopyAddress}
                />
              ) : (
                <Button
                  onClick={onAuthClick}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                >
                  Sign In
                </Button>
              ))}

              <div className="flex md:hidden items-center gap-2 ml-auto">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                  {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Mobile/Tablet Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden fixed top-0 left-0 w-full h-full bg-slate-900/95 z-50 flex flex-col p-6 gap-6 animate-in fade-in">
              <div className="flex justify-end">
                <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                  <X className="w-6 h-6" />
                </Button>
              </div>
              <nav className="flex flex-col gap-4 mt-4">
                <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#161616] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Home className="w-4 h-4" /> Projects
                </Link>
                <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#161616] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <BarChart3 className="w-4 h-4" /> Dashboard
                </Link>
                <Link href="/leaderboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-[#161616] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                  <Trophy className="w-4 h-4" /> Leaderboard
                </Link>
                <form onSubmit={handleSearch} className="relative flex items-center w-full mt-4">
                  <input
                    type="text"
                    placeholder="Search projects or quests..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                </form>
              </nav>
            </div>
          )}
        </div>
      </nav>
    </>
  )
}

function ProfileDropdown({
  displayName,
  user,
  emailUser,
  userStats,
  handleSignOut,
  copied,
  onCopyAddress,
}: {
  displayName: string;
  user: WalletUser | null;
  emailUser: any;
  userStats: { xp: number; level: number; rank: string };
  handleSignOut: () => void;
  copied: boolean;
  onCopyAddress: (address: string) => void;
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
                  onClick={() => onCopyAddress(user.walletAddress)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onCopyAddress(user.walletAddress);
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
                onClick={() => onCopyAddress(user.walletAddress)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onCopyAddress(user.walletAddress);
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
