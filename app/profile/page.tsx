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
import { LogOut, Copy, ExternalLink, User, Wallet, Link, AlertCircle } from "lucide-react"
import { SiDiscord, SiX } from "react-icons/si"
import AvatarUpload from "@/components/avatar-upload"
import AuthRequired from "@/components/auth-required"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageContainer from "@/components/PageContainer";

// React icons with proper typing for React 19
const DiscordIcon = SiDiscord as any
const XIcon = SiX as any

interface LinkedIdentity {
  id: string;
  user_id: string;
  identity_id: string;
  provider: string;
  identity_data?: {
    user_name?: string;
    screen_name?: string;
    name?: string;
    avatar_url?: string;
    email?: string;
    [key: string]: any;
  };
}

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
  const [linkedIdentities, setLinkedIdentities] = useState<LinkedIdentity[]>([]);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);

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

  // 1. Always get the canonical user ID from Supabase Auth
  const [authUserId, setAuthUserId] = useState<string | null>(null);

  const { toast } = useToast();

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
    supabase.auth.getUser().then(({ data }) => {
      setSupabaseUser(data?.user);
      setAuthUserId(data?.user?.id || null);
    });
  }, []);

  // 2. Fetch user profile from users table using authUserId
  useEffect(() => {
    if (!authUserId) return;
    const fetchProfileByAuthId = async () => {
      const { data: userProfile } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUserId)
        .single();
      if (userProfile) {
        setProfile(userProfile);
        setAvatarUrl(userProfile.avatar_url || "");
        setUsername(userProfile.username || "");
        setBio(userProfile.bio || "");
        setSocialLinks(userProfile.social_links || {});
        setEmailUser((prev: any) => ({ ...prev, profile: userProfile }));
      }
    };
    fetchProfileByAuthId();
  }, [authUserId]);

  // 3. Fetch social accounts using authUserId
  const fetchSocialAccounts = async () => {
    if (!authUserId) return;
    const { data, error } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', authUserId);
    if (!error && data) setSocialAccounts(data);
  };

  useEffect(() => {
    fetchSocialAccounts();
  }, [authUserId]);

  // Fetch linked identities from Supabase Auth
  const fetchLinkedIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: identities } = await supabase.auth.getUserIdentities();
      if (identities?.identities) {
        setLinkedIdentities(identities.identities as LinkedIdentity[]);
      }
    } catch (error) {
      console.error('Error fetching linked identities:', error);
    }
  };

  // Check for OAuth callback
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (error) {
      toast({
        title: "Error",
        description: `OAuth error: ${error}`,
        variant: "destructive",
      });
      router.replace('/profile');
    } else if (success === 'x_linked' || success === 'discord_linked') {
      toast({
        title: "Success",
        description: "Account linked successfully!",
      });
      router.replace('/profile');
    }
  }, [searchParams]);

  useEffect(() => {
    // Fetch linked identities when user changes
    if (emailUser || walletUser) {
      fetchLinkedIdentities();
    }
  }, [emailUser, walletUser]);

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

      // Update linked identities
      if (identities?.identities) {
        setLinkedIdentities(identities.identities as LinkedIdentity[]);
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

  // ===== SUPABASE AUTH ACCOUNT LINKING =====

  // Link Discord account using Supabase Auth
  const handleLinkDiscord = async () => {
    setIsLinking('discord');
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        throw error;
      }

      // If no redirect URL returned, show success
      if (!data?.url) {
        toast({
          title: "Success",
          description: "Discord account linked successfully!",
        });
        await fetchLinkedIdentities();
      }
      // If redirect URL returned, user will be redirected to Discord OAuth
    } catch (error) {
      console.error('Discord linking error:', error);
      toast({
        title: "Error",
        description: "Failed to link Discord account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinking(null);
    }
  };

  // Unlink Discord account using Supabase Auth
  const handleUnlinkDiscord = async () => {
    setIsUnlinking('discord');
    try {
      const discordIdentity = linkedIdentities.find(identity => identity.provider === 'discord');
      
      if (!discordIdentity) {
        throw new Error('Discord account not found');
      }

      // Check if user has at least 2 identities before unlinking
      if (linkedIdentities.length < 2) {
        throw new Error('Cannot unlink your last authentication method. Please add another account first.');
      }

      const { error } = await supabase.auth.unlinkIdentity(discordIdentity as any);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Discord account unlinked successfully",
      });

      // Refresh linked identities
      await fetchLinkedIdentities();
    } catch (error) {
      console.error('Discord unlinking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlink Discord account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(null);
    }
  };

  // Link X (Twitter) account using Supabase Auth
  const handleLinkX = async () => {
    setIsLinking('x');
    try {
      const { data, error } = await supabase.auth.linkIdentity({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/profile`,
        },
      });

      if (error) {
        throw error;
      }

      // If no redirect URL returned, show success
      if (!data?.url) {
        toast({
          title: "Success",
          description: "X account linked successfully!",
        });
        await fetchLinkedIdentities();
      }
      // If redirect URL returned, user will be redirected to X OAuth
    } catch (error) {
      console.error('X linking error:', error);
      toast({
        title: "Error",
        description: "Failed to link X account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinking(null);
    }
  };

  // Unlink X (Twitter) account using Supabase Auth
  const handleUnlinkX = async () => {
    setIsUnlinking('x');
    try {
      const xIdentity = linkedIdentities.find(identity => identity.provider === 'twitter');
      
      if (!xIdentity) {
        throw new Error('X account not found');
      }

      // Check if user has at least 2 identities before unlinking
      if (linkedIdentities.length < 2) {
        throw new Error('Cannot unlink your last authentication method. Please add another account first.');
      }

      const { error } = await supabase.auth.unlinkIdentity(xIdentity as any);

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "X account unlinked successfully",
      });

      // Refresh linked identities
      await fetchLinkedIdentities();
    } catch (error) {
      console.error('X unlinking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlink X account. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(null);
    }
  };

  // ===== WALLET LINKING =====

  // Link wallet using Web3
  const handleLinkWallet = async () => {
    setIsLinking('wallet');
    try {
      // Use the existing wallet connection logic
      const walletAddress = await walletAuth.connectWallet();
      
      if (walletAddress) {
        toast({
          title: "Success",
          description: "Wallet linked successfully!",
        });
        
        // Refresh wallet user state
        const currentWalletUser = await walletAuth.getCurrentUser();
        setWalletUser(currentWalletUser);
      }
    } catch (error) {
      console.error('Wallet linking error:', error);
      toast({
        title: "Error",
        description: "Failed to link wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinking(null);
    }
  };

  // Unlink wallet
  const handleUnlinkWallet = async () => {
    setIsUnlinking('wallet');
    try {
      // Use the new unlink function that properly removes from both tables
      await walletAuth.unlinkWalletFromCurrentUser();
      setWalletUser(null);
      setProfile(null);
      
      // Refresh social accounts to reflect the change
      await fetchSocialAccounts();
      
      toast({
        title: "Success",
        description: "Wallet unlinked successfully",
      });
    } catch (error) {
      console.error('Wallet unlinking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to unlink wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(null);
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

  // 4. When linking/unlinking social accounts, always use authUserId
  const handleLinkSocialAccount = async (platform: string, accountData: any) => {
    if (!authUserId) return;
    await supabase.from('social_accounts').upsert({
      user_id: authUserId,
      platform,
      ...accountData,
    }, { onConflict: 'user_id,platform' });
    // Refresh
    const { data } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', authUserId);
    setSocialAccounts(data || []);
  };

  // 5. Remove direct social fields from UI (discord_id, x_id, etc.)
  //    Only show linked accounts from social_accounts and Supabase Auth identities
  const handleUnlinkSocial = async (platform: string) => {
    if (!authUserId) return;
    try {
      await supabase.from('social_accounts').delete().eq('user_id', authUserId).eq('platform', platform);
      // Remove any cached OAuth state for this platform
      await supabase.from('oauth_states').delete().eq('user_id', authUserId).eq('platform', platform);
      setSocialAccounts((prev) => prev.filter(a => a.platform !== platform));
      toast({
        title: "Success",
        description: `${platform.charAt(0).toUpperCase() + platform.slice(1)} account unlinked successfully`,
      });
    } catch (error) {
      console.error('Error unlinking social account:', error);
      toast({
        title: "Error",
        description: `Failed to unlink ${platform} account. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Connect social account (redirect to OAuth flow)
  const handleConnectSocial = (platform: string) => {
    if (platform === 'x') {
      supabase.auth.linkIdentity({ provider: 'twitter' })
        .then(({ data, error }) => {
          if (error) {
            // Optionally show a toast or error message
            console.error('X linking error:', error);
          }
          // Optionally handle success (data contains the new identity)
        });
    } else if (platform === 'discord') {
      window.location.href = '/api/connect-discord';
    } else if (platform === 'telegram') {
      window.location.href = '/api/connect-telegram';
    }
  };

  // Helper function to get identity display name
  const getIdentityDisplayName = (identity: LinkedIdentity) => {
    return identity.identity_data?.user_name || 
           identity.identity_data?.screen_name || 
           identity.identity_data?.name || 
           identity.identity_data?.email ||
           `${identity.provider} account`;
  };

  // Helper function to check if user has verified email
  const hasVerifiedEmail = () => {
    return emailUser?.email_confirmed_at || emailUser?.email_verified;
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
                {/* Email Verification Warning */}
                {emailUser && !hasVerifiedEmail() && (
                  <Alert className="bg-yellow-500/20 border-yellow-500/30">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-400">
                      Please verify your email address to enable automatic account linking and improve security.
                    </AlertDescription>
                  </Alert>
                )}

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
                          {!hasVerifiedEmail() && (
                            <div className="text-xs text-yellow-400 mt-1">Email not verified</div>
                          )}
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
                
                {/* Email Verification Warning */}
                {emailUser && !hasVerifiedEmail() && (
                  <Alert className="bg-yellow-500/20 border-yellow-500/30">
                    <AlertCircle className="h-4 w-4 text-yellow-400" />
                    <AlertDescription className="text-yellow-400">
                      Verify your email to enable automatic account linking for better security.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Linked Identities from Supabase Auth */}
                <div className="space-y-4">
                  <h4 className="text-md font-medium text-white">Authentication Methods</h4>
                  
                  {/* Email Account */}
                  {emailUser && (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{emailUser.email}</div>
                          <div className="text-sm text-gray-400">Email & Password</div>
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-600 text-white">Primary</Badge>
                    </div>
                  )}

                  {/* Discord Account */}
                  {linkedIdentities.find(id => id.provider === 'discord') ? (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <DiscordIcon className="w-8 h-8 text-[#5865F2]" />
                        <div>
                          <div className="text-white font-medium">
                            {getIdentityDisplayName(linkedIdentities.find(id => id.provider === 'discord')!)}
                          </div>
                          <div className="text-sm text-gray-400">Discord</div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleUnlinkDiscord}
                        disabled={isUnlinking === 'discord'}
                      >
                        {isUnlinking === 'discord' ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <DiscordIcon className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="text-white font-medium">Discord</div>
                          <div className="text-sm text-gray-400">Not connected</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleLinkDiscord}
                        disabled={isLinking === 'discord'}
                      >
                        {isLinking === 'discord' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  )}

                  {/* X (Twitter) Account */}
                  {linkedIdentities.find(id => id.provider === 'twitter') ? (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <XIcon className="w-8 h-8 text-white" />
                        <div>
                          <div className="text-white font-medium">
                            {getIdentityDisplayName(linkedIdentities.find(id => id.provider === 'twitter')!)}
                          </div>
                          <div className="text-sm text-gray-400">X (Twitter)</div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleUnlinkX}
                        disabled={isUnlinking === 'x'}
                      >
                        {isUnlinking === 'x' ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <XIcon className="w-8 h-8 text-gray-400" />
                        <div>
                          <div className="text-white font-medium">X (Twitter)</div>
                          <div className="text-sm text-gray-400">Not connected</div>
                        </div>
                      </div>
                      <Button 
                        className="bg-black hover:bg-gray-800 text-white"
                        onClick={handleLinkX}
                        disabled={isLinking === 'x'}
                      >
                        {isLinking === 'x' ? 'Linking...' : 'Connect X'}
                      </Button>
                    </div>
                  )}

                  {/* Wallet Account */}
                  {walletUser ? (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-green-500" />
                        <div>
                          <div className="text-white font-medium">
                            {walletUser.walletAddress.slice(0, 8)}...{walletUser.walletAddress.slice(-12)}
                          </div>
                          <div className="text-sm text-gray-400">Web3 Wallet</div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleUnlinkWallet}
                        disabled={isUnlinking === 'wallet'}
                      >
                        {isUnlinking === 'wallet' ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-green-500" />
                        <div>
                          <div className="text-white font-medium">Web3 Wallet</div>
                          <div className="text-sm text-gray-400">Not connected</div>
                        </div>
                      </div>
                      <Button 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={handleLinkWallet}
                        disabled={isLinking === 'wallet'}
                      >
                        {isLinking === 'wallet' ? 'Linking...' : 'Connect Wallet'}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Legacy Social Accounts (from social_accounts table) */}
                {socialAccounts.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <h4 className="text-md font-medium text-white">Legacy Connected Accounts</h4>
                    {socialAccounts.map(account => (
                      <div key={account.platform} className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-white">{account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}:</span>
                        <span className="text-gray-300">{account.username}</span>
                        <Button variant="destructive" size="sm" onClick={() => handleUnlinkSocial(account.platform)}>
                          Unlink
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
} 