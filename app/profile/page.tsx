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
import { LogOut, Copy, ExternalLink, User, Link, AlertCircle, Wallet } from "lucide-react"
import AvatarUpload from "@/components/avatar-upload"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/components/auth-provider-wrapper"
import AuthWrapper from "@/components/auth-wrapper"
import { walletAuth } from "@/lib/wallet-auth"
import WalletIcon from "@/components/wallet-icon"

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

function ProfileContent() {
  const { user, signOut, clearAuthState, clearOAuthState } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  const [linkedIdentities, setLinkedIdentities] = useState<LinkedIdentity[]>([]);
  const [isLinking, setIsLinking] = useState<string | null>(null);
  const [isUnlinking, setIsUnlinking] = useState<string | null>(null);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSettingPassword, setIsSettingPassword] = useState(false);
  const [passwordSetSuccess, setPasswordSetSuccess] = useState(false);

  // Wallet linking state
  const [walletUser, setWalletUser] = useState<any>(null);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [isUnlinkingWallet, setIsUnlinkingWallet] = useState(false);

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
        // Get user from Supabase Auth
        const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
        
        if (authError) {
          console.error('Auth error:', authError);
          setError('Authentication error');
          setLoading(false);
          return;
        }

        if (!currentUser) {
          console.log('No authenticated user found');
          setLoading(false);
          return;
        }

        console.log('User authenticated:', currentUser.email);
        
        // Fetch user profile from database
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUser.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile fetch error:', profileError);
          setError('Failed to load profile');
          setLoading(false);
          return;
        }

        if (profileData) {
          setProfile(profileData);
          setUsername(profileData.username || '');
          setAvatarUrl(profileData.avatar_url || '');
          setBio(profileData.bio || '');
          setSocialLinks(profileData.social_links || {});
        }

        // Fetch linked identities
        await fetchLinkedIdentities();
        
        // Check wallet connection
        await checkWalletConnection();
        
        setLoading(false);
      } catch (error) {
        console.error('Error initializing profile page:', error);
        setError('Failed to initialize profile');
        setLoading(false);
      }
    };

    initializePage();
  }, []);

  // Check for wallet connection
  const checkWalletConnection = async () => {
    try {
      const walletUser = await walletAuth.getCurrentUser();
      setWalletUser(walletUser);
    } catch (error) {
      console.log('No wallet connected');
      setWalletUser(null);
    }
  };

  // Fetch linked identities when user changes
  useEffect(() => {
    if (user?.id) {
      fetchLinkedIdentities();
      // Reset password success state when user changes
      setPasswordSetSuccess(false);
    }
  }, [user?.id]);



  // 🔥 BEST PRACTICE: Fetch linked identities from Supabase Auth ONLY
  const fetchLinkedIdentities = async () => {
    try {
      // Get Auth identities first
      const { data: identities, error } = await supabase.auth.getUserIdentities();
      
      if (error) {
        console.error('Error fetching identities:', error);
      }

      const linkedIdentities: LinkedIdentity[] = [];

      // Process Auth identities
      if (identities?.identities) {
        identities.identities.forEach((identity: any) => {
          if (identity.provider === 'discord') {
            linkedIdentities.push({
              id: identity.identity_id,
              user_id: user?.id || '',
              identity_id: identity.identity_id,
              provider: 'discord',
              identity_data: {
                user_name: identity.identity_data?.username || identity.identity_data?.name,
                screen_name: identity.identity_data?.username || identity.identity_data?.name,
                name: identity.identity_data?.name || identity.identity_data?.full_name,
                avatar_url: identity.identity_data?.avatar_url || identity.identity_data?.picture,
              }
            });
          } else if (identity.provider === 'twitter') {
            linkedIdentities.push({
              id: identity.identity_id,
              user_id: user?.id || '',
              identity_id: identity.identity_id,
              provider: 'x', // Map twitter to 'x' for UI consistency
              identity_data: {
                user_name: identity.identity_data?.user_name || identity.identity_data?.screen_name,
                screen_name: identity.identity_data?.screen_name || identity.identity_data?.user_name,
                name: identity.identity_data?.name || identity.identity_data?.screen_name,
                avatar_url: identity.identity_data?.avatar_url || identity.identity_data?.profile_image_url,
              }
            });
          }
        });
      }

      // Also check social_accounts table for additional linked accounts
      if (user?.id) {
        const { data: socialAccounts, error: socialError } = await supabase
          .from('social_accounts')
          .select('*')
          .eq('user_id', user.id);

        if (socialError) {
          console.error('Error fetching social accounts:', socialError);
        } else if (socialAccounts) {
          socialAccounts.forEach((account) => {
            // Check if this account is already in linkedIdentities
            const existingIdentity = linkedIdentities.find(
              identity => identity.provider === account.platform
            );

            if (!existingIdentity) {
              // Add account from social_accounts table
              linkedIdentities.push({
                id: account.id,
                user_id: account.user_id,
                identity_id: account.account_id,
                provider: account.platform,
                identity_data: {
                  user_name: account.username || account.account_id,
                  screen_name: account.username || account.account_id,
                  name: account.username || account.account_id,
                  avatar_url: account.profile_data?.avatar_url,
                }
              });
            }
          });
        }
      }

      setLinkedIdentities(linkedIdentities);
    } catch (error) {
      console.error('Error fetching linked identities:', error);
    }
  };

  // Check for OAuth callback
  useEffect(() => {
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (error) {
      // Handle no_session error gracefully
      if (error === 'no_session') {
        console.log('No session detected, redirecting to auth');
        // Don't show error toast for no_session, just redirect
        router.replace('/profile');
        return;
      }
      
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
      // Refresh linked identities after successful linking
      setTimeout(() => {
        fetchLinkedIdentities();
      }, 1000);
      router.replace('/profile');
    }
  }, [searchParams, router, toast]);

  const discordInfo = user?.profile?.discord_id ? {
    id: user.profile.discord_id,
    username: user.profile.discord_username,
    avatar: user.profile.discord_avatar_url
  } : null;

  const updateUserWithIdentities = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // �� BEST PRACTICE: Get identities from Auth identities
      const { data: identitiesData, error: identitiesError } = await supabase.auth.getUserIdentities();
      
      if (identitiesError) {
        console.error('Error getting user identities:', identitiesError);
        return;
      }

      const identities: LinkedIdentity[] = [];
      
      // Process each identity from Auth
      identitiesData?.identities?.forEach((identity: any) => {
        if (identity.provider === 'discord') {
          identities.push({
            id: `discord-${user.id}`,
            user_id: user.id,
            identity_id: identity.identity_id,
            provider: 'discord',
            identity_data: {
              user_name: identity.identity_data?.username || identity.identity_data?.name,
              screen_name: identity.identity_data?.username || identity.identity_data?.name,
              name: identity.identity_data?.name || identity.identity_data?.full_name,
              avatar_url: identity.identity_data?.avatar_url || identity.identity_data?.picture,
            }
          });
        } else if (identity.provider === 'twitter') {
          identities.push({
            id: `twitter-${user.id}`,
            user_id: user.id,
            identity_id: identity.identity_id,
            provider: 'x', // Map twitter to 'x' for UI consistency
            identity_data: {
              user_name: identity.identity_data?.user_name || identity.identity_data?.screen_name,
              screen_name: identity.identity_data?.screen_name || identity.identity_data?.user_name,
              name: identity.identity_data?.name || identity.identity_data?.full_name,
              avatar_url: identity.identity_data?.profile_image_url || identity.identity_data?.avatar_url,
            }
          });
        }
      });

      setLinkedIdentities(identities);
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
      // 🔥 BEST PRACTICE: Get user from Supabase Auth
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error("User not authenticated");
      }

      // 🔥 BEST PRACTICE: Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          username: username,
          bio: bio,
          social_links: socialLinks,
          avatar_url: avatarUrl
        }
      });

      if (updateError) {
        setError("Failed to update profile: " + updateError.message);
        return;
      }

      // Update local profile state
      setProfile({
        ...profile,
        username: username,
        bio: bio,
        social_links: socialLinks,
        avatar_url: avatarUrl
      });

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

      // Check if Discord is already linked
      const existingDiscord = linkedIdentities.find(identity => identity.provider === 'discord');
      if (existingDiscord) {
        toast({
          title: "Already Linked",
          description: "Discord account is already linked to your profile.",
          variant: "destructive",
        });
        return;
      }

      // Use Supabase's native Discord OAuth with basic scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
          scopes: 'identify email'
        }
      });

      if (error) {
        throw error;
      }

      console.log('Discord OAuth initiated successfully for account linking');
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

  // Link wallet to current user
  const handleLinkWallet = async () => {
    setIsLinkingWallet(true);
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

      // Check if wallet is already linked
      if (walletUser) {
        toast({
          title: "Already Linked",
          description: "Wallet is already linked to your profile.",
          variant: "destructive",
        });
        return;
      }

      // Use wallet auth to link wallet
      const walletAddress = await walletAuth.linkWalletToCurrentUser();
      
      // Update local state
      setWalletUser({ walletAddress });
      
      toast({
        title: "Success",
        description: `Wallet ${walletAddress.substring(0, 8)}...${walletAddress.substring(-6)} linked successfully!`,
      });

    } catch (error) {
      console.error('Wallet linking error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link wallet. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLinkingWallet(false);
    }
  };

  // Unlink wallet from current user
  const handleUnlinkWallet = async () => {
    setIsUnlinkingWallet(true);
    try {
      if (!walletUser) {
        throw new Error('No wallet found to unlink');
      }

      // Use wallet auth to unlink wallet
      await walletAuth.unlinkWalletFromCurrentUser();
      
      // Update local state
      setWalletUser(null);
      
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
      setIsUnlinkingWallet(false);
    }
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
      // 🔥 BEST PRACTICE: Get user from Supabase Auth
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error("User not authenticated");
      }

      // 🔥 BEST PRACTICE: Update user metadata in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        data: {
          avatar_url: avatarUrl // full public URL
        }
      });

      if (updateError) {
        setError("Failed to update avatar in profile: " + updateError.message);
        return;
      }

      // Update local profile state
      setProfile({
        ...profile,
        avatar_url: avatarUrl
      });

      console.log('Avatar updated successfully in Supabase Auth');
    } catch (e: any) {
      setError(e.message || "Failed to update avatar in profile");
    }
  };

  // Delete account handler
  const handleDeleteAccount = async () => {
    try {
      // 🔥 BEST PRACTICE: Get user from Supabase Auth
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !currentUser) {
        throw new Error("User not authenticated");
      }

      // 🔥 BEST PRACTICE: Delete user from Supabase Auth
      // Note: This requires admin privileges, so we'll just sign out the user
      // For actual account deletion, you'd need a server-side API endpoint
      await supabase.auth.signOut();
      
      // Clear local state
      clearAuthState();
      
      // Redirect to home
      window.location.href = "/";
    } catch (e: any) {
      alert("Failed to delete account. Please try again or contact support.");
    } finally {
      setDeleting(false);
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

  // Helper function to check if user has email/password authentication
  const hasEmailPasswordAuth = () => {
    return (user as any)?.app_metadata?.provider === 'email' || (user as any)?.encrypted_password !== null;
  };

  // Helper function to check if user only has social auth
  const hasOnlySocialAuth = () => {
    const providers = (user as any)?.app_metadata?.providers || [];
    const hasEmailPassword = hasEmailPasswordAuth();
    return providers.length > 0 && !hasEmailPassword;
  };

  // Handle password setup for social auth users
  const handleSetPassword = async () => {
    if (!user?.email) {
      toast({
        title: "Error",
        description: "Email is required to set up password authentication.",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSettingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Success",
        description: "Password set successfully! You can now sign in with email and password.",
      });
      
      setShowPasswordSetup(false);
      setPassword('');
      setConfirmPassword('');
      setPasswordSetSuccess(true);
    } catch (error: any) {
      console.error('Error setting password:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSettingPassword(false);
    }
  };



  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  // Error state - if there's an error, show a simple error message
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <div className="text-center">
          <div className="text-red-400 text-xl mb-4">Something went wrong</div>
          <Button 
            onClick={() => window.location.reload()}
            className="bg-green-600 hover:bg-green-700"
          >
            Try Again
          </Button>
        </div>
      </div>
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

                {/* Password Setup for Social Auth Users */}
                {hasOnlySocialAuth() && !passwordSetSuccess && (
                  <Alert className="bg-blue-500/20 border-blue-500/30">
                    <AlertCircle className="h-4 w-4 text-blue-400" />
                    <AlertDescription className="text-blue-400">
                      You signed up with a social account. Set up a password to enable email/password sign-in.
                    </AlertDescription>
                    <div className="mt-3">
                      <Button 
                        onClick={() => setShowPasswordSetup(!showPasswordSetup)}
                        variant="outline"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                      >
                        {showPasswordSetup ? 'Cancel' : 'Set Up Password'}
                      </Button>
                    </div>
                  </Alert>
                )}

                {/* Password Set Success Message */}
                {passwordSetSuccess && (
                  <Alert className="bg-green-500/20 border-green-500/30">
                    <AlertCircle className="h-4 w-4 text-green-400" />
                    <AlertDescription className="text-green-400">
                      ✅ Password set successfully! You can now sign in with your email and password.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Password Setup Form */}
                {showPasswordSetup && hasOnlySocialAuth() && (
                  <div className="space-y-4 p-4 bg-[#181818] rounded-lg border border-[#282828]">
                    <h4 className="text-white font-medium">Set Up Password</h4>
                    <p className="text-gray-400 text-sm">
                      Create a password so you can sign in with your email address.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <label className="text-white block mb-2 text-sm font-medium">New Password</label>
                        <Input 
                          type="password"
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400" 
                          placeholder="Enter your new password"
                        />
                      </div>
                      <div>
                        <label className="text-white block mb-2 text-sm font-medium">Confirm Password</label>
                        <Input 
                          type="password"
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          className="bg-[#181818] border-[#282828] text-white placeholder:text-gray-400" 
                          placeholder="Confirm your new password"
                        />
                      </div>
                      <Button 
                        onClick={handleSetPassword}
                        disabled={isSettingPassword || !password || !confirmPassword}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isSettingPassword ? 'Setting Password...' : 'Set Password'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Profile Image Upload */}
                <div className="flex flex-col items-center">
                  {user?.id && (
                    <AvatarUpload
                      currentAvatar={avatarUrl}
                      onAvatarUploaded={handleAvatarUploaded}
                      userId={user.id}
                      size="lg"
                    />
                  )}
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
                
                {/* X Account Switching Help */}
                <Alert className="bg-blue-500/20 border-blue-500/30">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  <AlertDescription className="text-blue-400">
                    <strong>Having trouble switching X accounts?</strong> If you're getting "request token" errors when trying to connect a different X account, click the "Clear OAuth State" button above, then try connecting again.
                  </AlertDescription>
                </Alert>
                
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
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-medium text-white">Authentication Methods</h4>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {
                        fetchLinkedIdentities();
                      }}
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      Refresh
                    </Button>
                  </div>
                  
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

                  {/* Wallet Account */}
                  {walletUser ? (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <WalletIcon className="text-green-400" size="lg" />
                        <div>
                          <div className="text-white font-medium">
                            {walletUser.walletAddress.substring(0, 8)}...{walletUser.walletAddress.substring(-6)}
                          </div>
                          <div className="text-sm text-gray-400">Solana Wallet</div>
                        </div>
                      </div>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        onClick={handleUnlinkWallet}
                        disabled={isUnlinkingWallet}
                      >
                        {isUnlinkingWallet ? 'Unlinking...' : 'Unlink'}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                      <div className="flex items-center gap-3">
                        <WalletIcon className="text-gray-400" size="lg" />
                        <div>
                          <div className="text-white font-medium">Solana Wallet</div>
                          <div className="text-sm text-gray-400">Not connected</div>
                        </div>
                      </div>
                      <Button 
                        variant="outline"
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        onClick={handleLinkWallet}
                        disabled={isLinkingWallet}
                      >
                        {isLinkingWallet ? 'Connecting...' : 'Connect Wallet'}
                      </Button>
                    </div>
                  )}


                </div>


              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function ProfilePage() {
  return (
    <AuthWrapper
      requireAuth={true}
      title="Sign In Required"
      message="Please sign in with your email or wallet to access your profile and connect social accounts."
      onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
    >
      <ProfileContent />
    </AuthWrapper>
  )
} 