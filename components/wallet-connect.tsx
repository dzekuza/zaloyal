"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, Copy, LogOut, Edit, Save, X } from "lucide-react"
import { linkWalletToProfile, walletAuth } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

export default function WalletConnect({ onLinked }: { onLinked?: () => void } = {}) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  useEffect(() => {
    // Optionally, fetch the linked wallet address from the user profile
    const fetchWallet = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
      if (user) {
        const { data: profile } = await supabase.from("users").select("wallet_address").eq("id", user.id).single()
        setWalletAddress(profile?.wallet_address || null)
      }
    }
    fetchWallet()
  }, [])

  const handleLinkWallet = async () => {
    setIsLinking(true)
    setError(null)
    try {
      const address = await linkWalletToProfile()
      setWalletAddress(address)
      if (onLinked) onLinked()
    } catch (e: any) {
      setError(e.message || "Failed to link wallet")
    } finally {
      setIsLinking(false)
    }
  }

  const handleDisconnectWallet = async () => {
    await walletAuth.disconnectWallet()
    setWalletAddress(null)
    if (onLinked) onLinked()
  }

  if (isAuthenticated === false) {
    return (
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-white flex items-center justify-center gap-2">
            <Wallet className="w-5 h-5" />
            Wallet Linking
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-red-400 mb-4">You must be signed in to link your wallet.</p>
            <Button
              onClick={() => router.push("/login")}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
            >
              Go to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5" />
          Wallet Linking
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {walletAddress ? (
          <div className="text-center">
            <p className="text-gray-300 mb-2">Linked Wallet Address:</p>
            <p className="text-white font-mono mb-2">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</p>
            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Linked</Badge>
            <Button
              onClick={handleDisconnectWallet}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white border-0"
            >
              <LogOut className="w-4 h-4 mr-1" /> Disconnect Wallet
            </Button>
          </div>
        ) : (
          <Button
            onClick={handleLinkWallet}
            disabled={isLinking}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
          >
            {isLinking ? "Linking..." : "Link Wallet"}
          </Button>
        )}
        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
        )}
      </CardContent>
    </Card>
  )
}
