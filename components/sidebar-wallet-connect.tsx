"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Wallet, User, LogOut, Building2, Mail } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import EmailAuth from "@/components/email-auth"
import Link from "next/link"

export default function SidebarWalletConnect() {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [showAuthDialog, setShowAuthDialog] = useState(false)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    const unsubscribe = walletAuth.onAuthStateChange(setUser)
    return unsubscribe
  }, [])

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      await walletAuth.connectWallet()
      setShowAuthDialog(false)
    } catch (error: any) {
      console.error("Connection failed:", error)
      setAuthError(error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    await walletAuth.disconnectWallet()
  }

  const handleEmailAuthSuccess = (authUser: any) => {
    console.log("Email auth success:", authUser)
    setShowAuthDialog(false)
    // Handle email authentication success
    // You might want to update the user state here
  }

  const handleEmailAuthError = (error: string) => {
    setAuthError(error)
  }

  if (user) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.username || "Connected"}</p>
            <p className="text-gray-400 text-xs">
              {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div>
            <p className="text-yellow-400 font-bold">{user.totalXP}</p>
            <p className="text-gray-400">XP</p>
          </div>
          <div>
            <p className="text-blue-400 font-bold">L{user.level}</p>
            <p className="text-gray-400">Level</p>
          </div>
          <div>
            <p className="text-green-400 font-bold">#{user.rank || "---"}</p>
            <p className="text-gray-400">Rank</p>
          </div>
        </div>

        <Button
          onClick={disconnectWallet}
          variant="outline"
          size="sm"
          className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20 text-xs"
        >
          <LogOut className="w-3 h-3 mr-1" />
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogTrigger asChild>
          <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">
            <User className="w-4 h-4 mr-2" />
            Sign In
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Authentication</DialogTitle>
            <DialogDescription className="text-gray-300">Sign in or register with your email</DialogDescription>
          </DialogHeader>

          {/* Only show email authentication */}
          <EmailAuth onSuccess={handleEmailAuthSuccess} onError={handleEmailAuthError} />

          {authError && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {authError}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
