"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Wallet, Copy, LogOut, AlertCircle, Edit, Save, X } from "lucide-react"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import AvatarUpload from "@/components/avatar-upload"
import { supabase } from "@/lib/supabase"

interface WalletConnectProps {
  onConnect?: (user: WalletUser) => void
  onDisconnect?: () => void
}

export default function WalletConnect({ onConnect, onDisconnect }: WalletConnectProps) {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editUsername, setEditUsername] = useState("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = walletAuth.onAuthStateChange((user) => {
      setUser(user)
      if (user) {
        onConnect?.(user)
      } else {
        onDisconnect?.()
      }
    })

    return unsubscribe
  }, [onConnect, onDisconnect])

  const connectWallet = async () => {
    setIsConnecting(true)
    setError(null)

    try {
      await walletAuth.connectWallet()
    } catch (error: any) {
      setError(error.message || "Failed to connect wallet")
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    await walletAuth.disconnectWallet()
  }

  const copyAddress = () => {
    if (user) {
      navigator.clipboard.writeText(user.walletAddress)
    }
  }

  const startEditing = () => {
    setIsEditing(true)
    setEditUsername(user?.username || "")
  }

  const saveUsername = async () => {
    if (!user || !editUsername.trim()) return

    try {
      await walletAuth.updateProfile({ username: editUsername.trim() })
      setIsEditing(false)
    } catch (error: any) {
      setError(error.message || "Failed to update username")
    }
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditUsername("")
  }

  if (user) {
    return (
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <AvatarUpload
                onAvatarUploaded={async (url) => {
                  try {
                    // Update avatar in database
                    await supabase
                      .from("users")
                      .update({ avatar_url: url })
                      .eq("wallet_address", user.walletAddress.toLowerCase())

                    // Update local user state
                    await walletAuth.updateProfile({ avatar: url })
                  } catch (error) {
                    console.error("Failed to update avatar:", error)
                    setError("Failed to update avatar")
                  }
                }}
                currentAvatar={user.avatar}
                userId={user.walletAddress}
                size="md"
              />
              <div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <Input
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="h-6 text-sm bg-white/10 border-white/20 text-white"
                        placeholder="Enter username"
                      />
                      <Button size="sm" variant="ghost" onClick={saveUsername} className="h-6 w-6 p-0">
                        <Save className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={cancelEditing} className="h-6 w-6 p-0">
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-white font-semibold">{user.username || "Anonymous"}</p>
                      <Button size="sm" variant="ghost" onClick={startEditing} className="h-4 w-4 p-0">
                        <Edit className="w-3 h-3" />
                      </Button>
                    </>
                  )}
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">{user.role}</Badge>
                </div>
                <p className="text-gray-400 text-sm font-mono">
                  {user.walletAddress.slice(0, 6)}...{user.walletAddress.slice(-4)}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={copyAddress}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Copy className="w-3 h-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={disconnectWallet}
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <LogOut className="w-3 h-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 pt-3 border-t border-white/10 text-center">
            <div>
              <p className="text-yellow-400 font-bold text-sm">{user.totalXP}</p>
              <p className="text-gray-400 text-xs">XP</p>
            </div>
            <div>
              <p className="text-blue-400 font-bold text-sm">L{user.level}</p>
              <p className="text-gray-400 text-xs">Level</p>
            </div>
            <div>
              <p className="text-green-400 font-bold text-sm">#{user.rank || "---"}</p>
              <p className="text-gray-400 text-xs">Rank</p>
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-white flex items-center justify-center gap-2">
          <Wallet className="w-5 h-5" />
          Connect Wallet
        </CardTitle>
        <CardDescription className="text-gray-300">
          Connect your Web3 wallet to start participating in quests
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          onClick={connectWallet}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
        >
          {isConnecting ? (
            "Connecting..."
          ) : (
            <>
              <Wallet className="w-4 h-4 mr-2" />
              Connect MetaMask
            </>
          )}
        </Button>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            disabled={isConnecting}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
          >
            WalletConnect
          </Button>
          <Button
            variant="outline"
            disabled={isConnecting}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 text-sm"
          >
            Coinbase
          </Button>
        </div>

        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 mt-4">
          <AlertCircle className="w-3 h-3" />
          <span>Make sure you have MetaMask installed</span>
        </div>
      </CardContent>
    </Card>
  )
}
