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
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { User, LogOut, Settings, Trophy, Zap, Building2, Home, BarChart3, Users, Menu, X, Search, Wallet, Copy, Check } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"
import { SidebarTrigger } from "@/components/ui/sidebar"

interface NavigationProps {
  onAuthClick: () => void
}

export default function Navigation({ onAuthClick }: NavigationProps) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange(setUser)

    // Check for email user
    const checkEmailAuth = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()

        setEmailUser({ ...user, profile })
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

  const currentUser = user || emailUser
  const displayName = user?.username || emailUser?.profile?.username || "User"
  const displayAddress = user?.walletAddress || emailUser?.email
  const userStats = {
    xp: user?.totalXP || emailUser?.profile?.total_xp || 0,
    level: user?.level || emailUser?.profile?.level || 1,
    rank: user?.rank || emailUser?.profile?.rank || "---",
  }

  return (
    <nav className="hidden md:block sticky top-0 z-50 bg-[#094a35] backdrop-blur-sm border-b border-white/10 py-2 md:py-3">
      <div className=" px-4">
        <div className="items-center h-auto md:h-16 gap-auto grid grid-cols-2 justify-end">
          {/* Left: Search bar */}
          <div className="hidden md:inline-grid justify-self-start">
            <form
              onSubmit={e => {
                e.preventDefault();
                if (searchTerm.trim()) router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
              }}
              className="relative flex items-center w-full max-w-md mx-auto"
            >
              <input
                type="text"
                placeholder="Search projects or quests..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 pr-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            </form>
          </div>
          {/* Right: Profile/User and Hamburger */}
          <div className="flex items-center justify-end gap-4 w-full col-span-2 md:col-span-1">
            {currentUser ? (
              <>
                {/* User Stats - Desktop */}
                <div className="hidden lg:flex items-center space-x-4 text-sm">
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Zap className="w-4 h-4" />
                    <span className="font-semibold">{userStats.xp}</span>
                    <span className="text-gray-400">XP</span>
                  </div>
                  <div className="flex items-center gap-1 text-blue-400">
                    <Trophy className="w-4 h-4" />
                    <span className="font-semibold">L{userStats.level}</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-400">
                    <Users className="w-4 h-4" />
                    <span className="font-semibold">#{userStats.rank}</span>
                  </div>
                </div>

                {/* User Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="flex items-center space-x-2 hover:bg-white/10">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={emailUser?.profile?.avatar_url || ""} />
                        <AvatarFallback className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:block text-left">
                        <div className="text-white text-sm font-medium">{displayName}</div>
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {user?.walletAddress
                            ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                            : emailUser?.email}
                          {user?.walletAddress && (
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={async (e) => {
                                e.preventDefault();
                                await navigator.clipboard.writeText(user.walletAddress);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1200);
                              }}
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  await navigator.clipboard.writeText(user.walletAddress);
                                  setCopied(true);
                                  setTimeout(() => setCopied(false), 1200);
                                }
                              }}
                              className="ml-1 p-1 rounded hover:bg-white/10 focus:outline-none cursor-pointer"
                              title="Copy wallet address"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </span>
                          )}
                        </div>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 border-slate-700 bg-[#0b4b34]">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-white">{displayName}</p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {user?.walletAddress
                          ? `${user.walletAddress.slice(0, 6)}...${user.walletAddress.slice(-4)}`
                          : emailUser?.email}
                        {user?.walletAddress && (
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={async (e) => {
                              e.preventDefault();
                              await navigator.clipboard.writeText(user.walletAddress);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 1200);
                            }}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                await navigator.clipboard.writeText(user.walletAddress);
                                setCopied(true);
                                setTimeout(() => setCopied(false), 1200);
                              }
                            }}
                            className="ml-1 p-1 rounded hover:bg-white/10 focus:outline-none cursor-pointer"
                            title="Copy wallet address"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </span>
                        )}
                      </div>
                      {/* Wallet connect/disconnect button (moved here) */}
                      {user ? (
                        <Button variant="ghost" className="w-full mt-2 flex items-center justify-start px-2 py-1 text-sm text-red-500 hover:bg-red-500/10" onClick={async () => { await walletAuth.disconnectWallet(); window.location.reload(); }}>
                          <LogOut className="w-4 h-4 mr-2" />
                          Disconnect Wallet
                        </Button>
                      ) : (
                        <Button variant="ghost" className="w-full mt-2 flex items-center justify-start px-2 py-1 text-sm text-blue-500 hover:bg-blue-500/10" onClick={async () => { await walletAuth.connectWallet(); window.location.reload(); }}>
                          <Wallet className="w-4 h-4 mr-2" />
                          Connect Wallet
                        </Button>
                      )}
                    </div>
                    <DropdownMenuSeparator className="bg-slate-700" />

                    {/* Mobile Stats */}
                    <div className="lg:hidden px-2 py-2">
                      <div className="grid grid-cols-3 gap-2 text-center text-xs">
                        <div>
                          <div className="text-yellow-400 font-bold">{userStats.xp}</div>
                          <div className="text-gray-400">XP</div>
                        </div>
                        <div>
                          <div className="text-blue-400 font-bold">L{userStats.level}</div>
                          <div className="text-gray-400">Level</div>
                        </div>
                        <div>
                          <div className="text-green-400 font-bold">#{userStats.rank}</div>
                          <div className="text-gray-400">Rank</div>
                        </div>
                      </div>
                    </div>
                    <DropdownMenuSeparator className="lg:hidden bg-slate-700" />

                    <DropdownMenuItem asChild>
                      <Link href="/profile">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Link>
                    </DropdownMenuItem>

                    {/* Always show Register Project link for authenticated users */}
                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem asChild>
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
              </>
            ) : (
              <Button
                onClick={onAuthClick}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              >
                Sign In
              </Button>
            )}

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
              <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <Home className="w-4 h-4" /> Projects
              </Link>
              <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <BarChart3 className="w-4 h-4" /> Dashboard
              </Link>
              <Link href="/leaderboard" className="flex items-center gap-2 px-3 py-2 rounded-md text-gray-300 hover:text-white hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                <Trophy className="w-4 h-4" /> Leaderboard
              </Link>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (searchTerm.trim()) {
                    setMobileMenuOpen(false);
                    router.push(`/search?q=${encodeURIComponent(searchTerm.trim())}`)
                  }
                }}
                className="relative flex items-center w-full mt-4"
              >
                <input
                  type="text"
                  placeholder="Search projects or quests..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-10 pr-3 py-2 rounded-md bg-white/10 border border-white/20 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              </form>
            </nav>
          </div>
        )}
      </div>
    </nav>
  )
}
