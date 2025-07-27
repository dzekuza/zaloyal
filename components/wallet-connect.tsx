"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider-wrapper"
import EmailAuth from "@/components/email-auth"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Copy, Check, ExternalLink, Wallet, LogOut } from "lucide-react"

// Simple icon components to avoid react-icons import issues
const DiscordIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .078-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
)

const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)

export default function WalletConnect() {
  const [user, setUser] = useState<WalletUser | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [authError, setAuthError] = useState("")

  useEffect(() => {
    const unsubscribe = walletAuth.onAuthStateChange(setUser)
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setIsAuthenticated(!!user)
    }
    checkAuth()
    return unsubscribe
  }, [])

  const connectWallet = async () => {
    setIsConnecting(true)
    try {
      // Use web3 payments integration for wallet connection
      await walletAuth.linkWalletToCurrentUser()
    } catch (error: any) {
      setAuthError(error.message)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnectWallet = async () => {
    await walletAuth.disconnectWallet()
  }

  const handleTwitterLogin = async () => {
    try {
      // Use Supabase Auth for X authentication (not direct OAuth)
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          scopes: 'tweet.read users.read follows.read offline.access'
        }
      });
      
      if (error) {
        console.error('X linking error:', error);
        setAuthError(error.message);
        return;
      }

      // The redirect will handle the OAuth flow
      if (data?.url) {
        window.location.href = data.url;
      } else {
        setAuthError('No OAuth URL received from Supabase');
      }
    } catch (error: any) {
      console.error('X linking error:', error);
      setAuthError(error.message || 'Failed to initiate X authentication');
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
          <Wallet className="mr-2 h-4 w-4" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Connect Your Account</DialogTitle>
          <DialogDescription>
            Choose your preferred authentication method. Email accounts can link wallets for additional functionality.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 pb-6">
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email & Social</TabsTrigger>
              <TabsTrigger value="wallet">Wallet Only</TabsTrigger>
            </TabsList>
            <TabsContent value="email" className="space-y-4">
              <div className="space-y-4">
                <EmailAuth 
                  onSuccess={(user) => {
                    // Handle successful email authentication
                    setAuthError("");
                    console.log('Email auth success:', user);
                  }}
                  onError={(error) => {
                    setAuthError(error);
                  }}
                />
                <div className="flex flex-col space-y-2">
                  <Button 
                    onClick={handleTwitterLogin}
                    variant="outline" 
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <XIcon className="mr-2 h-4 w-4" />
                    Continue with X (Twitter)
                  </Button>
                  <Button 
                    onClick={() => window.location.href = '/api/connect-discord'}
                    variant="outline" 
                    className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <DiscordIcon className="mr-2 h-4 w-4" />
                    Continue with Discord
                  </Button>
                </div>
                {isAuthenticated && (
                  <div className="pt-4">
                    <Button 
                      onClick={connectWallet}
                      disabled={isConnecting}
                      className="w-full"
                    >
                      <Wallet className="mr-2 h-4 w-4" />
                      {isConnecting ? "Connecting..." : "Link Wallet"}
                    </Button>
                  </div>
                )}
              </div>
            </TabsContent>
            <TabsContent value="wallet" className="space-y-4">
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  Sign in with your wallet using web3 payments integration.
                </div>
                <Button 
                  onClick={async () => {
                    setIsConnecting(true)
                    try {
                      await walletAuth.signInWithSolanaWallet()
                    } catch (error: any) {
                      setAuthError(error.message)
                    } finally {
                      setIsConnecting(false)
                    }
                  }}
                  disabled={isConnecting}
                  className="w-full"
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  {isConnecting ? "Connecting..." : "Sign in with Wallet"}
                </Button>
                {authError && (
                  <div className="text-sm text-red-500">{authError}</div>
                )}
              </div>
            </TabsContent>
          </Tabs>
          {user && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center space-x-2">
                <Wallet className="h-4 w-4" />
                <span className="text-sm">
                  {user.walletAddress.substring(0, 6)}...{user.walletAddress.substring(-4)}
                </span>
              </div>
              <Button variant="ghost" size="sm" onClick={disconnectWallet}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
