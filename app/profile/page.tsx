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
import { useRouter, useSearchParams } from "next/navigation"
import { LogOut, Copy, ExternalLink, User, Wallet, Link } from "lucide-react"
import { SiDiscord, SiX } from "react-icons/si"
import AvatarUpload from "@/components/avatar-upload"
import AuthRequired from "@/components/auth-required"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { useXAuth } from "@/hooks/use-x-auth";
import PageContainer from "@/components/PageContainer";

// React icons with proper typing for React 19
const DiscordIcon = SiDiscord as any
const XIcon = SiX as any

export default function ProfilePage() {
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [socialAccounts, setSocialAccounts] = useState<any[]>([]);

  // Editable fields
  const [username, setUsername] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [bio, setBio] = useState("")
  const [socialLinks, setSocialLinks] = useState<any>({})

  const router = useRouter()
  const searchParams = useSearchParams()

  const [supabaseUser, setSupabaseUser] = useState<any>(null)
  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();
  
  // Use the new X authentication hook
  // const { 
  //   account: xAccount,
  //   isConnecting: connectingX,
  //   isVerifying: verifyingX,
  //   error: xError,
  //   connectX, 
  //   disconnectX, 
  //   getXAccount 
  // } = useXAuth();

  // Temporary variables for testing
  const xAccount: any = null;
  const connectingX = false;
  const verifyingX = false;
  const xError = null;
  const connectX = async () => {};
  const disconnectX = async () => {};

  // Main initialization useEffect
  useEffect(() => {
    const initializePage = async () => {
      console.log('Initializing profile page...');
      try {
        // Check for wallet connection
        console.log('Checking wallet connection...');
        const walletUser = await walletAuth.getCurrentUser();
        console.log('Wallet user:', walletUser);
        setWalletUser(walletUser);

        // Check for email authentication
        console.log('Checking email auth...');
        await checkEmailAuth();
        console.log('Email auth checked');

        // Set loading to false after initialization
        console.log('Setting loading to false');
        setLoading(false);
      } catch (error) {
        console.error('Error initializing page:', error);
        setLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      console.log('Initialization timeout reached, setting loading to false');
      setLoading(false);
    }, 10000); // 10 seconds timeout

    initializePage();

    return () => clearTimeout(timeout);
  }, []);

  useEffect(() => {
    // Fetch social accounts after user is loaded
    const fetchSocialAccounts = async (userId: string) => {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', userId);
      if (!error && data) setSocialAccounts(data);
    };
    // After walletUser/emailUser is set
    const userId = (walletUser as any)?.id || (emailUser as any)?.id || profile?.id || walletUser?.walletAddress;
    if (userId) fetchSocialAccounts(userId);
  }, [walletUser, emailUser, profile]);

  // Handle OAuth callback
  const handleOAuthCallback = async (code: string) => {
    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('OAuth callback error:', error);
        toast({
          title: "Error",
          description: "Failed to complete X account linking. Please try again.",
          variant: "destructive",
        });
        router.replace('/profile');
        return;
      }

      if (data.user) {
        // Successfully authenticated
        console.log('OAuth callback successful for user:', data.user.id);
        
        // Update user profile with Twitter data if available
        if (data.user.identities) {
          const twitterIdentity = (data.user.identities as any[]).find(
            (identity: any) => identity.provider === 'twitter'
          );
          
          if (twitterIdentity) {
            try {
              await supabase.from('users').update({
                x_id: twitterIdentity.identity_data?.id_str || twitterIdentity.identity_data?.id,
                x_username: twitterIdentity.identity_data?.screen_name || twitterIdentity.identity_data?.user_name,
                x_avatar_url: twitterIdentity.identity_data?.profile_image_url_https,
              }).eq('id', data.user.id);
              
              console.log('Updated user profile with Twitter data');
            } catch (updateError) {
              console.error('Error updating user profile:', updateError);
            }
          }
        }
        
        toast({
          title: "Success",
          description: "X account linked successfully!",
        });
        
        // Refresh user data
        await updateEmailUserWithIdentities();
        router.replace('/profile');
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: "Error",
        description: "Failed to complete X account linking. Please try again.",
        variant: "destructive",
      });
      router.replace('/profile');
    }
  };

  // Check for OAuth callback
  useEffect(() => {
    const code = searchParams.get('code');
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (code) {
      handleOAuthCallback(code);
    } else if (error) {
      toast({
        title: "Error",
        description: `OAuth error: ${error}`,
        variant: "destructive",
      });
      router.replace('/profile');
    } else if (success === 'x_linked') {
      toast({
        title: "Success",
        description: "X account linked successfully!",
      });
      router.replace('/profile');
    }
  }, [searchParams]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setSupabaseUser(data?.user))
  }, [])

  const discordInfo = emailUser?.profile?.discord_id ? {
    id: emailUser.profile.discord_id,
    username: emailUser.profile.discord_username,
    avatar: emailUser.profile.discord_avatar_url
  } : null;

  const updateEmailUserWithIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: identities } = await supabase.auth.getUserIdentities();
      
      // Update emailUser with identities
      setEmailUser((prev: any) => ({
        ...prev,
        identities: identities?.identities || []
      }));

      // Check for X account
      if (xAccount) {
        console.log('X account found:', xAccount);
      }
    } catch (error) {
      console.error('Error updating user with identities:', error);
    }
  };

  const checkEmailAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setEmailUser(user);
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single();
        if (profile) {
          setProfile(profile);
          setAvatarUrl(profile.avatar_url || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          setSocialLinks(profile.social_links || {});
          setEmailUser((prev: any) => ({ ...prev, profile }));
        }
      }
    } catch (error) {
      console.error("Error checking email auth:", error);
    }
  };

  const fetchProfile = async (walletUser: WalletUser | null, emailProfile: any | null) => {
    try {
      if (walletUser && walletUser.walletAddress) {
        const { data } = await supabase.from("users").select("*").eq("wallet_address", walletUser.walletAddress.toLowerCase()).single();
        if (data) {
          setProfile(data);
          setAvatarUrl(data.avatar_url || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setSocialLinks(data.social_links || {});
        }
      } else if (emailProfile) {
        setProfile(emailProfile);
        setAvatarUrl(emailProfile.avatar_url || "");
        setUsername(emailProfile.username || "");
        setBio(emailProfile.bio || "");
        setSocialLinks(emailProfile.social_links || {});
      }
    } catch (error) {
      console.error("Error fetching profile:", error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let updateQuery = supabase.from("users").update({
        username,
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
      if (updateError) {
        setError("Failed to update profile: " + updateError.message);
        return;
      }

      setSuccess("Profile updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (e: any) {
      setError(e.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSocialLinkChange = (platform: string, value: string) => {
    setSocialLinks((prev: any) => ({ ...prev, [platform]: value }));
  };

  const handleDisconnectWallet = async () => {
    await walletAuth.disconnectWallet();
    setWalletUser(null);
    setProfile(null);
  };

  const handleLinkDiscord = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to initiate Discord linking. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Discord linking error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate Discord linking. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkDiscord = async () => {
    setUnlinkingDiscord(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          discord_id: null,
          discord_username: null,
          discord_avatar_url: null,
        }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Discord account unlinked successfully",
      });

      // Refresh user data
      await updateEmailUserWithIdentities();
    } catch (error) {
      console.error('Discord unlinking error:', error);
      toast({
        title: "Error",
        description: "Failed to unlink Discord account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnlinkingDiscord(false);
    }
  };

  // Handle X linking with the new hook
  const handleLinkX = async () => {
    try {
      await connectX();
      // The user will be redirected to X for authentication
      // The callback will handle the success/error messages
    } catch (error) {
      console.error('X linking error:', error);
      toast({
        title: "Error",
        description: "Failed to initiate X linking. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle X unlinking with the new hook
  const handleUnlinkTwitter = async () => {
    try {
      await disconnectX();
      // Refresh user data after successful unlinking
      await updateEmailUserWithIdentities();
    } catch (error) {
      console.error('X unlinking error:', error);
      toast({
        title: "Error",
        description: "Failed to unlink X account. Please try again.",
        variant: "destructive",
      });
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

  // Unlink social account
  const handleUnlinkSocial = async (platform: string) => {
    const userId = (walletUser as any)?.id || (emailUser as any)?.id || profile?.id || walletUser?.walletAddress;
    if (!userId) return;
    await supabase.from('social_accounts').delete().eq('user_id', userId).eq('platform', platform);
    setSocialAccounts((prev) => prev.filter(a => a.platform !== platform));
  };

  // Connect social account (redirect to OAuth flow)
  const handleConnectSocial = (platform: string) => {
    if (platform === 'x') {
      window.location.href = '/api/connect-x';
    } else if (platform === 'discord') {
      window.location.href = '/api/connect-discord';
    } else if (platform === 'telegram') {
      window.location.href = '/api/connect-telegram';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <div className="text-white text-xl">Loading...</div>
        <div className="text-gray-400 text-sm mt-2">Debug: {JSON.stringify({ walletUser: !!walletUser, emailUser: !!emailUser, supabaseUser: !!supabaseUser })}</div>
      </div>
    )
  }

  // If not signed in, show sign-in prompt
  if (!walletUser && !emailUser) {
    return (
      <AuthRequired 
        title="Sign In Required"
        message="Please sign in with your email or wallet to access your profile and connect social accounts."
        onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
      />
    )
  }

  return (
    <PageContainer>
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
                {['x', 'discord', 'telegram'].map(platform => {
                  const account = socialAccounts.find(a => a.platform === platform);
                  return account ? (
                    <div key={platform} className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-white">{platform.charAt(0).toUpperCase() + platform.slice(1)}:</span>
                      <span className="text-gray-300">{account.username}</span>
                      <Button variant="destructive" size="sm" onClick={() => handleUnlinkSocial(platform)}>
                        Unlink
                      </Button>
                    </div>
                  ) : (
                    <Button key={platform} className="text-green-500 hover:underline mb-2" onClick={() => handleConnectSocial(platform)}>
                      Connect {platform.charAt(0).toUpperCase() + platform.slice(1)}
                    </Button>
                  );
                })}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
} 