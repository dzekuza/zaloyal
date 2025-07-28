"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import ImageUpload from "@/components/image-upload"
import AvatarUpload from "@/components/avatar-upload"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuth } from "@/components/auth-provider-wrapper"
// DiscordIcon component
const DiscordIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 256 199" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid">
    <path d="M216.856 16.597A208.502 208.502 0 0 0 164.042 0c-2.275 4.113-4.933 9.645-6.766 14.046-19.692-2.961-39.203-2.961-58.533 0-1.832-4.4-4.55-9.933-6.846-14.046a207.809 207.809 0 0 0-52.855 16.638C5.618 67.147-3.443 116.4 1.087 164.956c22.169 16.555 43.653 26.612 64.775 33.193A161.094 161.094 0 0 0 79.735 175.3a136.413 136.413 0 0 1-21.846-10.632 108.636 108.636 0 0 0 5.356-4.237c42.122 19.702 87.89 19.702 129.51 0a131.66 131.66 0 0 0 5.355 4.237 136.07 136.07 0 0 1-21.886 10.653c4.006 8.02 8.638 15.67 13.873 22.848 21.142-6.58 42.646-16.637 64.815-33.213 5.316-56.288-9.08-105.09-38.056-148.36ZM85.474 135.095c-12.645 0-23.015-11.805-23.015-26.18s10.149-26.2 23.015-26.2c12.867 0 23.236 11.804 23.015 26.2.02 14.375-10.148 26.18-23.015 26.18Zm85.051 0c-12.645 0-23.014-11.805-23.014-26.18s10.148-26.2 23.014-26.2c12.867 0 23.236 11.804 23.015 26.2 0 14.375-10.148 26.18-23.015 26.18Z" fill="#5865F2"/>
  </svg>
)

// XIcon component
const XIcon = ({ className = "w-4 h-4" }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
)
import WalletIcon from "@/components/wallet-icon"

interface EditProjectFormProps {
  project: any;
  onSave?: () => void;
}

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

export default function EditProjectForm({ project, onSave }: EditProjectFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(project.name || "")
  const [description, setDescription] = useState(project.description || "")
  const [category, setCategory] = useState(project.category || "")
  const [websiteUrl, setWebsiteUrl] = useState(project.website_url || "")
  const [logoUrl, setLogoUrl] = useState(project.logo_url || "")
  const [coverImageUrl, setCoverImageUrl] = useState(project.cover_image_url || "")
  const [twitterUrl, setTwitterUrl] = useState(project.twitter_url || "")
  const [twitterUsername, setTwitterUsername] = useState(project.twitter_username || "")
  const [discordUrl, setDiscordUrl] = useState(project.discord_url || "")
  const [telegramUrl, setTelegramUrl] = useState(project.telegram_url || "")
  const [githubUrl, setGithubUrl] = useState(project.github_url || "")
  const [mediumUrl, setMediumUrl] = useState(project.medium_url || "")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  
  // Social account linking states
  const [linkedIdentities, setLinkedIdentities] = useState<LinkedIdentity[]>([])
  const [isLinking, setIsLinking] = useState<string | null>(null)

  // Fetch linked social accounts
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
      
      // Pre-populate social links if accounts are linked
      const twitterIdentity = linkedIdentities.find(id => id.provider === 'x');
      const discordIdentity = linkedIdentities.find(id => id.provider === 'discord');
      
      if (twitterIdentity && !twitterUrl) {
        setTwitterUrl(`https://twitter.com/${twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name}`);
      }
      if (twitterIdentity && !twitterUsername) {
        setTwitterUsername(twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name || '');
      }
      if (discordIdentity && !discordUrl) {
        setDiscordUrl(`https://discord.gg/${discordIdentity.identity_data?.user_name || discordIdentity.identity_data?.screen_name}`);
      }
      
    } catch (error) {
      console.error('Error fetching linked identities:', error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLinkedIdentities();
    }
  }, [user]);

  // Link Discord account
  const handleLinkDiscord = async () => {
    setIsLinking('discord');
    try {
      console.log('DEBUG: Initiating Discord OAuth via Supabase Auth');

      // Clear any existing OAuth state
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
      
      // Generate a unique state parameter
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('oauth_state', state)

      if (!user) {
        throw new Error('Please log in with your email first.');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log('Discord OAuth initiated successfully');
    } catch (error) {
      console.error('Discord linking error:', error);
      setError(error instanceof Error ? error.message : "Failed to link Discord account. Please try again.");
    } finally {
      setIsLinking(null);
    }
  };

  // Link X (Twitter) account
  const handleLinkX = async () => {
    setIsLinking('x');
    try {
      console.log('DEBUG: Initiating X OAuth via Supabase Auth');

      // Clear any existing OAuth state
      localStorage.removeItem('supabase.auth.token')
      sessionStorage.removeItem('supabase.auth.token')
      
      // Generate a unique state parameter
      const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      sessionStorage.setItem('oauth_state', state)

      if (!user) {
        throw new Error('Please log in with your email first.');
      }

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });

      if (error) {
        throw error;
      }

      console.log('X OAuth initiated successfully');
    } catch (error) {
      console.error('X linking error:', error);
      setError(error instanceof Error ? error.message : "Failed to link X account. Please try again.");
    } finally {
      setIsLinking(null);
    }
  };

  const getIdentityDisplayName = (identity: LinkedIdentity) => {
    return identity.identity_data?.user_name || 
           identity.identity_data?.screen_name || 
           identity.identity_data?.name || 
           'Unknown User';
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Project name is required")
      return
    }

    if (!description.trim()) {
      setError("Project description is required")
      return
    }

    setSaving(true)
    setError("")
    setSuccess("")
    
    try {
      const { error: updateError } = await supabase.from("projects").update({
        name: name.trim(),
        description: description.trim(),
        category: category.trim(),
        website_url: websiteUrl.trim() || null,
        logo_url: logoUrl,
        cover_image_url: coverImageUrl,
        twitter_url: twitterUrl.trim() || null,
        twitter_username: twitterUsername.trim() || null,
        discord_url: discordUrl.trim() || null,
        telegram_url: telegramUrl.trim() || null,
        github_url: githubUrl.trim() || null,
        medium_url: mediumUrl.trim() || null,
      }).eq("id", project.id)
      
      if (updateError) throw updateError
      
      setSuccess("Project updated successfully!")
      if (onSave) onSave()
    } catch (e: any) {
      setError(e.message || "Failed to update project")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form
      className="space-y-6 w-full px-6 pb-6"
      style={{ scrollbarGutter: 'stable' }}
      onSubmit={e => { e.preventDefault(); handleSave(); }}
    >
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert variant="default">
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-6">
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Project Name</label>
          <Input 
            value={name} 
            onChange={e => setName(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="Enter project name"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Description</label>
          <Textarea 
            value={description} 
            onChange={e => setDescription(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            rows={3}
            placeholder="Describe your project"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Category</label>
          <Input 
            value={category} 
            onChange={e => setCategory(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="e.g., DeFi, NFT, Gaming"
            required 
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-white block mb-1 font-medium">Website URL</label>
          <Input 
            value={websiteUrl} 
            onChange={e => setWebsiteUrl(e.target.value)} 
            className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
            placeholder="https://yourproject.com"
            type="url"
          />
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2 flex flex-col items-start">
            <label className="text-white block mb-1 font-medium">Project Logo</label>
            <div className="mb-2">
              <AvatarUpload
                onAvatarUploaded={setLogoUrl}
                currentAvatar={logoUrl}
                userId={project.id}
                size="md"
                className="mx-auto"
              />
            </div>
          </div>
          
          <div className="space-y-2 flex flex-col items-start">
            <label className="text-white block mb-1 font-medium">Cover Image</label>
            <div className="w-full">
              <ImageUpload
                onImageUploaded={setCoverImageUrl}
                onImageRemoved={() => setCoverImageUrl("")}
                currentImage={coverImageUrl}
                maxSizeMB={5}
                label="Upload Cover"
              />
            </div>
          </div>
        </div>

        {/* Social Links */}
        <div className="space-y-4">
          <h3 className="text-white font-medium">Social Links</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Twitter URL */}
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Twitter</label>
              {linkedIdentities.find(id => id.provider === 'x') ? (
                <Input 
                  value={twitterUrl} 
                  onChange={e => setTwitterUrl(e.target.value)} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                  placeholder="https://twitter.com/yourproject"
                  type="url"
                />
              ) : (
                <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                  <div className="flex items-center gap-3">
                    <XIcon className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="text-white font-medium">X (Twitter)</div>
                      <div className="text-sm text-gray-400">Not connected</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={handleLinkX}
                    disabled={isLinking === 'x'}
                  >
                    {isLinking === 'x' ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Twitter Username */}
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Twitter Username</label>
              {linkedIdentities.find(id => id.provider === 'x') ? (
                <Input 
                  value={twitterUsername} 
                  onChange={e => setTwitterUsername(e.target.value)} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                  placeholder="e.g. belinkxyz"
                />
              ) : (
                <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                  <div className="flex items-center gap-3">
                    <XIcon className="w-6 h-6 text-gray-400" />
                    <div>
                      <div className="text-white font-medium">X (Twitter)</div>
                      <div className="text-sm text-gray-400">Not connected</div>
                    </div>
                  </div>
                  <Button 
                    variant="outline"
                    size="sm"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    onClick={handleLinkX}
                    disabled={isLinking === 'x'}
                  >
                    {isLinking === 'x' ? 'Connecting...' : 'Connect'}
                  </Button>
                </div>
              )}
            </div>
            
            {/* Discord */}
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Discord</label>
              {linkedIdentities.find(id => id.provider === 'discord') ? (
                <Input 
                  value={discordUrl} 
                  onChange={e => setDiscordUrl(e.target.value)} 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                  placeholder="https://discord.gg/yourproject"
                  type="url"
                />
              ) : (
                <div className="flex items-center justify-between p-3 bg-[#181818] rounded-lg border border-[#282828]">
                  <div className="flex items-center gap-3">
                    <DiscordIcon className="w-6 h-6 text-gray-400" />
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
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Telegram</label>
              <Input 
                value={telegramUrl} 
                onChange={e => setTelegramUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://t.me/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">GitHub</label>
              <Input 
                value={githubUrl} 
                onChange={e => setGithubUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://github.com/yourproject"
                type="url"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-white block mb-1 text-sm">Medium</label>
              <Input 
                value={mediumUrl} 
                onChange={e => setMediumUrl(e.target.value)} 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-green-500" 
                placeholder="https://medium.com/@yourproject"
                type="url"
              />
            </div>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <Button 
            type="submit" 
            disabled={saving} 
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </form>
  )
} 