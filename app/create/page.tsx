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
}

interface QuestForm {
  title: string
  description: string
  categoryId: string
  imageUrl: string
  featured: boolean
  timeLimit: string
  tasks: TaskForm[]
}

export default function CreateQuest() {
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const questCategories = [
    { value: "DeFi", label: "DeFi" },
    { value: "NFT", label: "NFT" },
    { value: "Gaming", label: "Gaming" },
    { value: "Infrastructure", label: "Infrastructure" },
    { value: "Social", label: "Social" },
    { value: "Education", label: "Education" },
    { value: "DAO", label: "DAO" },
    { value: "Metaverse", label: "Metaverse" },
    { value: "Trading", label: "Trading" },
    { value: "RWA", label: "RWA" },
    { value: "MEME", label: "MEME" },
    { value: "TradeFi", label: "TradeFi" },
    { value: "Other", label: "Other" },
  ]
  const [questForm, setQuestForm] = useState<QuestForm>({
    title: "",
    description: "",
    categoryId: "",
    imageUrl: "",
    featured: false,
    timeLimit: "",
    tasks: [],
  })

  const [currentTask, setCurrentTask] = useState<TaskForm>({
    type: "social",
    title: "",
    description: "",
    xpReward: 100,
  })

  const [showTaskDialog, setShowTaskDialog] = useState(false)
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null)
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
      setWalletUser(user)
      if (user) {
        await fetchUserProjects(user, null)
      }
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
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
        setEmailUser(null)
      }
    })
    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

  // Fetch projects for wallet or email user
  const fetchUserProjects = async (walletUser: WalletUser | null, emailProfile: any | null) => {
    try {
      let userId = null
      if (walletUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletUser.walletAddress.toLowerCase())
          .single()
        userId = userData?.id
      } else if (emailProfile) {
        userId = emailProfile.id
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
  }

  const saveTask = () => {
    if (!currentTask.title || !currentTask.description) return

    const newTasks = [...questForm.tasks]

    if (editingTaskIndex !== null) {
      newTasks[editingTaskIndex] = currentTask
    } else {
      newTasks.push({ ...currentTask, id: Date.now().toString() })
    }

    setQuestForm((prev) => ({
      ...prev,
      tasks: newTasks,
    }))

    setShowTaskDialog(false)
    setEditingTaskIndex(null)
  }

  const removeTask = (taskIndex: number) => {
    setQuestForm((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((_, index) => index !== taskIndex),
    }))
  }

  const getTaskIcon = (type: string) => {
    const taskType = taskTypes.find((t) => t.value === type)
    const IconComponent = taskType?.icon || Trophy
    return <IconComponent className="w-4 h-4" />
  }

  const handlePublish = async () => {
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      alert("Please sign in first")
      return
    }
    if (!questForm.title || !questForm.description || questForm.tasks.length === 0) {
      alert("Please fill in all required fields and add at least one task")
      return
    }
    try {
      // Get user ID from database
      let userId = null
      if (walletUser) {
        const { data: userData } = await supabase
          .from("users")
          .select("id")
          .eq("wallet_address", walletUser.walletAddress.toLowerCase())
          .single()
        userId = userData?.id
      } else if (emailUser?.profile) {
        userId = emailUser.profile.id
      }
      if (!userId) {
        alert("User not found. Please sign in again.")
        return
      }
      // Calculate total XP
      const totalXP = questForm.tasks.reduce((sum, task) => sum + task.xpReward, 0)
      // Create quest
      const { data: quest, error: questError } = await supabase
        .from("quests")
        .insert({
          title: questForm.title,
          description: questForm.description,
          project_id: selectedProjectId,
          creator_id: userId,
          category_id: questForm.categoryId || null,
          image_url: questForm.imageUrl || null,
          total_xp: totalXP,
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
        title: task.title,
        description: task.description,
        task_type: task.type,
        xp_reward: task.xpReward,
        order_index: index,
        social_action: task.socialAction || null,
        social_platform: task.socialPlatform || null,
        social_url: task.socialUrl || null,
        social_username: task.socialUsername || null,
        social_post_id: task.socialPostId || null,
        download_url: task.downloadUrl || null,
        download_title: task.downloadTitle || null,
        download_description: task.downloadDescription || null,
        form_url: task.formUrl || null,
        form_title: task.formTitle || null,
        form_description: task.formDescription || null,
        visit_url: task.visitUrl || null,
        visit_title: task.visitTitle || null,
        visit_description: task.visitDescription || null,
        visit_duration_seconds: task.visitDuration || null,
        learn_content: task.learnContent || null,
        learn_questions: task.learnQuestions || null,
        learn_passing_score: task.learnPassingScore || 80,
      }))
      const { error: tasksError } = await supabase.from("tasks").insert(tasksToInsert)
      if (tasksError) throw tasksError
      alert("Quest published successfully!")
      setQuestForm({
        title: "",
        description: "",
        categoryId: "",
        imageUrl: "",
        featured: false,
        timeLimit: "",
        tasks: [],
      })
    } catch (error) {
      console.error("Error publishing quest:", error)
      alert("Failed to publish quest. Please try again.")
    }
  }

  const renderTaskSpecificFields = () => {
    // Find the selected project object
    const selectedProject = userProjects.find((p) => p.id === selectedProjectId);
    // Helper: does the project have the relevant social link?
    const hasProjectSocial = (platform: string) => {
      if (!selectedProject) return false;
      if (platform === 'discord') return !!selectedProject.discord_url;
      if (platform === 'twitter') return !!selectedProject.twitter_url;
      if (platform === 'telegram') return !!selectedProject.telegram_url;
      return false;
    };
    // Should we show the URL field?
    const shouldShowUrlField = () => {
      if (currentTask.socialPlatform === 'discord' && currentTask.socialAction === 'join' && hasProjectSocial('discord')) return false;
      if (currentTask.socialPlatform === 'telegram' && currentTask.socialAction === 'join' && hasProjectSocial('telegram')) return false;
      if (currentTask.socialPlatform === 'twitter' && currentTask.socialAction === 'follow' && hasProjectSocial('twitter')) return false;
      // Always show for like/retweet
      if (currentTask.socialAction === 'like' || currentTask.socialAction === 'retweet') return true;
      // Default: show
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
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {socialPlatforms.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value} className="text-white hover:bg-slate-700 flex items-center gap-2">
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
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {socialActions.map((action) => (
                      <SelectItem key={action.value} value={action.value} className="text-white hover:bg-slate-700">
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {shouldShowUrlField() && (
              <div>
                <Label className="text-white">URL/Link</Label>
                <Input
                  value={currentTask.socialUrl || ""}
                  onChange={(e) => setCurrentTask((prev) => ({ ...prev, socialUrl: e.target.value }))}
                  placeholder="https://twitter.com/username or https://t.me/groupname"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
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
                <Label className="text-white">Post ID</Label>
                <Input
                  value={currentTask.socialPostId || ""}
                  onChange={(e) => setCurrentTask((prev) => ({ ...prev, socialPostId: e.target.value }))}
                  placeholder="Post ID or URL"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
            )}
          </div>
        )

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
        )

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
        )

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
        )

      case "learn":
        return (
          <div className="space-y-4">
            <div>
              <Label className="text-white">Learning Content (HTML)</Label>
              <Textarea
                value={currentTask.learnContent || ""}
                onChange={(e) => setCurrentTask((prev) => ({ ...prev, learnContent: e.target.value }))}
                placeholder="<h2>Introduction to DeFi</h2><p>DeFi stands for...</p>"
                rows={6}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
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
            <div>
              <Label className="text-white">Quiz Questions (JSON)</Label>
              <Textarea
                value={JSON.stringify(currentTask.learnQuestions || [], null, 2) || ""}
                onChange={(e) => {
                  try {
                    const questions = JSON.parse(e.target.value)
                    setCurrentTask((prev) => ({ ...prev, learnQuestions: questions }))
                  } catch (error) {
                    // Invalid JSON, ignore
                  }
                }}
                placeholder={`[
  {
    "question": "What does DeFi stand for?",
    "options": ["Decentralized Finance", "Digital Finance", "Distributed Finance"],
    "correctAnswer": 0
  }
]`}
                rows={8}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400 font-mono text-sm"
              />
            </div>
          </div>
        )

      default:
        return null
    }
  }

  if (!walletUser && !emailUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Sign In Required</h2>
            <p className="text-gray-300 mb-6">You need to sign in to create quests</p>
            <Link href="/">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">
                Go Back
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  if (userProjects.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm p-8 max-w-md">
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
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
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
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
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
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {userProjects.map((project) => (
                        <SelectItem key={project.id} value={project.id} className="text-white hover:bg-slate-700">
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
                    id="description"
                    value={questForm.description || ""}
                    onChange={(e) => setQuestForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your quest..."
                    rows={4}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label className="text-white">Quest Image</Label>
                  <ImageUpload
                    onImageUploaded={(url) => setQuestForm((prev) => ({ ...prev, imageUrl: url }))}
                    onImageRemoved={() => setQuestForm((prev) => ({ ...prev, imageUrl: "" }))}
                    currentImage={questForm.imageUrl}
                    className="mt-2"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category" className="text-white">
                      Category
                    </Label>
                    <Select
                      value={questForm.categoryId}
                      onValueChange={(value) => setQuestForm((prev) => ({ ...prev, categoryId: value }))}
                    >
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700">
                        {questCategories.map((category: { value: string; label: string }) => (
                          <SelectItem key={category.value} value={category.value} className="text-white hover:bg-slate-700">
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-white">Quest Tasks ({questForm.tasks.length})</CardTitle>
                    <CardDescription className="text-gray-300">Add tasks for participants to complete</CardDescription>
                  </div>
                  <Button
                    onClick={() => openTaskDialog()}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {questForm.tasks.length > 0 ? (
                  <div className="space-y-3">
                    {questForm.tasks.map((task, index) => (
                      <div key={task.id || index}>
                        <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
                          <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task.type)}
                            <Badge
                              variant="outline"
                              className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30"
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
                              className="text-blue-400 border-blue-400/30 hover:bg-blue-500/20"
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
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Preview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center overflow-hidden">
                  {questForm.imageUrl ? (
                    <img
                      src={questForm.imageUrl || "/placeholder.svg"}
                      alt="Quest preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                  )}
                </div>

                <div>
                  <h3 className="text-white font-bold text-lg">{questForm.title || "Quest Title"}</h3>
                  <p className="text-gray-400 text-sm mt-1">
                    {questForm.description || "Quest description will appear here..."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {questForm.categoryId && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0">
                      {questCategories.find((c: { value: string }) => c.value === questForm.categoryId)?.label}
                    </Badge>
                  )}
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

            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Publish Quest</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  onClick={handlePublish}
                  disabled={
                    !questForm.title || !questForm.description || questForm.tasks.length === 0 || !selectedProjectId
                  }
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
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
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingTaskIndex !== null ? "Edit Task" : "Add New Task"}</DialogTitle>
              <DialogDescription className="text-gray-300">
                Configure the task details and verification requirements
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Basic Task Info */}
              <div className="space-y-4">
                <div>
                  <Label className="text-white">Task Type</Label>
                  <Select
                    value={currentTask.type}
                    onValueChange={(value) => setCurrentTask((prev) => ({ ...prev, type: value as any }))}
                  >
                    <SelectTrigger className="bg-white/10 border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {taskTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-700">
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Task Title</Label>
                  <Input
                    value={currentTask.title || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter task title..."
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label className="text-white">Task Description</Label>
                  <Textarea
                    value={currentTask.description || ""}
                    onChange={(e) => setCurrentTask((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what participants need to do..."
                    rows={3}
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
                </div>

                <div>
                  <Label className="text-white">XP Reward</Label>
                  <Input
                    type="number"
                    value={currentTask.xpReward || 0}
                    onChange={(e) =>
                      setCurrentTask((prev) => ({ ...prev, xpReward: Number.parseInt(e.target.value) || 0 }))
                    }
                    placeholder="100"
                    className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  />
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
                  disabled={!currentTask.title || !currentTask.description}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0"
                >
                  {editingTaskIndex !== null ? "Update Task" : "Add Task"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
