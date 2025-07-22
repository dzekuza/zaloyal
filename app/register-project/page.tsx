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
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import ImageUpload from "@/components/image-upload"
import WalletConnect from "@/components/wallet-connect"
import { useRouter } from "next/navigation"
import BackgroundWrapper from "@/components/BackgroundWrapper";
import AuthRequired from "@/components/auth-required";
import { toast } from 'sonner';

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
  discordUrl: string
  telegramUrl: string
  githubUrl: string
  mediumUrl: string

  // Step 4: Images & Additional Info
  logoUrl: string
  coverImageUrl: string
  additionalInfo: string
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

export default function RegisterProject() {
  const [isClient, setIsClient] = useState(false);
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
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
    discordUrl: "",
    telegramUrl: "",
    githubUrl: "",
    mediumUrl: "",
    logoUrl: "",
    coverImageUrl: "",
    additionalInfo: "",
  })
  const router = useRouter()
  const [unlinkingDiscord, setUnlinkingDiscord] = useState(false)
  const discordInfo = emailUser?.profile?.discord_id ? {
    id: emailUser.profile.discord_id,
    username: emailUser.profile.discord_username,
    avatar: emailUser.profile.discord_avatar_url,
  } : null

  const currentUser = walletUser || emailUser

  console.log('walletUser:', walletUser);
  console.log('walletAuth.getCurrentUser():', walletAuth.getCurrentUser());

  useEffect(() => {
    setIsClient(true);
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user)
      setLoading(false)
    })

    // Check for email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
      }
      setLoading(false)
    }
    checkEmailAuth()

    return () => unsubscribeWallet()
  }, [])
  
  // Authentication check
  if (!loading && !walletUser && !emailUser) {
    return (
      <BackgroundWrapper>
        <AuthRequired 
          title="Sign In Required"
          message="Please sign in with your email or wallet to register your project."
          onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
        />
      </BackgroundWrapper>
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
    // Ensure user is authenticated (wallet or email)
    if (!currentUser) {
      alert("Please connect your wallet or sign in with email first");
      return;
    }

    // Ensure Supabase Auth session is present
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) {
      alert("You must be signed in with Supabase Auth to submit a project application.");
      setSubmitting(false);
      return;
    }

    setSubmitting(true)

    try {
      let userId: string | null = null;
      let walletAddress: string | null = null;
      let email: string | null = null;
      let userData = null;
      let userError = null;

      if (walletUser) {
        // Wallet user: get wallet address from JWT or walletUser
        const { data: { user: authUser } } = await supabase.auth.getUser();
        walletAddress = authUser?.user_metadata?.wallet_address || walletUser.walletAddress;
        if (walletAddress) {
          // Query with both sides lowercased
          const result = await supabase
            .from("users")
            .select("id,email")
            .ilike("wallet_address", walletAddress)
            .single();
          userData = result.data;
          userError = result.error;
          // If not found by wallet, try by email
          if ((!userData || userError) && authUser?.email) {
            const emailResult = await supabase
              .from("users")
              .select("id")
              .eq("email", authUser.email.toLowerCase())
              .single();
            userData = emailResult.data;
            userError = emailResult.error;
          }
        }
      }
      if (!userData || userError) {
        throw new Error("User not found");
      }
      userId = userData.id;

      // Submit project directly to projects table and return the new project
      const { data: insertedProjects, error: projectError } = await supabase.from("projects").insert({
        owner_id: userId,
        name: formData.name,
        description: formData.description,
        website_url: formData.websiteUrl,
        logo_url: formData.logoUrl || null,
        cover_image_url: formData.coverImageUrl || null,
        contract_address: formData.contractAddress ? formData.contractAddress : null,
        blockchain_network: formData.blockchainNetwork,
        twitter_url: formData.twitterUrl || null,
        discord_url: formData.discordUrl || null,
        telegram_url: formData.telegramUrl || null,
        github_url: formData.githubUrl || null,
        medium_url: formData.mediumUrl || null,
        category: formData.category,
        status: 'approved', // Make project live immediately
      }).select().single();

      if (projectError) {
        console.error('Project registration error:', projectError);
        alert('Failed to submit project: ' + (projectError.message || JSON.stringify(projectError)));
        throw projectError;
      }

      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_project', 'true');
      }

      setCreatedProjectId(insertedProjects?.id || null);
      setSubmitted(true)
      toast.success('Project created!');
    } catch (error) {
      console.error("Project registration error:", error)
      alert("Failed to submit project application. Please try again.")
      toast.error('Failed to submit project application.');
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
            setEmailUser({ ...user, profile })
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
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    )
  }

  if (!loading && !walletUser) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm p-8 max-w-md">
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
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm p-8 max-w-md">
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
      </div>
    )
  }

  const progress = (currentStep / 4) * 100

  return (
    <BackgroundWrapper>
      <div className="container mx-auto px-4 py-8 pb-20">
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
                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="text-white flex items-center gap-2">
                        <Twitter className="w-4 h-4" />
                        Twitter
                      </Label>
                      <Input
                        id="twitter"
                        value={formData.twitterUrl}
                        onChange={(e) => handleInputChange("twitterUrl", e.target.value)}
                        placeholder="https://twitter.com/yourproject"
                        className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discord" className="text-white flex items-center gap-2">
                        <MessageSquare className="w-4 h-4" />
                        Discord
                      </Label>
                      {discordInfo ? (
                        <div className="flex items-center gap-3">
                          {discordInfo.avatar && (
                            <img src={discordInfo.avatar} alt="Discord Avatar" className="w-8 h-8 rounded-full" />
                          )}
                          <span className="text-white font-medium">{discordInfo.username}</span>
                          <Button
                            className="bg-red-600 hover:bg-red-700 text-white border-0 ml-2"
                            onClick={handleUnlinkDiscord}
                            disabled={unlinkingDiscord}
                          >
                            {unlinkingDiscord ? 'Unlinking...' : 'Unlink Discord'}
                          </Button>
                        </div>
                      ) : (
                        <Button
                          className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                          onClick={() => supabase.auth.linkIdentity({ provider: 'discord' })}
                        >
                          Connect Discord
                        </Button>
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
                        maxSizeMB={2}
                        label="Upload Project Logo"
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
                        maxSizeMB={5}
                        label="Upload Cover Image"
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
      </div>
    </BackgroundWrapper>
  )
}
