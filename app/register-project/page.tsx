"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select"
import { Progress } from "@/components/ui/progress"
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Twitter,
  MessageSquare,
  Github,
  FileText,
  CheckCircle,
  Globe,
  LinkIcon,
  Upload,
  Info,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { storageService } from "@/lib/storage"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import ImageUpload from "@/components/image-upload"
import WalletConnect from "@/components/wallet-connect"
import { useRouter } from "next/navigation"

import AuthWrapper from "@/components/auth-wrapper";
import PageContainer from "@/components/PageContainer";
import { toast } from 'sonner';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/components/auth-provider-wrapper";
import { DiscordIcon, XIcon } from "@/components/discord-icon"
import WalletIcon from "@/components/wallet-icon"

interface ProjectForm {
  // Step 1: Basic Info
  name: string
  description: string
  category: string
  websiteUrl: string

  // Step 2: Smart Contract
  contractAddress: string
  blockchainNetwork: string

  // Step 3: Social Media
  twitterUrl: string
  twitterUsername: string
  discordUrl: string
  telegramUrl: string
  githubUrl: string
  mediumUrl: string

  // Step 4: Images & Additional Info
  logoUrl: string
  coverImageUrl: string
  additionalInfo: string
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

const blockchainNetworks = [
  { value: "solana", label: "Solana", icon: "/solana.svg" },
  { value: "ethereum", label: "Ethereum", icon: "/ethereum.svg" },
  { value: "polygon", label: "Polygon", icon: "/polygon.svg" },
  { value: "bsc", label: "Binance Smart Chain", icon: "/bsc.svg" },
  { value: "arbitrum", label: "Arbitrum", icon: "/arbitrum.svg" },
  { value: "optimism", label: "Optimism", icon: "/optimism.svg" },
  { value: "avalanche", label: "Avalanche", icon: "/avalanche.svg" },
]

const projectCategories = [
  "DeFi",
  "NFT",
  "Gaming",
  "Infrastructure",
  "Social",
  "Education",
  "DAO",
  "Metaverse",
  "Trading",
  "RWA",
  "Meme",
  "TradFi",
  "Other",
]

const steps = [
  { id: 1, title: "Basic Information", description: "Tell us about your project" },
  { id: 2, title: "Smart Contract", description: "Blockchain and contract details" },
  { id: 3, title: "Social Media", description: "Connect your social presence" },
  { id: 4, title: "Images & Details", description: "Upload images and additional info" },
]

function RegisterProjectContent() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isClient, setIsClient] = useState(false);
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null)
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<ProjectForm>({
    name: "",
    description: "",
    category: "",
    websiteUrl: "",
    contractAddress: "",
    blockchainNetwork: "",
    twitterUrl: "",
    twitterUsername: "",
    discordUrl: "",
    telegramUrl: "",
    githubUrl: "",
    mediumUrl: "",
    logoUrl: "",
    coverImageUrl: "",
    additionalInfo: "",
  })
  const router = useRouter()
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)
  const discordInfo = user?.profile?.discord_id ? {
    username: user.profile.discord_username || "Discord User",
    avatar: user.profile.discord_avatar_url,
  } : null

  const currentUser = user

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
      
      if (twitterIdentity && !formData.twitterUrl) {
        setFormData(prev => ({
          ...prev,
          twitterUrl: `https://twitter.com/${twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name}`
        }));
      }
      if (twitterIdentity && !formData.twitterUsername) {
        setFormData(prev => ({
          ...prev,
          twitterUsername: twitterIdentity.identity_data?.user_name || twitterIdentity.identity_data?.screen_name || ''
        }));
      }
      if (discordIdentity && !formData.discordUrl) {
        setFormData(prev => ({
          ...prev,
          discordUrl: `https://discord.gg/${discordIdentity.identity_data?.user_name || discordIdentity.identity_data?.screen_name}`
        }));
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link Discord account. Please try again.",
        variant: "destructive",
      });
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
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link X account. Please try again.",
        variant: "destructive",
      });
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

  useEffect(() => {
    setIsClient(true);
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      // setWalletUser(user) // This line is no longer needed as user is managed by useAuth
      setLoading(false)
    })

    // Check for email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        // setEmailUser({ ...user, profile }) // This line is no longer needed as user is managed by useAuth
      }
      setLoading(false)
    }
    checkEmailAuth()

    return () => unsubscribeWallet()
  }, [])
  


  // Show loading while auth is being checked
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Loading...</p>
        </div>
      </div>
    )
  }

  const handleInputChange = (field: keyof ProjectForm, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const validateStep = (step: number) => {
    switch (step) {
      case 1:
        return formData.name && formData.description && formData.category && formData.websiteUrl
      case 2:
        return formData.blockchainNetwork // Only blockchainNetwork is required
      case 3:
        return true // Social media is optional
      case 4:
        return true // Images and additional info are optional
      default:
        return false
    }
  }

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < 4) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSubmit = async () => {
    if (!user) {
      alert("Please sign in first");
      return;
    }

    // Ensure Supabase Auth session is present
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      alert("You must be signed in with Supabase Auth to submit a project application.");
      return;
    }

    setSubmitting(true)

    try {
      let userId: string | null = null;
      let userData = null;

      // Try to get user by email first (for email auth users)
      if (user.email) {
        const { data: userDataEmail, error: errorEmail } = await supabase
          .from("users")
          .select("id,email")
          .eq("email", user.email.toLowerCase())
          .single()
        
        if (userDataEmail && !errorEmail) {
          userId = userDataEmail.id
          userData = userDataEmail
        }
      }
      
      // If not found by email, try by wallet address (for wallet auth users)
      if (!userId && user.id) {
        const { data: userDataWallet, error: errorWallet } = await supabase
          .from("users")
          .select("id,email")
          .eq("wallet_address", user.id.toLowerCase())
          .single()
        
        if (userDataWallet && !errorWallet) {
          userId = userDataWallet.id
          userData = userDataWallet
        }
      }
      
      // If still not found, try to create user via API
      if (!userId) {
        try {
          const res = await fetch("/api/users/upsert", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              email: user.email,
              username: user.username,
              avatar_url: user.avatar_url,
              bio: user.bio,
            }),
          })
          if (res.ok) {
            const { user: newUser } = await res.json()
            userId = newUser.id
            userData = newUser
          }
        } catch (e) {
          console.error("Error creating user:", e)
        }
      }
      
      if (!userId) {
        throw new Error("User not found");
      }

      // Fetch the current user's X fields
      let x_username: string | null = null, x_id: string | null = null, x_avatar_url: string | null = null;
      if (user?.profile) {
        // Note: X-specific fields were removed from users table in migrations
        // These fields are now stored in social_accounts table
        x_username = null; // Will be fetched from social_accounts if needed
        x_id = null; // Will be fetched from social_accounts if needed
        x_avatar_url = null; // Will be fetched from social_accounts if needed
      } else if (user) {
        // If wallet users can have X, add logic here
      }
      // Create the project with X fields
      const projectData = {
        owner_id: userId,
        name: formData.name,
        description: formData.description,
        website_url: formData.websiteUrl || null,
        logo_url: formData.logoUrl || null,
        cover_image_url: formData.coverImageUrl || null,
        contract_address: formData.contractAddress || null,
        blockchain_network: formData.blockchainNetwork || null,
        twitter_url: formData.twitterUrl || null,
        twitter_username: formData.twitterUsername || null,
        discord_url: formData.discordUrl || null,
        telegram_url: formData.telegramUrl || null,
        github_url: formData.githubUrl || null,
        medium_url: formData.mediumUrl || null,
        category: formData.category,
        additional_info: formData.additionalInfo || null,
        status: 'approved', // Make project live immediately
      };

      console.log('Creating project with data:', {
        ...projectData,
        x_username: x_username,
        x_id: x_id
      });

      const { data: insertedProjects, error: projectError } = await supabase
        .from("projects")
        .insert(projectData)
        .select()
        .single();

      if (projectError) {
        console.error('Project registration error:', projectError);
        
        // Check if it's a schema issue
        if (projectError.message && projectError.message.includes('twitter_url')) {
          alert('Database schema issue detected. Please run the schema migration script first.');
          console.error('Schema issue - missing twitter_url column');
        } else {
          alert('Failed to submit project: ' + (projectError.message || JSON.stringify(projectError)));
        }
        throw projectError;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_project', 'true');
      }

      // Move uploaded images from temp to actual project folder
      if (insertedProjects?.id) {
        try {
          // Move logo if it exists
          if (formData.logoUrl && formData.logoUrl.includes('/temp/')) {
            const newLogoUrl = await storageService.moveTempImage(formData.logoUrl, insertedProjects.id, 'logo');
            if (newLogoUrl) {
              formData.logoUrl = newLogoUrl;
            }
          }
          
          // Move cover if it exists
          if (formData.coverImageUrl && formData.coverImageUrl.includes('/temp/')) {
            const newCoverUrl = await storageService.moveTempImage(formData.coverImageUrl, insertedProjects.id, 'cover');
            if (newCoverUrl) {
              formData.coverImageUrl = newCoverUrl;
            }
          }
          
          // Update project with new image URLs
          await supabase
            .from("projects")
            .update({
              logo_url: formData.logoUrl,
              cover_image_url: formData.coverImageUrl
            })
            .eq("id", insertedProjects.id);
        } catch (error) {
          console.error("Error moving images:", error);
          // Don't fail the submission if image move fails
        }
      }

      setCreatedProjectId(insertedProjects?.id || null);
      setSubmitted(true)
      toast({
        title: "Success",
        description: "Project created!",
        variant: "default",
      });
    } catch (error) {
      console.error("Project registration error:", error)
      alert("Failed to submit project application. Please try again.")
      toast({
        title: "Error",
        description: "Failed to submit project application.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false)
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
          // Refetch user info after unlink
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
            // setEmailUser({ ...user, profile }) // This line is no longer needed as user is managed by useAuth
          }
        }
      }
    } finally {
      setUnlinkingDiscord(false)
    }
  }

  if (!isClient) {
    return null; // or a loading spinner
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!loading && !user) {
    return (
      <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm p-8 max-w-md mx-auto">
        <div className="text-center">
          <Building2 className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Wallet Required</h2>
          <p className="text-gray-300 mb-6">You need to link your wallet in your profile before you can register a project.</p>
          <Link href="/profile">
            <Button className="bg-green-600 hover:bg-green-700 text-white border-0">
              Go to Profile
            </Button>
          </Link>
        </div>
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm p-8 max-w-md mx-auto">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 mx-auto text-green-400 mb-4" />
          <h2 className="text-2xl font-bold text-white mb-4">Application Submitted!</h2>
          <p className="text-gray-300 mb-6">
            Your project application has been submitted for review. You'll be notified once it's approved.
          </p>
          <div className="flex flex-col gap-2">
            {createdProjectId ? (
              <Link href={`/project/${createdProjectId}`}>
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                  View My Project
                </Button>
              </Link>
            ) : null}
            <Link href="/dashboard">
              <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                Go to Dashboard
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    )
  }

  const progress = (currentStep / 4) * 100

  return (
    <PageContainer className="pb-20">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Register Your Project</h1>
            <p className="text-gray-400">
              Step {currentStep} of 4: {steps[currentStep - 1].description}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            {steps.map((step) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step.id <= currentStep
                      ? "bg-[#111111] border border-[#282828] text-white"
                      : "bg-[#222] text-gray-500 border border-[#282828]"
                  }`}
                >
                  {step.id < currentStep ? <CheckCircle className="w-4 h-4" /> : step.id}
                </div>
                <div className="ml-2 hidden sm:block">
                  <div className={`text-sm font-medium ${step.id <= currentStep ? "text-white" : "text-gray-500"}`}>
                    {step.title}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Progress value={progress} className="h-2 bg-gray-700" />
        </div>

        <div className="max-w-2xl mx-auto">
          <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                {steps[currentStep - 1].title}
              </CardTitle>
              <CardDescription className="text-gray-300">{steps[currentStep - 1].description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Basic Information */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      Project Name *
                    </Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      placeholder="Enter your project name"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Description *
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange("description", e.target.value)}
                      placeholder="Describe your project, its mission, and what makes it unique"
                      rows={4}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-white flex items-center gap-2">
                        <Globe className="w-4 h-4" />
                        Website URL *
                      </Label>
                      <Input
                        id="website"
                        value={formData.websiteUrl}
                        onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                        placeholder="https://yourproject.com"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-white flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Category *
                      </Label>
                      <Select value={formData.category} onValueChange={value => setFormData(prev => ({ ...prev, category: value }))}>
                        <SelectTrigger className="bg-[#181818] border-[#282828] text-white rounded-md px-4 py-2 focus:ring-2 focus:ring-green-500">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#064e3b] border-[#282828] text-white rounded-md">
                          {projectCategories.map((cat) => (
                            <SelectItem key={cat} value={cat} className="text-white hover:bg-green-700 cursor-pointer">
                              {cat}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Smart Contract */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="blockchain" className="text-white flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Blockchain Network *
                    </Label>
                    <Select
                      value={formData.blockchainNetwork}
                      onValueChange={(value) => handleInputChange("blockchainNetwork", value)}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select blockchain" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                        {blockchainNetworks.map((network) => (
                          <SelectItem
                            key={network.value}
                            value={network.value}
                            className="text-white hover:bg-[#06351f] flex items-center gap-2"
                          >
                            <img src={network.icon} alt={network.label + " logo"} className="w-5 h-5 mr-2 inline-block align-middle" />
                            {network.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contract" className="text-white flex items-center gap-2">
                      <LinkIcon className="w-4 h-4" />
                      Contract Address {/* No asterisk, now optional */}
                    </Label>
                    <Input
                      id="contract"
                      value={formData.contractAddress}
                      onChange={(e) => handleInputChange("contractAddress", e.target.value)}
                      placeholder="0x..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-400 flex items-start gap-2">
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      Provide your main token or protocol contract address for verification (optional)
                    </p>
                  </div>
                </div>
              )}

              {/* Step 3: Social Media */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Twitter URL */}
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="text-white flex items-center gap-2">
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </Label>
                      {linkedIdentities.find(id => id.provider === 'x') ? (
                        <Input
                          id="twitter"
                          value={formData.twitterUrl}
                          onChange={(e) => handleInputChange("twitterUrl", e.target.value)}
                          placeholder="https://twitter.com/yourproject"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
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
                      <Label htmlFor="twitterUsername" className="text-white flex items-center gap-2">
                        <Twitter className="w-4 h-4" />
                        Twitter Username
                      </Label>
                      {linkedIdentities.find(id => id.provider === 'x') ? (
                        <Input
                          id="twitterUsername"
                          value={formData.twitterUsername}
                          onChange={(e) => handleInputChange("twitterUsername", e.target.value)}
                          placeholder="e.g. belinkxyz"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
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
                      <Label htmlFor="discord" className="text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Discord
                      </Label>
                      {linkedIdentities.find(id => id.provider === 'discord') ? (
                        <Input
                          id="discord"
                          value={formData.discordUrl}
                          onChange={(e) => handleInputChange("discordUrl", e.target.value)}
                          placeholder="https://discord.gg/yourproject"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
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
                      <Label htmlFor="telegram" className="text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Telegram
                      </Label>
                      <Input
                        id="telegram"
                        value={formData.telegramUrl}
                        onChange={(e) => handleInputChange("telegramUrl", e.target.value)}
                        placeholder="https://t.me/yourproject"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="github" className="text-white flex items-center gap-2">
                        <Github className="w-4 h-4" />
                        GitHub
                      </Label>
                      <Input
                        id="github"
                        value={formData.githubUrl}
                        onChange={(e) => handleInputChange("githubUrl", e.target.value)}
                        placeholder="https://github.com/yourproject"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="medium" className="text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Medium/Blog
                    </Label>
                    <Input
                      id="medium"
                      value={formData.mediumUrl}
                      onChange={(e) => handleInputChange("mediumUrl", e.target.value)}
                      placeholder="https://medium.com/@yourproject"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Step 4: Images & Additional Info */}
              {currentStep === 4 && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-white flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Project Logo
                      </Label>
                      <ImageUpload
                        onImageUploaded={(url) => handleInputChange("logoUrl", url)}
                        onImageRemoved={() => handleInputChange("logoUrl", "")}
                        currentImage={formData.logoUrl}
                        uploadType="project-logo"
                        entityId={createdProjectId || "temp"}
                        maxSizeMB={2}
                        label="Upload Project Logo"
                        height="h-32"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white flex items-center gap-2">
                        <Upload className="w-4 h-4" />
                        Cover Image
                      </Label>
                      <ImageUpload
                        onImageUploaded={(url) => handleInputChange("coverImageUrl", url)}
                        onImageRemoved={() => handleInputChange("coverImageUrl", "")}
                        currentImage={formData.coverImageUrl}
                        uploadType="project-cover"
                        entityId={createdProjectId || "temp"}
                        maxSizeMB={5}
                        label="Upload Cover Image"
                        height="h-48"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additional" className="text-white flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Additional Information
                    </Label>
                    <Textarea
                      id="additional"
                      value={formData.additionalInfo}
                      onChange={(e) => handleInputChange("additionalInfo", e.target.value)}
                      placeholder="Tell us about your team, roadmap, achievements, or anything else relevant..."
                      rows={4}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6 gap-2">
                <Button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>

                {currentStep < 4 ? (
                  <Button
                    onClick={nextStep}
                    disabled={!validateStep(currentStep)}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
                  >
                    {submitting ? "Submitting..." : "Submit Application"}
                    <CheckCircle className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
  )
}

export default function RegisterProject() {
  return (
    <AuthWrapper
      requireAuth={true}
      title="Sign In Required"
      message="Please sign in with your email or wallet to register your project."
      onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
    >
      <RegisterProjectContent />
    </AuthWrapper>
  )
}
