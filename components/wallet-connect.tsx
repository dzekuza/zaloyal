"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, LogOut } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

// Modal UI for wallet selection
function WalletSelectModal({ onSelect, onClose }: { onSelect: (wallet: string) => void, onClose: () => void }) {
  // Detect available wallets
  const [wallets, setWallets] = useState<string[]>([]);
  useEffect(() => {
    const available: string[] = [];
    if ((window as any).solana && (window as any).solana.isPhantom) available.push('Phantom');
    if ((window as any).ethereum && (window as any).ethereum.isMetaMask) available.push('MetaMask');
    setWallets(available);
  }, []);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-[#181818] rounded-lg p-6 min-w-[300px]">
        <h2 className="text-white text-lg mb-4">Select Wallet</h2>
        {wallets.length === 0 && <div className="text-red-400 mb-4">No supported wallets found.</div>}
        <div className="flex flex-col gap-2">
          {wallets.map(wallet => (
            <Button key={wallet} className="w-full" onClick={() => onSelect(wallet)}>{wallet}</Button>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-4" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function WalletConnect({ onLinked }: { onLinked?: () => void } = {}) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLinking, setIsLinking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [showModal, setShowModal] = useState(false);

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

  // Handle wallet linking for Phantom (Solana) and MetaMask (EVM)
  const handleWalletLink = async (wallet: string) => {
    setIsLinking(true)
    setError(null)
    try {
      let walletAddress = '';
      let signature = '';
      let challenge = '';
      if (wallet === 'Phantom') {
        const provider = (window as any).solana;
        if (!provider || !provider.isPhantom) throw new Error('Phantom Wallet not found');
        await provider.connect();
        walletAddress = provider.publicKey.toString();
        challenge = `Link this wallet to your account: ${walletAddress}`;
        const encodedMessage = new TextEncoder().encode(challenge);
        const signedMessage = await provider.signMessage(encodedMessage, 'utf8');
        signature = Buffer.from(signedMessage.signature).toString('base64');
      } else if (wallet === 'MetaMask') {
        const { ethers } = await import('ethers');
        if (!(window as any).ethereum) throw new Error('MetaMask not found');
        const provider = new ethers.BrowserProvider((window as any).ethereum);
        const signer = await provider.getSigner();
        walletAddress = await signer.getAddress();
        challenge = `Link this wallet to your account: ${walletAddress}`;
        signature = await signer.signMessage(challenge);
      } else {
        throw new Error('Unsupported wallet');
      }
      // Get userId from Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      if (!userId) throw new Error('User not authenticated');
      // Send to backend for verification and linking
      const res = await fetch('/api/link-wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress, signature, challenge, userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      setWalletAddress(walletAddress);
      setShowModal(false);
      if (onLinked) onLinked();
    } catch (e: any) {
      setError(e.message || 'Failed to link wallet');
    } finally {
      setIsLinking(false);
    }
  };

  const handleDisconnectWallet = async () => {
    setWalletAddress(null)
    if (onLinked) onLinked()
  }

  if (isAuthenticated === false) {
    return (
      <Card className="bg-[#111111] rounded-lg">
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
              onClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
            >
              Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-[#111111] rounded-lg">
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
            <Badge className="bg-green-600 text-white text-xs">Linked</Badge>
            <Button
              onClick={handleDisconnectWallet}
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
            >
              <LogOut className="w-4 h-4 mr-1" /> Disconnect Wallet
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowModal(true)}
            disabled={isLinking}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
          >
            {isLinking ? "Linking..." : "Link Wallet"}
          </Button>
        )}
        {error && (
          <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-xs">{error}</div>
        )}
        {showModal && (
          <WalletSelectModal
            onSelect={handleWalletLink}
            onClose={() => setShowModal(false)}
          />
        )}
      </CardContent>
    </Card>
  )
}
