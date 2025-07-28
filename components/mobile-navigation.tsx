'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useToast } from '@/hooks/use-toast'
import { LogOut, User, Settings, Home, Search, Trophy, Plus, Users, BarChart3, Info, Copy, Check, Building2, Menu } from 'lucide-react'
import { supabase } from '@/lib/supabase'
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

export default function MobileNavigation() {
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

  // Only render after loading is false
  if (loading) {
    return (
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111]/90 backdrop-blur-md border-t border-[#282828] z-50">
        <div className="flex items-center justify-center h-16">
          <div className="animate-spin rounded-full border-b-2 border-green-500 h-6 w-6"></div>
        </div>
      </div>
    )
  }

  const navItems = [
    { href: '/', icon: Home, label: 'Home', active: pathname === '/' },
    { href: '/quest', icon: Trophy, label: 'Quests', active: pathname.startsWith('/quest') },
    { href: '/leaderboard', icon: BarChart3, label: 'Leaderboard', active: pathname === '/leaderboard' },
    { href: '/project', icon: Building2, label: 'Projects', active: pathname.startsWith('/project') },
  ]

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111111]/90 backdrop-blur-md border-t border-[#282828] z-50">
      <div className="flex items-center justify-between px-4 py-2">
        {/* Navigation Items */}
        <div className="flex items-center space-x-6">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center space-y-1 p-2 rounded-lg transition-colors ${
                  item.active
                    ? 'text-green-400 bg-green-400/10'
                    : 'text-gray-400 hover:text-white hover:bg-[#1a1a1a]'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Profile Section */}
        <div className="flex items-center space-x-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url} alt={displayName} />
                    <AvatarFallback className="bg-[#1a1a1a] text-white text-sm">
                      {displayName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-[#111111] border-[#282828]">
                <DropdownMenuLabel className="text-white font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{displayName}</p>
                    <p className="text-xs text-gray-400">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-[#282828]" />
                
                {/* Wallet Address */}
                {user.profile?.wallet_address && (
                  <>
                    <DropdownMenuItem className="text-gray-300 hover:bg-[#1a1a1a] hover:text-white cursor-pointer">
                      <div className="flex items-center justify-between w-full">
                        <span className="text-xs">Wallet</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => handleCopyAddress(user.profile.wallet_address, e)}
                          className="h-6 px-2 text-xs"
                        >
                          {copied ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-xs text-gray-500 font-mono break-all">
                      {user.profile.wallet_address}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-[#282828]" />
                  </>
                )}

                <DropdownMenuItem asChild className="text-gray-300 hover:bg-[#1a1a1a] hover:text-white">
                  <Link href="/profile" className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuItem asChild className="text-gray-300 hover:bg-[#1a1a1a] hover:text-white">
                  <Link href="/settings" className="flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-[#282828]" />
                
                <DropdownMenuItem 
                  onClick={handleSignOut}
                  className="text-red-400 hover:bg-red-400/10 hover:text-red-300 cursor-pointer"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              size="sm" 
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </div>
  )
} 