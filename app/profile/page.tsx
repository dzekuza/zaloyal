"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import WalletConnect from "@/components/wallet-connect"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { SiDiscord, SiX } from "react-icons/si"
import AvatarUpload from "@/components/avatar-upload"

// react-icons currently returns `ReactNode`, which is incompatible with React 19's
// stricter JSX.Element return type expectations. Cast the icon components to
// a compatible functional component signature.
const DiscordIcon: React.FC<React.SVGProps<SVGSVGElement>> = SiDiscord as unknown as React.FC<React.SVGProps<SVGSVGElement>>
const XIcon: React.FC<React.SVGProps<SVGSVGElement>> = SiX as unknown as React.FC<React.SVGProps<SVGSVGElement>>

export default function ProfilePage() {
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)

  // Editable fields
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [bio, setBio] = useState("")
  const [socialLinks, setSocialLinks] = useState<any>({})

  const router = useRouter()

  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)
  const [unlinkingTwitter, setUnlinkingTwitter] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSupabaseUser(data?.user))
  }, [])
  const discordInfo = emailUser?.profile?.discord_id ? {
    id: emailUser.profile.discord_id,
    username: emailUser.profile.discord_username,
    avatar: emailUser.profile.discord_avatar_url,
  } : null

  const twitterInfo = emailUser?.profile?.twitter_id ? {
    id: emailUser.profile.twitter_id,
    username: emailUser.profile.twitter_username,
    avatar: emailUser.profile.twitter_avatar_url,
  } : null

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    // Wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      if (isMounted) setWalletUser(user)
      if (user && isMounted) setCurrentUser(user)
      if (user) fetchProfile(user, null)
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        if (isMounted) setEmailUser({ ...user, profile })
        if (isMounted) setCurrentUser({ ...user, profile })
        if (profile) fetchProfile(null, profile)
      }
      setLoading(false)
    }
    checkEmailAuth()
    return () => { isMounted = false; unsubscribeWallet() }
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
      let updateQuery = supabase.from("users").update({
        username,
        avatar_url: avatarUrl,
        bio,
        social_links: socialLinks,
      });
      if (walletUser && walletUser.walletAddress) {
        updateQuery = updateQuery.eq("wallet_address", walletUser.walletAddress.toLowerCase());
      } else if (emailUser?.profile && emailUser.profile.id) {
        updateQuery = updateQuery.eq("id", emailUser.profile.id);
      } else {
        throw new Error("User not found");
      }
      const { error: updateError } = await updateQuery;
      if (updateError) throw updateError;
      setSuccess("Profile updated!");
      window.location.reload();
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev: any) => ({ ...prev, [platform]: value }))
  }

  const handleDisconnectWallet = async () => {
    await walletAuth.disconnectWallet()
    setWalletUser(null)
    // Optionally reload the page: window.location.reload()
  }

  const handleLinkDiscord = async () => {
    const { data, error } = await supabase.auth.linkIdentity({ provider: 'discord' })
    if (!error) {
      // After linking, get Discord identity info
      const { data: identities } = await supabase.auth.getUserIdentities()
      const discordIdentity = identities?.identities?.find((identity: any) => identity.provider === 'discord')
      if (discordIdentity) {
        // Save Discord info to users table
        await supabase.from('users').update({
          discord_id: discordIdentity.id,
          discord_username: discordIdentity.identity_data?.user_name,
          discord_avatar_url: discordIdentity.identity_data?.avatar_url,
        }).eq('id', emailUser.profile.id)
        // Refetch user info
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
          setEmailUser({ ...user, profile })
        }
      }
    }
  }

  const handleUnlinkDiscord = async () => {
    setUnlinkingDiscord(true)
    try {
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
      if (!identitiesError) {
        const discordIdentity = identities.identities.find((identity: any) => identity.provider === 'discord')
        if (discordIdentity) {
          await supabase.auth.unlinkIdentity(discordIdentity)
          // Clear Discord info from users table
          await supabase.from('users').update({
            discord_id: null,
            discord_username: null,
            discord_avatar_url: null,
          }).eq('id', emailUser.profile.id)
          // Refetch user info
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
            setEmailUser({ ...user, profile })
          }
          // Force reload to ensure UI updates
          window.location.reload()
        }
      }
    } finally {
      setUnlinkingDiscord(false)
    }
  }

  const handleLinkTwitter = async () => {
    const { data, error } = await supabase.auth.linkIdentity({ provider: 'twitter' })
    if (!error) {
      // After linking, get Twitter identity info
      const { data: identities } = await supabase.auth.getUserIdentities()
      const twitterIdentity = identities?.identities?.find((identity: any) => identity.provider === 'twitter')
      if (twitterIdentity) {
        // Save Twitter info to users table
        await supabase.from('users').update({
          twitter_id: twitterIdentity.id,
          twitter_username: twitterIdentity.identity_data?.user_name,
          twitter_avatar_url: twitterIdentity.identity_data?.avatar_url,
        }).eq('id', emailUser.profile.id)
        // Refetch user info
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
          setEmailUser({ ...user, profile })
        }
      }
    }
  }

  const handleUnlinkTwitter = async () => {
    setUnlinkingTwitter(true)
    try {
      const { data: identities, error: identitiesError } = await supabase.auth.getUserIdentities()
      if (!identitiesError) {
        const twitterIdentity = identities.identities.find((identity: any) => identity.provider === 'twitter')
        if (twitterIdentity) {
          await supabase.auth.unlinkIdentity(twitterIdentity)
          // Clear Twitter info from users table
          await supabase.from('users').update({
            twitter_id: null,
            twitter_username: null,
            twitter_avatar_url: null,
          }).eq('id', emailUser.profile.id)
          // Refetch user info
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
            setEmailUser({ ...user, profile })
          }
        }
      }
    } finally {
      setUnlinkingTwitter(false)
    }
  }

  const handleAvatarUploaded = async (avatarUrl: string) => {
    setAvatarUrl(avatarUrl); // update local state for preview
    try {
      let updateQuery = supabase.from("users").update({
        avatar_url: avatarUrl, // full public URL
      });
      if (walletUser && walletUser.walletAddress) {
        updateQuery = updateQuery.eq("wallet_address", walletUser.walletAddress.toLowerCase());
      } else if (emailUser?.profile && emailUser.profile.id) {
        updateQuery = updateQuery.eq("id", emailUser.profile.id);
      } else {
        throw new Error("User not found");
      }
      const { error: updateError } = await updateQuery;
      if (updateError) {
        setError("Failed to update avatar in profile: " + updateError.message);
        return;
      }

      // Refetch the user profile and update local state
      if (walletUser && walletUser.walletAddress) {
        const { data } = await supabase.from("users").select("*").eq("wallet_address", walletUser.walletAddress.toLowerCase()).single();
        if (data) {
          setProfile(data);
          setAvatarUrl(data.avatar_url || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setSocialLinks(data.social_links || {});
        }
      } else if (emailUser?.email) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", emailUser.email).single();
        if (profile) {
          setProfile(profile);
          setAvatarUrl(profile.avatar_url || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          setSocialLinks(profile.social_links || {});
          setEmailUser((prev: any) => ({ ...prev, profile }));
        }
      }
    } catch (e: any) {
      setError(e.message || "Failed to update avatar in profile");
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 text-white text-xl">Loading...</div>
  }

  // If not signed in, show sign-in prompt
  if (!walletUser && !emailUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <div className="bg-white/10 border-white/20 backdrop-blur-sm p-8 rounded-lg flex flex-col items-center">
          <h2 className="text-2xl text-white mb-4 font-bold">Sign In Required</h2>
          <p className="text-gray-300 mb-6">Please sign in with your email or wallet to access your profile and connect social accounts.</p>
          {/* You can add your sign-in component here, or a button to open the sign-in dialog */}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 py-12">
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-8 px-2">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full">
          <CardHeader>
            <CardTitle className="text-white">Edit Profile</CardTitle>
            <CardDescription className="text-gray-300">Manage your profile information</CardDescription>
            <div className="mt-4 flex flex-col gap-2">
              {emailUser && (
                <div className="text-sm text-white/80">Email: <span className="font-semibold">{emailUser.email}</span></div>
              )}
              {walletUser && (
                <div className="text-sm text-white/80 flex items-center gap-2">
                  Wallet:
                  <span className="font-semibold">
                    {walletUser.walletAddress.slice(0, 8)}...{walletUser.walletAddress.slice(-12)}
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletUser.walletAddress)
                    }}
                    className="ml-1 p-1 rounded hover:bg-white/10 focus:outline-none cursor-pointer"
                    title="Copy wallet address"
                    type="button"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-emerald-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6V5.25A2.25 2.25 0 0014.25 3h-6A2.25 2.25 0 006 5.25v12A2.25 2.25 0 008.25 19H9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18 7.5V18.75A2.25 2.25 0 0115.75 21h-6A2.25 2.25 0 017.5 18.75V7.5A2.25 2.25 0 019.75 5.25h6A2.25 2.25 0 0118 7.5z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Wallet Linking UI */}
            <div>
              <WalletConnect />
            </div>
            {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
            {success && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="flex-1 space-y-4">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center mb-4">
                  <AvatarUpload
                    currentAvatar={avatarUrl}
                    onAvatarUploaded={handleAvatarUploaded}
                    userId={walletUser ? walletUser.walletAddress.toLowerCase() : emailUser?.profile?.id}
                    size="md"
                  />
                </div>
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
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm w-full">
          <CardHeader>
            <CardTitle className="text-white">Connected Account</CardTitle>
            <CardDescription className="text-gray-300">Connect your social accounts to the app</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col gap-6">
              {/* Discord Connect Button */}
              <div className="flex flex-col items-center w-full">
                {discordInfo ? (
                  <div className="flex flex-col items-center w-full gap-2">
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white border-0 mb-2 flex items-center justify-center gap-2 text-base font-medium py-3"
                      onClick={handleUnlinkDiscord}
                      disabled={unlinkingDiscord}
                    >
                      <DiscordIcon className="w-6 h-6" />
                      {unlinkingDiscord ? 'Unlinking...' : 'Unlink Discord'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 mb-2 flex items-center justify-center gap-2 text-base font-medium py-3"
                    onClick={handleLinkDiscord}
                  >
                    <DiscordIcon className="w-6 h-6" />
                    Connect Discord
                  </Button>
                )}
              </div>
              {/* X (Twitter) Connect Button */}
              <div className="flex flex-col items-center w-full">
                {twitterInfo ? (
                  <div className="flex flex-col items-center w-full gap-2">
                    <div className="flex items-center gap-2 mb-2">
                      {twitterInfo.avatar && (
                        <img src={twitterInfo.avatar} alt="X Avatar" className="w-8 h-8 rounded-full" />
                      )}
                      <span className="text-white font-medium">{twitterInfo.username}</span>
                    </div>
                    <Button
                      className="w-full bg-red-600 hover:bg-red-700 text-white border-0 flex items-center justify-center gap-2 text-base font-medium py-3"
                      onClick={handleUnlinkTwitter}
                      disabled={unlinkingTwitter}
                    >
                      <XIcon className="w-6 h-6" />
                      {unlinkingTwitter ? 'Unlinking...' : 'Unlink X'}
                    </Button>
                  </div>
                ) : (
                  <Button
                    className="w-full bg-black text-white border-0 mb-2 flex items-center justify-center gap-2 text-base font-medium py-3"
                    onClick={handleLinkTwitter}
                  >
                    <XIcon className="w-6 h-6" />
                    Connect X
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 