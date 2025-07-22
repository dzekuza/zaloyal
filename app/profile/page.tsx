"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WalletConnect from "@/components/wallet-connect"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import { useRouter } from "next/navigation"
import { LogOut, Copy, ExternalLink, User, Wallet, Link } from "lucide-react"
import { SiDiscord, SiX } from "react-icons/si"
import AvatarUpload from "@/components/avatar-upload"
import AuthRequired from "@/components/auth-required"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useTwitterLink } from "@/hooks/use-twitter-link";

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
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();
  
  // Use the new Twitter linking hook
  const { 
    isLinking: linkingTwitter, 
    isUnlinking: unlinkingTwitter, 
    error: twitterError,
    linkTwitter, 
    unlinkTwitter, 
    getTwitterIdentity 
  } = useTwitterLink();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSupabaseUser(data?.user))
  }, [])

  const discordInfo = emailUser?.profile?.discord_id ? {
    id: emailUser.profile.discord_id,
    username: emailUser.profile.discord_username,
    avatar: emailUser.profile.discord_avatar_url,
  } : null

  // X (Twitter) info from new fields
  const xInfo = emailUser?.profile?.x_id ? {
    id: emailUser.profile.x_id,
    username: emailUser.profile.x_username,
    avatar: emailUser.profile.x_avatar_url,
    profileUrl: emailUser.profile.x_username ? `https://x.com/${emailUser.profile.x_username}` : null,
  } : null

  // Helper to fetch and update identities in emailUser
  const updateEmailUserWithIdentities = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: identities } = await supabase.auth.getUserIdentities();
      setEmailUser((prev: any) => ({ ...prev, ...user, identities: identities?.identities || [] }));
    }
  };

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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single();
        const { data: identities } = await supabase.auth.getUserIdentities();
        setEmailUser({ ...user, profile, identities: identities?.identities || [] });
        setCurrentUser({ ...user, profile });
        if (profile) fetchProfile(null, profile);
      }
      setLoading(false);
    };
    checkEmailAuth();
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

  // Handle Twitter linking with the new hook
  const handleLinkX = async () => {
    const result = await linkTwitter();
    if (result.success) {
      // Refresh user data after successful linking
      await updateEmailUserWithIdentities();
      // Refetch profile data
      if (emailUser?.email) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", emailUser.email).single();
        if (profile) {
          setEmailUser((prev: any) => ({ ...prev, profile }));
        }
      }
    }
  };

  // Handle Twitter unlinking with the new hook
  const handleUnlinkTwitter = async () => {
    const result = await unlinkTwitter();
    if (result.success) {
      // Refresh user data after successful unlinking
      await updateEmailUserWithIdentities();
      // Refetch profile data
      if (emailUser?.email) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", emailUser.email).single();
        if (profile) {
          setEmailUser((prev: any) => ({ ...prev, profile }));
        }
      }
    }
  };

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

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!emailUser?.email) return;
    setDeleting(true);
    try {
      // Delete all user data from 'users' table and related tables
      // 1. Delete from users
      await supabase.from("users").delete().eq("email", emailUser.email);
      // 2. Optionally, delete from other tables (e.g., user_quest_progress, user_badges, etc.)
      // Add more delete queries here as needed
      // 3. Delete auth user
      await supabase.auth.admin.deleteUser(emailUser.id);
      // 4. Sign out and redirect
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (e) {
      alert("Failed to delete account. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#181818] text-white text-xl">Loading...</div>
  }

  // If not signed in, show sign-in prompt
  if (!walletUser && !emailUser) {
    return (
      <div className="min-h-screen bg-[#181818]">
        <AuthRequired 
          title="Sign In Required"
          message="Please sign in with your email or wallet to access your profile and connect social accounts."
          onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#181818] py-8 px-4">
      <div className="container mx-auto max-w-4xl">
        <Card className="bg-[#111111] border-[#282828]">
          <CardHeader>
            <CardTitle className="text-white text-2xl">Profile Settings</CardTitle>
            <CardDescription className="text-gray-300">Manage your profile, wallet, and connected accounts</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-[#181818] border-[#282828]">
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="wallet" className="flex items-center gap-2">
                  <Wallet className="w-4 h-4" />
                  Wallet
                </TabsTrigger>
                <TabsTrigger value="accounts" className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Linked Accounts
                </TabsTrigger>
              </TabsList>

              {/* Profile Tab */}
              <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="space-y-6">
                  {/* Profile Image Upload */}
                  <div className="flex flex-col items-center">
                    <AvatarUpload
                      currentAvatar={avatarUrl}
                      onAvatarUploaded={handleAvatarUploaded}
                      userId={walletUser ? walletUser.walletAddress.toLowerCase() : emailUser?.profile?.id}
                      size="lg"
                    />
                  </div>

                  {/* Profile Information */}
                  <div className="space-y-4">
                    <div>
                      <label className="text-white block mb-2 text-sm font-medium">Username</label>
                      <Input 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400" 
                        placeholder="Enter your username"
                      />
                    </div>
                    <div>
                      <label className="text-white block mb-2 text-sm font-medium">Bio</label>
                      <Textarea 
                        value={bio} 
                        onChange={e => setBio(e.target.value)} 
                        rows={4} 
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400" 
                        placeholder="Tell us about yourself..."
                      />
                    </div>
                  </div>

                  {/* Status Messages */}
                  {error && <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-sm">{error}</div>}
                  {success && <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 text-sm">{success}</div>}

                  {/* Save & Delete Buttons */}
                  <div className="flex justify-between gap-2">
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 text-white">
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={deleting}>
                      Delete Account
                    </Button>
                  </div>
                </div>
                {/* Delete Account Modal */}
                <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Account</DialogTitle>
                      <DialogDescription>
                        This action is <span className="text-red-400 font-bold">permanent</span> and will remove all your data. To confirm, please re-enter your email address below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="text-gray-300 text-sm">Current email: <span className="font-mono text-white">{emailUser?.email}</span></div>
                      <Input
                        type="email"
                        placeholder="Re-enter your email to confirm"
                        value={deleteEmailInput}
                        onChange={e => setDeleteEmailInput(e.target.value)}
                        className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400"
                        autoFocus
                      />
                    </div>
                    <DialogFooter className="mt-4 flex flex-row gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting}>Cancel</Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteAccount}
                        disabled={deleting || deleteEmailInput !== emailUser?.email}
                      >
                        {deleting ? "Deleting..." : "Confirm Delete Account"}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>

              {/* Wallet Tab */}
              <TabsContent value="wallet" className="space-y-6 mt-6">
                <div className="space-y-6">
                  {/* Current Account Info */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Current Account</h3>
                    <div className="space-y-3">
                      {emailUser && (
                        <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg border border-[#282828]">
                          <div>
                            <div className="text-sm text-gray-300">Email Account</div>
                            <div className="text-white font-medium">{emailUser.email}</div>
                          </div>
                          <Badge variant="secondary" className="bg-green-600 text-white">Active</Badge>
                        </div>
                      )}
                      {walletUser && (
                        <div className="flex items-center justify-between p-4 bg-[#181818] rounded-lg border border-[#282828]">
                          <div>
                            <div className="text-sm text-gray-300">Wallet Address</div>
                            <div className="text-white font-medium flex items-center gap-2">
                              {walletUser.walletAddress.slice(0, 8)}...{walletUser.walletAddress.slice(-12)}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(walletUser.walletAddress)
                                }}
                                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          <Badge variant="secondary" className="bg-green-600 text-white">Connected</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Wallet Connection */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
                    <div className="p-4 bg-[#181818] rounded-lg border border-[#282828]">
                      <WalletConnect />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Linked Accounts Tab */}
              <TabsContent value="accounts" className="space-y-6 mt-6">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Connected Social Accounts</h3>
                  
                  {/* Discord */}
                  <div className="p-4 bg-[#181818] rounded-lg border border-[#282828]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <DiscordIcon className="w-6 h-6 text-white" />
                        <div>
                          <div className="text-white font-medium">Discord</div>
                          <div className="text-gray-300 text-sm">Connect your Discord account</div>
                        </div>
                      </div>
                      {discordInfo && <Badge variant="secondary" className="bg-green-600 text-white">Connected</Badge>}
                    </div>
                    
                    {discordInfo ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{discordInfo.username}</span>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={handleUnlinkDiscord}
                          disabled={unlinkingDiscord}
                          className="w-full"
                        >
                          {unlinkingDiscord ? 'Unlinking...' : 'Unlink Discord'}
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={handleLinkDiscord}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <DiscordIcon className="w-5 h-5 mr-2" />
                        Connect Discord
                      </Button>
                    )}
                  </div>

                  {/* X (Twitter) */}
                  <div className="p-4 bg-[#181818] rounded-lg border border-[#282828]">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <XIcon className="w-6 h-6 text-white" />
                        <div>
                          <div className="text-white font-medium">X (Twitter)</div>
                          <div className="text-gray-300 text-sm">Connect your X account</div>
                        </div>
                      </div>
                      {(() => {
                        const [twitterIdentity] = (emailUser?.identities || [])
                          .filter((i: any) => i.provider === 'twitter');
                        return twitterIdentity ? <Badge variant="secondary" className="bg-green-600 text-white">Connected</Badge> : null;
                      })()}
                    </div>
                    
                    {twitterError && (
                      <div className="mb-3 p-3 bg-red-900/20 border border-red-500/30 rounded-md">
                        <div className="text-red-400 text-sm">{twitterError}</div>
                      </div>
                    )}
                    
                    {(() => {
                      // Find Twitter identity from Supabase identities
                      const [twitterIdentity] = (emailUser?.identities || [])
                        .filter((i: any) => i.provider === 'twitter');
                      if (twitterIdentity) {
                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              {twitterIdentity.identity_data?.avatar_url && (
                                <img src={twitterIdentity.identity_data.avatar_url} alt="X Avatar" className="w-5 h-5 rounded-full" />
                              )}
                              <span className="text-white">{twitterIdentity.identity_data?.user_name || 'X User'}</span>
                              {twitterIdentity.identity_data?.user_name && (
                                <Button variant="ghost" size="sm" asChild className="text-blue-400 hover:text-blue-300">
                                  <a href={`https://x.com/${twitterIdentity.identity_data.user_name}`} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </Button>
                              )}
                            </div>
                            <Button
                              onClick={handleUnlinkTwitter}
                              disabled={unlinkingTwitter}
                              className="w-full bg-red-600 hover:bg-red-700 text-white"
                            >
                              {unlinkingTwitter ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Unlinking...
                                </>
                              ) : (
                                'Unlink X'
                              )}
                            </Button>
                          </div>
                        );
                      } else {
                        return (
                          <Button
                            onClick={handleLinkX}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            disabled={linkingTwitter}
                          >
                            {linkingTwitter ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Linking...
                              </>
                            ) : (
                              <>
                                <XIcon className="w-5 h-5 mr-2" />
                                Connect X
                              </>
                            )}
                          </Button>
                        );
                      }
                    })()}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 