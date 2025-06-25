"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function ProfilePage() {
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  // Editable fields
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [bio, setBio] = useState("")
  const [socialLinks, setSocialLinks] = useState<any>({})

  useEffect(() => {
    // Wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user)
      if (user) fetchProfile(user, null)
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
        if (profile) fetchProfile(null, profile)
      }
      setLoading(false)
    }
    checkEmailAuth()
    return () => unsubscribeWallet()
  }, [])

  const fetchProfile = async (walletUser: WalletUser | null, emailProfile: any | null) => {
    setLoading(true)
    try {
      let userProfile = null
      if (walletUser) {
        const { data } = await supabase.from("users").select("*").eq("wallet_address", walletUser.walletAddress.toLowerCase()).single()
        userProfile = data
      } else if (emailProfile) {
        userProfile = emailProfile
      }
      if (userProfile) {
        setProfile(userProfile)
        setUsername(userProfile.username || "")
        setAvatarUrl(userProfile.avatar_url || "")
        setBio(userProfile.bio || "")
        setSocialLinks(userProfile.social_links || {})
      }
    } catch (e) {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccess("")
    setError("")
    try {
      let userId = null
      if (walletUser) {
        const { data } = await supabase.from("users").select("id").eq("wallet_address", walletUser.walletAddress.toLowerCase()).single()
        userId = data?.id
      } else if (emailUser?.profile) {
        userId = emailUser.profile.id
      }
      if (!userId) throw new Error("User not found")
      const { error: updateError } = await supabase.from("users").update({
        username,
        avatar_url: avatarUrl,
        bio,
        social_links: socialLinks,
      }).eq("id", userId)
      if (updateError) throw updateError
      setSuccess("Profile updated!")
    } catch (e: any) {
      setError(e.message || "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev: any) => ({ ...prev, [platform]: value }))
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-white text-xl">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center py-12">
      <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-white">Edit Profile</CardTitle>
          <CardDescription className="text-gray-300">Manage your profile information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
          {success && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}
          <div className="flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
              <div>
                <label className="text-white block mb-1">Username</label>
                <Input value={username} onChange={e => setUsername(e.target.value)} className="bg-white/10 border-white/20 text-white" />
              </div>
              <div>
                <label className="text-white block mb-1">Bio</label>
                <Textarea value={bio} onChange={e => setBio(e.target.value)} className="bg-white/10 border-white/20 text-white" rows={3} />
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-white block mb-2">Social Links</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                placeholder="Twitter URL"
                value={socialLinks.twitter || ""}
                onChange={e => handleSocialLinkChange("twitter", e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Telegram URL"
                value={socialLinks.telegram || ""}
                onChange={e => handleSocialLinkChange("telegram", e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="Discord URL"
                value={socialLinks.discord || ""}
                onChange={e => handleSocialLinkChange("discord", e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
              <Input
                placeholder="GitHub URL"
                value={socialLinks.github || ""}
                onChange={e => handleSocialLinkChange("github", e.target.value)}
                className="bg-white/10 border-white/20 text-white"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 