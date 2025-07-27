"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter, useSearchParams } from "next/navigation"
import { LogOut, Copy, ExternalLink, User, Link, AlertCircle } from "lucide-react"
import AvatarUpload from "@/components/avatar-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/components/auth-provider-wrapper"
import AuthRequired from "@/components/auth-required"

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
  const { user, loading: authLoading, signOut, clearAuthState, clearOAuthState } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")
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

  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteEmailInput, setDeleteEmailInput] = useState("");
  const [deleting, setDeleting] = useState(false);

  const { toast } = useToast();



  // Main initialization useEffect
  useEffect(() => {
    const initializePage = async () => {
      console.log('Initializing profile page...');
      try {
        if (user) {
          console.log('User authenticated:', user.id);
          setProfile(user.profile);
          setAvatarUrl(user.avatar_url || "");
          setUsername(user.username || "");
          setBio(user.bio || "");
          setSocialLinks(user.social_links || {});
          
          // Immediately fetch social accounts
          await fetchSocialAccounts();
          await fetchLinkedIdentities();
        }
        setLoading(false);
      } catch (error) {
        console.error('Error initializing page:', error);
        setLoading(false);
      }
    };

    if (!authLoading) {
      initializePage();
    }
  }, [user, authLoading]);

  // Fetch social accounts when user changes
  useEffect(() => {
    if (user?.id) {
      fetchSocialAccounts();
      fetchLinkedIdentities();
    }
  }, [user?.id]);

  // 3. Fetch social accounts using user ID
  const fetchSocialAccounts = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id);
      if (!error && data) setSocialAccounts(data);
    } catch (error) {
      console.error('Error fetching social accounts:', error);
    }
  };

  // Fetch linked identities from Supabase Auth
  const fetchLinkedIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // For now, we'll use the social_accounts table instead of getUserIdentities
      const { data: socialAccounts, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id);
      
      if (!error && socialAccounts) {
        // Convert social accounts to linked identities format
        const identities = socialAccounts.map(account => ({
          id: account.id,
          user_id: account.user_id,
          identity_id: account.account_id,
          provider: account.platform, // This will be 'x', 'discord', 'solana', etc.
          identity_data: {
            user_name: account.username,
            screen_name: account.username,
            name: account.username,
          }
        }));
        setLinkedIdentities(identities);
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

  const discordInfo = user?.profile?.discord_id ? {
    id: user.profile.discord_id,
    username: user.profile.discord_username,
    avatar: user.profile.discord_avatar_url
  } : null;

  const updateUserWithIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use social_accounts table instead of getUserIdentities
      const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user.id);
      
      // Update linked identities
      if (socialAccounts) {
        const identities = socialAccounts.map(account => ({
          id: account.id,
          user_id: account.user_id,
          identity_id: account.account_id,
          provider: account.platform,
          identity_data: {
            user_name: account.username,
            screen_name: account.username,
            name: account.username,
          }
        }));
        setLinkedIdentities(identities);
      }
    } catch (error) {
      console.error('Error updating user with identities:', error);
    }
  };

  const checkEmailAuth = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single();
        if (profile) {
          setProfile(profile);
          setAvatarUrl(profile.avatar_url || "");
          setUsername(profile.username || "");
          setBio(profile.bio || "");
          setSocialLinks(profile.social_links || {});
        }
      }
    } catch (error) {
      console.error("Error checking email auth:", error);
    }
  };

  const fetchProfile = async () => {
    try {
      if (user?.id) {
        const { data } = await supabase.from("users").select("*").eq("id", user.id).single();
        if (data) {
          setProfile(data);
          setAvatarUrl(data.avatar_url || "");
          setUsername(data.username || "");
          setBio(data.bio || "");
          setSocialLinks(data.social_links || {});
        }
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
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          username,
          bio,
          social_links: socialLinks,
        })
        .eq("id", user.id);

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



  // ===== SUPABASE AUTH ACCOUNT LINKING =====

  // Link Discord account using Supabase Auth
  const handleLinkDiscord = async () => {
    setIsLinking('discord');
    try {
      // Check if user is authenticated
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in with your email first.",
          variant: "destructive",
        });
        return;
      }

      // Use Supabase's native Discord OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'identify connections guilds.join guilds.channels.read email guilds.members.read gdm.join'
        }
      });

      if (error) {
        throw error;
      }

      // The redirect will happen automatically
      console.log('Discord OAuth initiated successfully');
    } catch (error) {
      console.error('Discord linking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link Discord account. Please try again.",
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

      // Add null check for user ID before delete operation
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Remove from social_accounts table
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user.id)
        .eq('platform', 'discord');

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
    try {
      console.log('DEBUG: Initiating X OAuth via Supabase Auth');

      // Clear any existing OAuth state to prevent token reuse issues
      // This is especially important when switching between different X accounts
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
      
      // Generate a unique state parameter to prevent token reuse
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      
      // Store the state for verification (optional)
      sessionStorage.setItem('oauth_state', state)

      // Debug: Check authentication state
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      console.log('DEBUG: Supabase user:', supabaseUser ? 'found' : 'not found');
      console.log('DEBUG: Auth provider user:', user ? 'found' : 'not found');
      console.log('DEBUG: User email:', supabaseUser?.email);
      console.log('DEBUG: User ID:', supabaseUser?.id);
      
      // Check if user is authenticated via email or social
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in with your email first.",
          variant: "destructive",
        });
        return;
      }

      // Try OAuth with additional parameters for basic access and fresh state
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          queryParams: {
            // Add unique state parameter to prevent token reuse
            state: state,
            // Add additional parameters that might help with basic access
            force_login: 'true',
            screen_name: user.email?.split('@')[0] || '',
          }
        }
      });

      if (error) {
        console.error('DEBUG: OAuth error:', error);
        
        // If OAuth fails, try alternative approach
        if (error.message?.includes('Error creating identity') || error.message?.includes('server_error')) {
          toast({
            title: "Twitter App Access Issue",
            description: "Your Twitter app may need elevated access. Please check the Twitter Developer Portal.",
            variant: "destructive",
          });
          
          // Open Twitter Developer Portal in new tab
          window.open('https://developer.twitter.com/en/portal/dashboard', '_blank');
          return;
        }
        
        toast({
          title: "OAuth Error",
          description: error.message || "Failed to initiate OAuth",
          variant: "destructive",
        });
        return;
      }

      console.log('DEBUG: OAuth initiated successfully with fresh state:', data);
      
      // The redirect should happen automatically
      // If not, manually redirect
      if (data?.url) {
        window.location.href = data.url;
      }

    } catch (error) {
      console.error('DEBUG: Unexpected error in handleLinkX:', error);
      toast({
        title: "Unexpected Error",
        description: "An unexpected error occurred while linking X account",
        variant: "destructive",
      });
    }
  };

  // Clear OAuth state to help with account switching
  const handleClearOAuthState = () => {
    clearOAuthState();
    toast({
      title: "OAuth State Cleared",
      description: "You can now try linking a different X account. Please try the X authentication again.",
    });
  };

  // Unlink X (Twitter) account using Supabase Auth
  const handleUnlinkX = async () => {
    setIsUnlinking('x');
    try {
      const xIdentity = linkedIdentities.find(identity => identity.provider === 'x');
      
      if (!xIdentity) {
        throw new Error('X account not found');
      }

      // Check if user has at least 2 identities before unlinking
      if (linkedIdentities.length < 2) {
        throw new Error('Cannot unlink your last authentication method. Please add another account first.');
      }

      // Use Supabase Auth to unlink identity
      const { error: unlinkError } = await supabase.auth.unlinkIdentity(xIdentity);
      
      if (unlinkError) {
        throw unlinkError;
      }

      // Remove from social_accounts table
      const { error } = await supabase
        .from('social_accounts')
        .delete()
        .eq('user_id', user?.id || '')
        .eq('platform', 'x');

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



  const handleAvatarUploaded = async (avatarUrl: string) => {
    setAvatarUrl(avatarUrl); // update local state for preview
    try {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      const { error: updateError } = await supabase
        .from("users")
        .update({
          avatar_url: avatarUrl, // full public URL
        })
        .eq("id", user.id);

      if (updateError) {
        setError("Failed to update avatar in profile: " + updateError.message);
        return;
      }

      // Refetch the user profile and update local state
      const { data: profile } = await supabase
        .from("users")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfile(profile);
        setAvatarUrl(profile.avatar_url || "");
        setUsername(profile.username || "");
        setBio(profile.bio || "");
        setSocialLinks(profile.social_links || {});
      }
    } catch (e: any) {
      setError(e.message || "Failed to update avatar in profile");
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    if (!user?.email) return;
    setDeleting(true);
    try {
      // Delete all user data from 'users' table and related tables
      // 1. Delete from users
      await supabase.from("users").delete().eq("email", user.email);
      // 2. Optionally, delete from other tables (e.g., user_quest_progress, user_badges, etc.)
      // Add more delete queries here as needed
      // 3. Delete auth user
      await supabase.auth.admin.deleteUser(user.id);
      // 4. Sign out and redirect
      await signOut();
      window.location.href = "/";
    } catch (e) {
      alert("Failed to delete account. Please try again or contact support.");
    } finally {
      setDeleting(false);
    }
  };

  // 4. When linking/unlinking social accounts, always use user ID
  const handleLinkSocialAccount = async (platform: string, accountData: any) => {
    if (!user?.id) return;
    await supabase.from('social_accounts').upsert({
      user_id: user.id,
      platform,
      ...accountData,
    }, { onConflict: 'user_id,platform' });
    // Refresh
    const { data } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id);
    setSocialAccounts(data || []);
  };

  // 5. Remove direct social fields from UI (discord_id, x_id, etc.)
  //    Only show linked accounts from social_accounts and Supabase Auth identities
  const handleUnlinkSocial = async (platform: string) => {
    if (!user?.id) return;
    try {
      await supabase.from('social_accounts').delete().eq('user_id', user.id).eq('platform', platform);
      // Remove any cached OAuth state for this platform
      await supabase.from('oauth_states').delete().eq('user_id', user.id).eq('platform', platform);
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
    return user?.email_confirmed_at || user?.email_verified;
  };

  // Debug function to check authentication state
  const debugAuthState = async () => {
    try {
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      console.log('=== DEBUG AUTH STATE ===');
      console.log('Auth provider user:', user);
      console.log('Supabase user:', supabaseUser);
      console.log('Profile:', profile);
      
      const { data: socialAccounts } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', user?.id);
      console.log('Social accounts:', socialAccounts);
      
      const { data: linkedIdentities } = await supabase.auth.getUserIdentities();
      console.log('Linked identities:', linkedIdentities);
      console.log('========================');
      
      toast({
        title: "Debug Info",
        description: `User: ${user?.email}, Social Accounts: ${socialAccounts?.length || 0}, Identities: ${linkedIdentities?.identities?.length || 0}`,
      });
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // If not signed in, show sign-in prompt
  if (!user) {
    return (
      <AuthRequired 
        title="Sign In Required"
        message="Please sign in with your email to access your profile and connect social accounts."
      />
    )
  }

  return (
    <PageContainer>
      <Card className="bg-[#111111] border-[#282828]">
        <CardHeader>
          <CardTitle className="text-white text-2xl">Profile Settings</CardTitle>
          <CardDescription className="text-gray-300">Manage your profile and connected accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Debug button - remove after testing */}
          <div className="mb-4 flex gap-2">
            <Button 
              onClick={debugAuthState}
              variant="outline"
              size="sm"
              className="text-xs bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Debug Auth State
            </Button>
            <Button 
              onClick={clearAuthState}
              variant="outline"
              size="sm"
              className="text-xs bg-red-600 hover:bg-red-700"
            >
              Clear Auth State
            </Button>
          </div>
          
          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-[#181818] border-[#282828]">
              <TabsTrigger 
                value="profile" 
                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-transparent data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-600"
              >
                <User className="w-4 h-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger 
                value="accounts" 
                className="flex items-center gap-2 text-gray-400 hover:text-white hover:bg-transparent data-[state=active]:bg-green-600 data-[state=active]:text-white data-[state=active]:border-green-600"
              >
                <Link className="w-4 h-4" />
                Linked Accounts
              </TabsTrigger>
            </TabsList>

            {/* Profile Tab */}
            <TabsContent value="profile" className="space-y-6 mt-6">
              <div className="space-y-6">
                {/* Email Verification Warning */}
                {user?.email && !hasVerifiedEmail() && (
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
                    userId={user?.id}
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
                    <div className="text-gray-300 text-sm">Current email: <span className="font-mono text-white">{user?.email}</span></div>
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
                    <Button variant="outline" onClick={() => setShowDeleteDialog(false)} disabled={deleting} className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancel</Button>
                    <Button
                      variant="destructive"
                      onClick={handleDeleteAccount}
                      disabled={deleting || deleteEmailInput !== user?.email}
                    >
                      {deleting ? "Deleting..." : "Confirm Delete Account"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>



            {/* Linked Accounts Tab */}
            <TabsContent value="accounts" className="space-y-6 mt-6">
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-white">Connected Social Accounts</h3>
                
                {/* Email Verification Warning */}
                {user?.email && !hasVerifiedEmail() && (
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
                  {user?.email && (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-medium">{user.email}</div>
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
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        {isLinking === 'discord' ? 'Connecting...' : 'Connect'}
                      </Button>
                    </div>
                  )}

                  {/* X (Twitter) Account */}
                  {linkedIdentities.find(id => id.provider === 'x') ? (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <XIcon className="w-8 h-8 text-white" />
                        <div>
                          <div className="text-white font-medium">
                            {getIdentityDisplayName(linkedIdentities.find(id => id.provider === 'x')!)}
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
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={handleLinkX}
                        disabled={isLinking === 'x'}
                      >
                        {isLinking === 'x' ? 'Linking...' : 'Connect X'}
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