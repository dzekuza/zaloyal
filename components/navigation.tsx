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
import { User, LogOut, Settings, Trophy, Zap, Building2, Home, BarChart3, Users, Menu, X } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"

interface NavigationProps {
  onAuthClick: () => void
}

export default function Navigation({ onAuthClick }: NavigationProps) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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
    <nav className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white">Web3Quest</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
              <Home className="w-4 h-4" />
              Projects
            </Link>
            <Link
              href="/dashboard"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </Link>
            <Link
              href="/leaderboard"
              className="text-gray-300 hover:text-white transition-colors flex items-center gap-2"
            >
              <Trophy className="w-4 h-4" />
              Leaderboard
            </Link>
          </div>

          {/* User Section */}
          <div className="flex items-center space-x-4">
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
                        <AvatarImage src={user?.avatar || emailUser?.profile?.avatar_url} />
                        <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                          {displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="hidden sm:block text-left">
                        <div className="text-white text-sm font-medium">{displayName}</div>
                        <div className="text-gray-400 text-xs">
                          {displayAddress?.slice(0, 6)}...{displayAddress?.slice(-4)}
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="hidden sm:block bg-green-500/20 text-green-400 border-green-500/30"
                      >
                        {user?.role || emailUser?.profile?.role || "participant"}
                      </Badge>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-800 border-slate-700">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-white">{displayName}</p>
                      <p className="text-xs text-gray-400">{displayAddress}</p>
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

                    <DropdownMenuItem className="text-white hover:bg-slate-700">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-slate-700">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>

                    {(user?.role === "participant" || emailUser?.profile?.role === "participant") && (
                      <>
                        <DropdownMenuSeparator className="bg-slate-700" />
                        <DropdownMenuItem asChild className="text-white hover:bg-slate-700">
                          <Link href="/register-project">
                            <Building2 className="w-4 h-4 mr-2" />
                            Register Project
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator className="bg-slate-700" />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      className="text-red-400 hover:bg-slate-700 hover:text-red-300"
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

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-white"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-white/10">
            <div className="space-y-2">
              <Link
                href="/"
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Home className="w-4 h-4 inline mr-2" />
                Projects
              </Link>
              <Link
                href="/dashboard"
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <BarChart3 className="w-4 h-4 inline mr-2" />
                Dashboard
              </Link>
              <Link
                href="/leaderboard"
                className="block px-3 py-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Trophy className="w-4 h-4 inline mr-2" />
                Leaderboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
