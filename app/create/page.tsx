"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
  Plus,
  Trash2,
  Twitter,
  ImageIcon,
  Trophy,
  Save,
  Eye,
  ArrowLeft,
  GripVertical,
  Download,
  FileText,
  BookOpen,
  Building2,
} from "lucide-react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import type { Database } from "@/lib/supabase"
import ImageUpload from "@/components/image-upload"
import AuthRequired from "@/components/auth-required"
import { extractTweetIdFromUrl, extractUsernameFromUrl } from "@/lib/twitter-utils"
import { useAuth } from "@/components/auth-provider-wrapper"

import PageContainer from "@/components/PageContainer"

interface TaskForm {
  id?: string
  type: "social" | "download" | "form" | "visit" | "learn"
  title: string
  description: string
  xpReward: number

  // Social task fields
  socialAction?: "follow" | "join" | "like" | "retweet" | "subscribe"
  socialPlatform?: string
  socialUrl?: string
  socialUsername?: string
  socialPostId?: string

  // Download task fields
  downloadUrl?: string
  downloadTitle?: string
  downloadDescription?: string

  // Form task fields
  formUrl?: string
  formTitle?: string
  formDescription?: string

  // Visit task fields
  visitUrl?: string
  visitTitle?: string
  visitDescription?: string
  visitDuration?: number

  // Learn task fields
  learnContent?: string
  learnQuestions?: Array<{
    question: string
    options: string[]
    correctAnswer: number
  }>
  learnPassingScore?: number
  // New quiz fields
  quizQuestion?: string
  quizAnswer1?: string
  quizAnswer2?: string
  quizAnswer3?: string
  quizAnswer4?: string
  quizCorrectAnswer?: number
  quizIsMultiSelect?: boolean
}

interface QuestForm {
  title: string
  description: string
  // Removed categoryId as it's not supported in the database
  // Removed imageUrl as it doesn't exist in the database
  featured: boolean
  timeLimit: string
  tasks: TaskForm[]
}

export default function CreateQuest() {
  const { user, loading: authLoading } = useAuth()
  const [questCategories, setQuestCategories] = useState<{ id: string; name: string }[]>([])
  const [questForm, setQuestForm] = useState<QuestForm>({
    title: "",
    description: "",
    // Removed categoryId as it's not supported in the database
    // Removed imageUrl as it doesn't exist in the database
    featured: false,
    timeLimit: "",
    tasks: [],
  })

  const [currentTask, setCurrentTask] = useState<TaskForm>({
    type: "social",
    title: "",
    description: "",
    xpReward: 10,
  })
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null)
  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [projectOwnerSocialUsername, setProjectOwnerSocialUsername] = useState<string | null>(null)
  const [userProjects, setUserProjects] = useState<any[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState("")

  const taskTypes = [
    { value: "social", label: "Social Media", icon: Twitter },
    { value: "download", label: "Download", icon: Download },
    { value: "form", label: "Complete Form", icon: FileText },
    { value: "visit", label: "Visit Page", icon: Eye },
    { value: "learn", label: "Learn & Quiz", icon: BookOpen },
  ]

  const socialPlatforms = [
    { value: "twitter", label: "Twitter / X", icon: "/x white.svg" },
    { value: "telegram", label: "Telegram", icon: "/telegram 1.svg" },
    { value: "discord", label: "Discord", icon: "/discord-icon 1.svg" },
  ]

  const socialActions = [
    { value: "follow", label: "Follow" },
    { value: "join", label: "Join" },
    { value: "like", label: "Like" },
    { value: "retweet", label: "Retweet" },
    { value: "subscribe", label: "Subscribe" },
  ]

  useEffect(() => {
    // Wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange(async (user) => {
      // setWalletUser(user) // This line is removed as per the new_code
      if (user) {
        await fetchUserProjects(user, null)
      }
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        // setEmailUser({ ...user, profile }) // This line is removed as per the new_code
        if (profile) {
          await fetchUserProjects(null, profile)
        }
      }
    }
    checkEmailAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        // setEmailUser(null) // This line is removed as per the new_code
      }
    })
    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, []);

  // Fetch projects for wallet or email user
  const fetchUserProjects = async (walletUser: WalletUser | null, emailProfile: any | null) => {
    try {
      let userId = null
      let userData = null
      let userError = null
      let walletLookup = null
      let emailLookup = null
      if (walletUser) {
        // Try wallet lookup
        const walletAddress: string = walletUser.walletAddress.toLowerCase()
        let userDataWallet, errorWallet
        // 1. Try to fetch user
        ({ data: userDataWallet, error: errorWallet } = await supabase
          .from("users")
          .select("id,email")
          .eq("wallet_address", walletAddress)
          .single())
        walletLookup = { userDataWallet, errorWallet }
        // 2. If not found, upsert user via API
        if ((!userDataWallet || errorWallet) && walletAddress) {
          try {
            const res = await fetch("/api/users/upsert", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                walletAddress,
                username: user?.username || user?.profile?.username,
                email: user?.email,
                avatar_url: user?.avatar_url,
                bio: user?.profile?.bio,
              }),
            })
            if (res.ok) {
              const { user } = await res.json()
              userDataWallet = user
              errorWallet = null
              // Optionally, you could show a toast here for user creation
            }
          } catch (e) {
            // Optionally log error
          }
        }
        if (userDataWallet && !errorWallet) {
          userId = userDataWallet.id
          userData = userDataWallet
        } else if (user?.email) {
          // Fallback to email lookup
          const { data: userDataEmail, error: errorEmail } = await supabase
            .from("users")
            .select("id,email")
            .eq("email", user.email.toLowerCase())
            .single()
          emailLookup = { userDataEmail, errorEmail }
          if (userDataEmail && !errorEmail) {
            userId = userDataEmail.id
            userData = userDataEmail
          }
        }
      } else if (user?.profile) {
        userId = user.profile.id
        userData = user.profile
      }
      if (!userId) {
        // Log all relevant info for debugging
        console.error("User not found for quest creation", {
          walletUser,
          user, // Changed from emailUser to user
          walletLookup,
          emailLookup,
        })
        alert("User not found. Please sign in again.")
        return
      }
      if (userId) {
        const { data: projects, error } = await supabase
          .from("projects")
          .select("*")
          .eq("owner_id", userId)
          .eq("status", "approved")
        if (error) throw error
        setUserProjects(projects || [])
      }
    } catch (error) {
      console.error("Error fetching user projects:", error)
    }
  };

  // Fetch quest categories from Supabase on mount
  useEffect(() => {
    const fetchCategories = async () => {
      const { data, error } = await supabase.from("quest_categories").select("id, name")
      if (!error && data) setQuestCategories(data)
    }
    fetchCategories()
  }, []);
  
  // Authentication check
  if (!user && !authLoading) {
    return (
      <AuthRequired 
        title="Sign In Required"
        message="Please sign in with your email or wallet to create quests and projects."
        onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
      />
    )
  }

  // Show loading while auth is being checked
  if (authLoading) {
    return (
      <PageContainer>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
            <p className="text-white text-lg">Loading...</p>
          </div>
        </div>
      </PageContainer>
    )
  }

  const openTaskDialog = (taskIndex?: number) => {
    if (taskIndex !== undefined) {
      setEditingTaskIndex(taskIndex)
      setCurrentTask(questForm.tasks[taskIndex])
    } else {
      setEditingTaskIndex(null)
      setCurrentTask({
        type: "social",
        title: "",
        description: "",
        xpReward: 100,
      })
    }
    setShowTaskDialog(true)
  };

  const saveTask = async () => {
    if (!currentTask.title.trim()) {
      alert("Task title is required");
      return;
    }

    // Find the selected project object
    const selectedProject = userProjects.find((p) => p.id === selectedProjectId);
    
    // Helper: get project owner's linked social account username
    const getProjectOwnerSocialUsername = async (platform: string) => {
      if (!selectedProject) return null;
      
      try {
        const { data: socialAccount } = await supabase
          .from('social_accounts')
          .select('x_username')
          .eq('user_id', selectedProject.owner_id)
          .eq('platform', 'twitter')
          .single();
        
        if (platform === 'twitter') return socialAccount?.x_username || null;
        return null;
      } catch (error) {
        console.error('Error fetching project owner social account:', error);
        return null;
      }
    };

    // Helper: validate tweet URL is from the linked account
    const validateTweetUrl = async (url: string) => {
      if (!url) return { isValid: false, error: 'Tweet URL is required' };
      
      const projectOwnerUsername = await getProjectOwnerSocialUsername('twitter');
      if (!projectOwnerUsername) {
        return { isValid: false, error: 'Project owner must have a linked Twitter account' };
      }

      // Extract username from tweet URL
      const tweetUrlMatch = url.match(/twitter\.com\/([^\/]+)\/status\//);
      if (!tweetUrlMatch) {
        return { isValid: false, error: 'Invalid tweet URL format' };
      }

      const tweetUsername = tweetUrlMatch[1];
      if (tweetUsername !== projectOwnerUsername) {
        return { isValid: false, error: `Tweet must be from @${projectOwnerUsername} (project owner's linked account)` };
      }

      return { isValid: true, error: null };
    };

    // Auto-set social URL for follow tasks if not already set
    let taskToSave = { ...currentTask };
    if (currentTask.type === "social" && currentTask.socialPlatform === "twitter" && currentTask.socialAction === "follow") {
      // Check if project has linked Twitter account
      const hasProjectSocial = (platform: string) => {
        if (!selectedProject) return false;
        if (platform === 'twitter') return !!selectedProject.twitter_url;
        return false;
      };

      if (!currentTask.socialUrl && hasProjectSocial('twitter')) {
        const username = await getProjectOwnerSocialUsername('twitter');
        if (username) {
          taskToSave.socialUrl = `https://twitter.com/${username}`;
        }
      }
    }

    // Validate tweet URL for like/retweet tasks
    if (currentTask.type === "social" && currentTask.socialPlatform === "twitter" && 
        (currentTask.socialAction === "like" || currentTask.socialAction === "retweet")) {
      const validation = await validateTweetUrl(currentTask.socialUrl || '');
      if (!validation.isValid) {
        alert(validation.error);
        return;
      }
    }

    // Auto-extract tweet ID and username from URLs for Twitter tasks
    if (currentTask.type === "social" && currentTask.socialPlatform === "twitter") {
      if (currentTask.socialUrl) {
        // Extract tweet ID for like/retweet actions
        if ((currentTask.socialAction === "like" || currentTask.socialAction === "retweet")) {
          const tweetId = extractTweetIdFromUrl(currentTask.socialUrl);
          if (tweetId) {
            taskToSave.socialPostId = tweetId;
          }
        }
        // Extract username for follow actions
        if (currentTask.socialAction === "follow") {
          const username = extractUsernameFromUrl(currentTask.socialUrl);
          if (username) {
            taskToSave.socialUsername = username;
          }
        }
      }
    }
    const newTasks = [...questForm.tasks]
    if (editingTaskIndex !== null) {
      newTasks[editingTaskIndex] = taskToSave
    } else {
      newTasks.push({ ...taskToSave, id: Date.now().toString() })
    }
    setQuestForm((prev) => ({
      ...prev,
      tasks: newTasks,
    }))
    setShowTaskDialog(false)
    setEditingTaskIndex(null)
  };

  const removeTask = (taskIndex: number) => {
    setQuestForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, index) => index !== taskIndex),
    }))
  };

  const getTaskIcon = (type: string) => {
    const taskType = taskTypes.find((t) => t.value === type)
    const IconComponent = taskType?.icon || Trophy
    return <IconComponent className="w-4 h-4" />
  };

  const handlePublish = async () => {
    if (!user) {
      alert("Please sign in first")
      return
    }
    
    if (!questForm.title || !questForm.description || questForm.tasks.length === 0) {
      alert("Please fill in all required fields and add at least one task")
      return
    }
    
    try {
      // Ensure Supabase Auth session is present
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        alert("You must be signed in with Supabase Auth to submit a project application.")
        return
      }

      // Get user ID from database
      let userId = null
      let userData = null
      
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
        console.error("User not found for quest creation", { user })
        alert("User not found. Please sign in again.")
        return
      }
      // Create quest (total_xp will be calculated automatically from tasks)
      const { data: quest, error: questError } = await supabase
        .from("quests")
        .insert({
          title: questForm.title,
          description: questForm.description,
          project_id: selectedProjectId,
          // Removed creator_id and category_id as they don't exist in the database
          // Removed image_url as it doesn't exist in the database
          // total_xp is now calculated automatically from task XP rewards
          status: "active",
          featured: questForm.featured,
          time_limit_days: questForm.timeLimit ? Number.parseInt(questForm.timeLimit) : null,
        })
        .select()
        .single()
      if (questError) throw questError
      // Create tasks
      const tasksToInsert = questForm.tasks.map((task, index) => ({
        quest_id: quest.id,
        title: task.title || `Task ${index + 1}`,
        description: task.description || `Complete this ${task.type} task`,
        task_type: task.type,
        xp_reward: task.xpReward || 100,
        order_index: index,
        social_action: task.socialAction || null,
        social_platform: task.socialPlatform || null,
        social_url: task.socialUrl || null,
        social_username: task.socialUsername || null,
        social_post_id: task.socialPostId || null,
        download_url: task.downloadUrl || null,
        download_title: task.downloadTitle || null,
        download_description: task.downloadDescription || null,
        // form_url: task.formUrl || null, // Removed - column doesn't exist in database
        form_title: task.formTitle || null,
        form_description: task.formDescription || null,
        visit_url: task.visitUrl || null,
        visit_title: task.visitTitle || null,
        visit_description: task.visitDescription || null,
        visit_duration_seconds: task.visitDuration || null,
        learn_content: task.learnContent || null,
        learn_questions: task.learnQuestions || null,
        learn_passing_score: task.learnPassingScore || 80,
        // New quiz fields
        quiz_question: task.quizQuestion || null,
        quiz_answer_1: task.quizAnswer1 || null,
        quiz_answer_2: task.quizAnswer2 || null,
        quiz_answer_3: task.quizAnswer3 || null,
        quiz_answer_4: task.quizAnswer4 || null,
        quiz_correct_answer: task.quizCorrectAnswer || null,
        quiz_is_multi_select: task.quizIsMultiSelect || false,
      }))
      const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert)
      if (tasksError) throw tasksError
      alert("Quest published successfully!")
      if (typeof window !== 'undefined') {
        localStorage.setItem('onboarding_quest', 'true');
      }
      setQuestForm({
        title: "",
        description: "",
        // Removed categoryId as it's not supported in the database
        // Removed imageUrl as it doesn't exist in the database
        featured: false,
        timeLimit: "",
        tasks: [],
      })
    } catch (error) {
      console.error("Error publishing quest:", error)
      alert("Failed to publish quest. Please try again.")
    }
  };

  const renderTaskSpecificFields = () => {
    // Find the selected project object
    const selectedProject = userProjects.find((p) => p.id === selectedProjectId);
    
    // Helper: get project owner's linked social account username
    const getProjectOwnerSocialUsername = async (platform: string) => {
      if (!selectedProject) return null;
      
      try {
        const { data: socialAccount } = await supabase
          .from('social_accounts')
          .select('x_username')
          .eq('user_id', selectedProject.owner_id)
          .eq('platform', 'twitter')
          .single();
        
        if (platform === 'twitter') return socialAccount?.x_username || null;
        return null;
      } catch (error) {
        console.error('Error fetching project owner social account:', error);
        return null;
      }
    };

    // Helper: check if project has social media links
    const hasProjectSocial = (platform: string) => {
      if (!selectedProject) return false;
      if (platform === 'twitter') return !!selectedProject.twitter_url;
      return false;
    };

    // Should we show the URL field?
    const shouldShowUrlField = () => {
      // For follow tasks: use linked account, no URL needed
      if (currentTask.socialPlatform === 'twitter' && currentTask.socialAction === 'follow' && hasProjectSocial('twitter')) {
        return false;
      }
      if (currentTask.socialPlatform === 'discord' && currentTask.socialAction === 'join' && hasProjectSocial('discord')) {
        return false;
      }
      if (currentTask.socialPlatform === 'telegram' && currentTask.socialAction === 'join' && hasProjectSocial('telegram')) {
        return false;
      }
      // For like/retweet tasks: always require URL (must be from linked account)
      if (currentTask.socialAction === 'like' || currentTask.socialAction === 'retweet') {
        return true;
      }
      // Default: show for other cases
      return true;
    };

    switch (currentTask.type) {
      case "social":
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-white">Platform</Label>
                <Select
                  value={currentTask.socialPlatform || ""}
                  onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, socialPlatform: value }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                    {socialPlatforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value} className="text-white hover:bg-[#06351f] flex items-center gap-2">
                        <img src={platform.icon} alt={platform.label + ' logo'} className="w-5 h-5 p-1 inline-block align-middle" />
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Action</Label>
                <Select
                  value={currentTask.socialAction || ""}
                  onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, socialAction: value as any }))}
                >
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue placeholder="Select action" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                    {socialActions.map((action) => (
                      <SelectItem key={action.value} value={action.value} className="text-white hover:bg-[#06351f]">
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Smart verification messaging */}
            {currentTask.socialPlatform === 'twitter' && currentTask.socialAction === 'follow' && hasProjectSocial('twitter') && (
              <div className="p-3 bg-green-500/20 border border-green-500/30 rounded-lg">
                <p className="text-green-400 text-sm">
                  ✅ Will use project owner's linked Twitter account (@{projectOwnerSocialUsername || 'Loading...'}) for verification
                </p>
              </div>
            )}

            {currentTask.socialPlatform === 'twitter' && (currentTask.socialAction === 'like' || currentTask.socialAction === 'retweet') && (
              <div className="p-3 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                <p className="text-blue-400 text-sm">
                  ℹ️ Tweet must be from project owner's linked account (@{projectOwnerSocialUsername || 'Not linked'})
                </p>
              </div>
            )}

            {shouldShowUrlField() && (
              <div>
                <Label className="text-white">URL/Link</Label>
                <Input
                  value={currentTask.socialUrl || ""}
                  onChange={(e) => {
                    const url = e.target.value;
                    setCurrentTask((prev) => ({ ...prev, socialUrl: url }));
                    
                    // Auto-extract tweet ID for like/retweet tasks
                    if (currentTask.socialPlatform === 'twitter' && (currentTask.socialAction === 'like' || currentTask.socialAction === 'retweet')) {
                      const tweetId = extractTweetIdFromUrl(url);
                      if (tweetId) {
                        setCurrentTask((prev) => ({ ...prev, socialPostId: tweetId }));
                      }
                    }
                    
                    // Validate tweet URL for like/retweet tasks
                    if (currentTask.socialPlatform === 'twitter' && (currentTask.socialAction === 'like' || currentTask.socialAction === 'retweet')) {
                      // Skip validation in render - it will be validated in saveTask
                      console.log('Tweet URL validation will be done on save');
                    }
                  }}
                  placeholder={
                    currentTask.socialAction === "like" || currentTask.socialAction === "retweet"
                      ? "https://twitter.com/username/status/1234567890"
                      : "https://twitter.com/username or https://t.me/groupname"
                  }
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                {(currentTask.socialAction === "like" || currentTask.socialAction === "retweet") && (
                  <p className="text-xs text-gray-400 mt-1">
                    Paste the full tweet URL - must be from project owner's linked account
                  </p>
                )}
                
                {/* Show extracted tweet ID for like/retweet tasks */}
                {(currentTask.socialAction === "like" || currentTask.socialAction === "retweet") && currentTask.socialPostId && (
                  <div className="p-2 bg-green-500/20 border border-green-500/30 rounded-lg mt-2">
                    <p className="text-green-400 text-xs">
                      ✅ Tweet ID extracted: {currentTask.socialPostId}
                    </p>
                  </div>
                )}

                {/* Manual tweet ID input for like/retweet tasks */}
                {(currentTask.socialAction === "like" || currentTask.socialAction === "retweet") && (
                  <div>
                    <Label className="text-white">Tweet ID (Optional)</Label>
                    <Input
                      value={currentTask.socialPostId || ""}
                      onChange={(e) => setCurrentTask((prev) => ({ ...prev, socialPostId: e.target.value }))}
                      placeholder="Will be extracted from URL above"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Leave empty to extract from the URL above, or enter manually
                    </p>
                  </div>
                )}
              </div>
            )}

            {currentTask.socialAction === "follow" && !hasProjectSocial('twitter') && (
              <div className="p-3 bg-yellow-500/20 border border-yellow-500/30 rounded-lg">
                <p className="text-yellow-400 text-sm">
                  ⚠️ Project owner must link their Twitter account for automatic verification
                </p>
              </div>
            )}

            {currentTask.socialAction === "follow" && (
              <div>
                <Label className="text-white">Username (without @)</Label>
                <Input
                  value={currentTask.socialUsername || ""}
                  onChange={(e) => setCurrentTask((prev) => ({ ...prev, socialUsername: e.target.value }))}
                  placeholder="username"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            )}

            {(currentTask.socialAction === "like" || currentTask.socialAction === "retweet") && (
              <div>
                <Label className="text-white">Post ID (Optional)</Label>
                <Input
                  value={currentTask.socialPostId || ""}
                  onChange={(e) => setCurrentTask((prev) => ({ ...prev, socialPostId: e.target.value }))}
                  placeholder="Will be extracted from URL above"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Leave empty to extract from the URL above, or enter manually
                </p>
              </div>
            )}
          </div>
        );

      case "download":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Download URL</Label>
              <Input
                value={currentTask.downloadUrl || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, downloadUrl: e.target.value }))}
                placeholder="https://example.com/file.pdf"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label className="text-white">File Title</Label>
              <Input
                value={currentTask.downloadTitle || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, downloadTitle: e.target.value }))}
                placeholder="Whitepaper.pdf"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            <div>
              <Label className="text-white">File Description</Label>
              <Textarea
                value={currentTask.downloadDescription || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, downloadDescription: e.target.value }))}
                placeholder="Description of what users will download"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        );

      case "form":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Form URL</Label>
              <Input
                value={currentTask.formUrl || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, formUrl: e.target.value }))}
                placeholder="https://forms.google.com/..."
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        );

      case "visit":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Page URL</Label>
              <Input
                value={currentTask.visitUrl || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, visitUrl: e.target.value }))}
                placeholder="https://example.com/page"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        );

      case "learn":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Question</Label>
              <Textarea
                value={currentTask.quizQuestion || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, quizQuestion: e.target.value }))}
                placeholder="What does DeFi stand for?"
                rows={3}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
            
            <div>
              <Label className="text-white">Answer Options</Label>
              <div className="space-y-2">
                {[1, 2, 3, 4].map((num) => (
                  <div key={num} className="flex items-center gap-2">
                    <Input
                      placeholder={`Answer ${num}`}
                      value={currentTask[`quizAnswer${num}` as keyof typeof currentTask] as string || ""}
                      onChange={(e) => setCurrentTask((prev) => ({ 
                        ...prev, 
                        [`quizAnswer${num}`]: e.target.value 
                      }))}
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                    <input
                      type="radio"
                      name="correct_answer"
                      checked={currentTask.quizCorrectAnswer === num - 1}
                      onChange={() => setCurrentTask((prev) => ({ ...prev, quizCorrectAnswer: num - 1 }))}
                      className="w-4 h-4 text-green-600 bg-white/10 border-white/20 focus:ring-green-500"
                    />
                    <Label className="text-white text-sm">Correct</Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="quiz_is_multi_select"
                checked={currentTask.quizIsMultiSelect || false}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, quizIsMultiSelect: e.target.checked }))}
                className="w-4 h-4 text-green-600 bg-white/10 border-white/20 focus:ring-green-500"
              />
              <Label htmlFor="quiz_is_multi_select" className="text-white text-sm">
                Multi-select (allow multiple correct answers)
              </Label>
            </div>

            <div>
              <Label className="text-white">Passing Score (%)</Label>
              <Input
                type="number"
                value={currentTask.learnPassingScore ?? 80}
                onChange={(e) =>
                  setCurrentTask((prev) => ({ ...prev, learnPassingScore: Number.parseInt(e.target.value) || 80 }))
                }
                placeholder="80"
                min="0"
                max="100"
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Auto-set social URL when platform and action change
  useEffect(() => {
    if (currentTask.type === 'social' && currentTask.socialPlatform === 'twitter' && currentTask.socialAction === 'follow') {
      const selectedProject = userProjects.find((p) => p.id === selectedProjectId);
      if (selectedProject && selectedProject.x_username && !currentTask.socialUrl) {
        setCurrentTask(prev => ({ ...prev, socialUrl: `https://twitter.com/${selectedProject.x_username}` }));
      }
    }
  }, [currentTask.socialPlatform, currentTask.socialAction, selectedProjectId, userProjects]);

  if (!user && !authLoading) { // Changed from walletUser and emailUser to user and authLoading
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center">
        <Card className="bg-[#0b4b34c4] border-white/20 backdrop-blur-sm p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-300 mb-6">You need to sign in to create quests</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                Go Back
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (userProjects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center">
        <Card className="bg-[#0b4b34c4] border-white/20 backdrop-blur-sm p-8 max-w-md mx-auto">
          <div className="text-center">
            <Building2 className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">No Projects Found</h2>
            <p className="text-gray-300 mb-6">You need to have an approved project to create quests</p>
            <div className="space-y-2">
              <Link href="/register-project">
                <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                  Register Project
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Go Back
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-white">Create New Quest</h1>
            <p className="text-gray-400">Design engaging quests for your community</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quest Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <Card className="bg-[#111111] border-[#282828]">
              <CardHeader>
                <CardTitle className="text-white">Basic Information</CardTitle>
                <CardDescription className="text-gray-300">Set up the core details of your quest</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="project" className="text-white">
                    Select Project *
                  </Label>
                  <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue placeholder="Select your project" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                      {userProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="text-white hover:bg-[#06351f]">
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="title" className="text-white">
                    Quest Title
                  </Label>
                  <Input
                    id="title"
                    value={questForm.title || ""}
                    onChange={(e) => setQuestForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter quest title..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">
                    Description
                  </Label>
                  <Textarea
                    value={questForm.description}
                    onChange={(e) => setQuestForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what participants need to do..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 min-h-[100px]"
                  />
                </div>

                {/* Removed quest image upload section as it's not supported in the database */}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Removed category selection as it's not supported in the database */}
                  <div>
                    <Label htmlFor="timeLimit" className="text-white">
                      Time Limit (days)
                    </Label>
                    <Input
                      type="number"
                      value={questForm.timeLimit || ""}
                      onChange={(e) => setQuestForm((prev) => ({ ...prev, timeLimit: e.target.value }))}
                      placeholder="30"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={questForm.featured}
                    onCheckedChange={(checked) => setQuestForm((prev) => ({ ...prev, featured: checked }))}
                  />
                  <Label htmlFor="featured" className="text-white">
                    Featured Quest
                  </Label>
                </div>
              </CardContent>
            </Card>

            {/* Tasks Section */}
            <Card className="bg-[#111111] border-white/20">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Quest Tasks ({questForm.tasks.length})</CardTitle>
                    <CardDescription className="text-gray-300">Add tasks for participants to complete</CardDescription>
                  </div>
                  <Button
                    onClick={() => openTaskDialog()}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                {questForm.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {questForm.tasks.map((task, index) => (
                      <div key={task.id || index}>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-[#111111]">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task.type)}
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-500/20 text-green-400 border-green-500/30"
                            >
                              {task.type}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold">{task.title}</h4>
                            <p className="text-gray-400 text-sm">{task.description}</p>
                          </div>
                          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                            +{task.xpReward} XP
                          </Badge>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openTaskDialog(index)}
                              className="text-green-400 border-green-400/30 hover:bg-green-500/20"
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeTask(index)}
                              className="text-red-400 border-red-400/30 hover:bg-red-500/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {index < questForm.tasks.length - 1 && <Separator className="bg-white/10" />}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No tasks added yet</p>
                    <p className="text-sm">Click "Add Task" to create your first task</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Preview Sidebar */}
          <div className="space-y-6">
            <Card className="bg-[#111111] border-white/20">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                  {/* Removed quest image preview */}
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>

                <div>
                  <h3 className="text-white font-bold text-lg">{questForm.title || "Quest Title"}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {questForm.description || "Quest description will appear here..."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {/* Removed category badge as it's not supported in the database */}
                  {questForm.featured && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0">
                      Featured
                    </Badge>
                  )}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400">
                    <span>Total XP:</span>
                    <span className="text-yellow-400 font-semibold">
                      {questForm.tasks.reduce((sum, task) => sum + task.xpReward, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Tasks:</span>
                    <span className="text-white">{questForm.tasks.length}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Time Limit:</span>
                    <span className="text-white">
                      {questForm.timeLimit ? `${questForm.timeLimit} days` : "No limit"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#111111] border-white/20">
              <CardHeader>
                <CardTitle className="text-white">Publish Quest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handlePublish}
                  disabled={
                    !questForm.title || !questForm.description || questForm.tasks.length === 0 || !selectedProjectId
                  }
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Publish Quest
                </Button>

                <Button variant="outline" className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20">
                  Save as Draft
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Task Dialog */}
        <Dialog open={showTaskDialog} onOpenChange={setShowTaskDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTaskIndex !== null ? "Edit Task" : "Add New Task"}</DialogTitle>
              <DialogDescription>
                Configure the task details and verification requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Task Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Task Title</Label>
                  <Input
                    value={currentTask.title}
                    onChange={e => setCurrentTask(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-white">Task Description</Label>
                  <Textarea
                    value={currentTask.description}
                    onChange={e => setCurrentTask(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the task..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>
                <div>
                  <Label className="text-white">XP Reward (Required)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={currentTask.xpReward}
                    onChange={e => setCurrentTask(prev => ({ ...prev, xpReward: Number(e.target.value) }))}
                    placeholder="100"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Set the XP reward for completing this task. Quest total XP will be calculated automatically.
                  </p>
                </div>
                <div>
                  <Label className="text-white">Task Type</Label>
                  <Select
                    value={currentTask.type}
                    onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-[#06351f]">
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Separator className="bg-white/20" />
              {/* Task-specific fields */}
              {renderTaskSpecificFields()}
              <div className="flex gap-4 pt-4">
                <Button
                  onClick={() => setShowTaskDialog(false)}
                  variant="outline"
                  className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Cancel
                </Button>
                <Button
                  onClick={saveTask}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                >
                  {editingTaskIndex !== null ? "Update Task" : "Add Task"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </PageContainer>
  )
}
