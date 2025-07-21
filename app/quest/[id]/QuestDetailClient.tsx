"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  CheckCircle,
  Circle,
  Twitter,
  MessageCircle,
  MessageSquare,
  ExternalLink,
  Users,
  Zap,
  Trophy,
  Clock,
  ArrowLeft,
  Download,
  FileText,
  Eye,
  BookOpen,
  Trash,
  Plus,
  Target,
} from "lucide-react"
import Link from "next/link"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import type { Database } from "@/lib/supabase"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import QuestStatsBar from "@/components/QuestStatsBar"
import { supabase } from "@/lib/supabase"
import EditQuestForm from "@/components/edit-quest-form"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import QuestResponsesViewer from "@/components/quest-responses-viewer"

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
  project_id?: string | null
  projects?: {
    owner_id: string
  } | null
}
type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  user_task_submissions?: Database["public"]["Tables"]["user_task_submissions"]["Row"] | null
}
const getAbsoluteUrl = (url: string) => url?.match(/^https?:\/\//i) ? url : `https://${url}`;

function QuestPlaceholderCover({ title, categoryIcon }: { title: string; categoryIcon?: string }) {
  return (
    <div className="h-64 w-full bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 left-0 w-full h-full quest-placeholder-bg"></div>
      </div>
      
      {/* Quest icon or fallback */}
      <div className="relative z-10 flex items-center justify-center">
        <div className="h-20 w-20 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center">
          {categoryIcon ? (
            <span className="text-2xl">{categoryIcon}</span>
          ) : (
            <Target className="h-10 w-10 text-white/60" />
          )}
        </div>
      </div>
      
      {/* Quest title overlay */}
      <div className="absolute bottom-4 left-4 right-4">
        <h3 className="text-white font-semibold text-xl truncate">{title}</h3>
      </div>
    </div>
  );
}

export default function QuestDetailClient({ quest, tasks: initialTasks }: { quest: Quest, tasks: Task[] }) {
  // --- Begin full client logic and UI ---
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null)
  const [submissionData, setSubmissionData] = useState<{ [key: string]: any }>({})
  const [mounted, setMounted] = useState(false)
  const [showQuiz, setShowQuiz] = useState<{ [taskId: string]: boolean }>({})
  const [quizAnswers, setQuizAnswers] = useState<{ [taskId: string]: any[] }>({})
  const [editingQuizTask, setEditingQuizTask] = useState<Task | null>(null)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showAddTask, setShowAddTask] = useState(false)
  const [creatingTask, setCreatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState("")
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showEditTask, setShowEditTask] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [updateTaskError, setUpdateTaskError] = useState("")
  const [currentUserUUID, setCurrentUserUUID] = useState<string | null>(null)
  const [showResponsesViewer, setShowResponsesViewer] = useState(false)
  const [questCompleted, setQuestCompleted] = useState(false)
  const [newTask, setNewTask] = useState<any>({
    type: "social",
    title: "",
    description: "",
    xpReward: 100,
    socialAction: "follow",
    socialPlatform: "twitter",
    socialUrl: "",
    socialUsername: "",
    socialPostId: "",
    // Quiz fields
    quizHeadline: "",
    quizDescription: "",
    quizAnswers: ["", "", "", ""],
    quizCorrectAnswers: [],
    quizMultiSelect: false,
    // ... other fields as needed
  })

  useEffect(() => {
    setMounted(true)
    // Wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user)
      setLoading(false)
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
        if (profile) {
          setCurrentUserUUID(profile.id)
        }
      }
      setLoading(false)
    }
    checkEmailAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        setEmailUser(null)
        setCurrentUserUUID(null)
        setLoading(false)
      }
    })
    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

  // Fetch current user UUID when wallet user changes
  useEffect(() => {
    const fetchUserUUID = async () => {
      try {
        if (walletUser?.walletAddress) {
          const { data: userData, error } = await supabase
            .from("users")
            .select("id")
            .eq("wallet_address", walletUser.walletAddress.toLowerCase())
            .single()
          
          if (userData && !error) {
            setCurrentUserUUID(userData.id)
            console.log('Found user UUID from wallet:', userData.id)
          } else {
            console.log('No user found for wallet address:', walletUser.walletAddress)
          }
        } else if (emailUser?.profile?.id) {
          // For email users, use the profile ID directly
          setCurrentUserUUID(emailUser.profile.id)
          console.log('Found user UUID from email profile:', emailUser.profile.id)
        } else {
          console.log('No wallet or email user found')
        }
      } catch (error) {
        console.error('Error fetching user UUID:', error)
      }
    }
    
    fetchUserUUID()
  }, [walletUser])

  // Check if quest is completed (all tasks have submissions)
  useEffect(() => {
    const checkQuestCompletion = () => {
      const allTasksCompleted = tasks.every(task => task.user_task_submissions)
      setQuestCompleted(allTasksCompleted)
    }
    checkQuestCompletion()
  }, [tasks])

  if (!mounted) return null;

  const handleTaskVerification = async (task: Task) => {
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      alert("Please sign in first")
      return
    }
    setVerifyingTask(task.id)
    try {
      let response
      let baseData: any = { taskId: task.id }
      if (walletUser) {
        baseData.userWallet = walletUser.walletAddress
      } else if (emailUser?.profile) {
        baseData.userId = emailUser.profile.id
        baseData.userEmail = emailUser.email
      }
      switch (task.task_type) {
        case "social":
          if (task.social_platform === "twitter") {
            if (task.social_action === "follow") {
              response = await fetch("/api/verify/twitter-follow-real", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(baseData),
              })
            } else if (task.social_action === "like") {
              // TODO: Implement real Twitter Like endpoint
              alert("Twitter Like verification is not available. Please contact support.");
              setVerifyingTask(null);
              return;
            }
          } else if (task.social_platform === "telegram") {
            response = await fetch("/api/verify/telegram-join-real", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...baseData,
                username: submissionData[task.id]?.username || "",
                groupId: task.social_url?.split("/").pop(),
              }),
            })
          } else if (task.social_platform === "discord") {
            // For Discord, we need to redirect to OAuth flow
            const guildId = task.social_url?.split("/").pop() || task.social_url;
            if (guildId) {
              // Import the Discord OAuth URL utility
              const { getDiscordOAuthUrl } = await import("@/utils/discord");
              const oauthUrl = getDiscordOAuthUrl(guildId, task.id);
              window.location.href = oauthUrl;
              return;
            } else {
              alert("Discord server URL is required for verification");
              setVerifyingTask(null);
              return;
            }
          }
          break
        case "download":
        case "visit":
        case "form":
          response = await fetch("/api/verify/manual-completion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...baseData,
              submissionData: submissionData[task.id] || {},
            }),
          })
          break
        case "learn":
          response = await fetch("/api/verify/learn-completion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...baseData,
              answers: submissionData[task.id]?.answers || [],
            }),
          })
          break
      }

      if (response) {
        const result = await response.json()
        if (result.success) {
          // Update local state to reflect completion
          setTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === task.id 
                ? { ...t, user_task_submissions: { ...result.submission } }
                : t
            )
          )
          alert("Task completed successfully!")
        } else {
          alert(result.error || "Verification failed")
        }
      }
    } catch (error) {
      console.error("Verification error:", error)
      alert("Verification failed. Please try again.")
    } finally {
      setVerifyingTask(null)
    }
  }

  const handleTelegramAuth = async (task: Task, telegramUser: any) => {
    try {
      const response = await fetch("/api/verify/telegram-join-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: task.id,
          userId: emailUser?.profile?.id,
          userEmail: emailUser?.email,
          username: telegramUser.username,
          groupId: task.social_url?.split("/").pop(),
        }),
      })
      const result = await response.json()
      if (result.success) {
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === task.id 
              ? { ...t, user_task_submissions: { ...result.submission } }
              : t
          )
        )
        alert("Telegram verification successful!")
      } else {
        alert(result.error || "Telegram verification failed")
      }
    } catch (error) {
      console.error("Telegram verification error:", error)
      alert("Telegram verification failed. Please try again.")
    }
  }

  const getTwitterTaskHeading = (twitterTaskType: string) => {
    switch (twitterTaskType) {
      case "tweet_reaction":
        return "React to Tweet"
      case "twitter_follow":
        return "Follow on Twitter"
      case "tweet":
        return "Tweet"
      case "twitter_space":
        return "Join Twitter Space"
      default:
        return "Twitter Task"
    }
  }

  const handleCreateTask = async () => {
    setCreatingTask(true)
    setCreateTaskError("")
    try {
      const taskData = {
        quest_id: quest.id,
        title: newTask.type === "learn" ? newTask.quizHeadline : `Task ${tasks.length + 1}`,
        description: newTask.type === "learn" ? newTask.quizDescription : `Complete this ${newTask.type} task`,
        task_type: newTask.type,
        xp_reward: 100, // Default XP reward
        order_index: tasks.length + 1,
        social_platform: newTask.type === "social" ? newTask.socialPlatform : null,
        social_action: newTask.type === "social" ? newTask.socialAction : null,
        social_url: newTask.type === "social" ? newTask.socialUrl : null,
        social_username: newTask.type === "social" ? newTask.socialUsername : null,
        social_post_id: newTask.type === "social" ? newTask.socialPostId : null,
        download_url: newTask.type === "download" ? newTask.downloadUrl : null,
        visit_url: newTask.type === "visit" ? newTask.visitUrl : null,
        // Quiz fields
        learn_content: newTask.type === "learn" ? newTask.quizHeadline : null,
        learn_questions: newTask.type === "learn" ? {
          question: newTask.quizHeadline,
          description: newTask.quizDescription,
          answers: newTask.quizAnswers.filter((answer: string) => answer.trim() !== ""),
          correctAnswers: newTask.quizCorrectAnswers,
          multiSelect: newTask.quizMultiSelect
        } : null,
        learn_passing_score: newTask.type === "learn" ? 100 : null,
      }

      const { data, error } = await supabase.from("tasks").insert(taskData).select().single()
      if (error) throw error

      setTasks(prev => [...prev, data])
      setShowAddTask(false)
      setNewTask({
        type: "social",
        title: "",
        description: "",
        xpReward: 100,
        socialAction: "follow",
        socialPlatform: "twitter",
        socialUrl: "",
        socialUsername: "",
        socialPostId: "",
        // Quiz fields
        quizHeadline: "",
        quizDescription: "",
        quizAnswers: ["", "", "", ""],
        quizCorrectAnswers: [],
        quizMultiSelect: false,
      })
    } catch (error: any) {
      setCreateTaskError(error.message || "Failed to create task")
    } finally {
      setCreatingTask(false)
    }
  }

  const handleEditTask = async () => {
    if (!editingTask) return
    setUpdatingTask(true)
    setUpdateTaskError("")
    try {
      const taskData = {
        task_type: editingTask.task_type,
        social_platform: editingTask.task_type === "social" ? editingTask.social_platform : null,
        social_action: editingTask.task_type === "social" ? editingTask.social_action : null,
        social_url: editingTask.task_type === "social" ? editingTask.social_url : null,
        social_username: editingTask.task_type === "social" ? editingTask.social_username : null,
        social_post_id: editingTask.task_type === "social" ? editingTask.social_post_id : null,
        download_url: editingTask.task_type === "download" ? editingTask.download_url : null,
        visit_url: editingTask.task_type === "visit" ? editingTask.visit_url : null,
      }

      const { error } = await supabase.from("tasks").update(taskData).eq("id", editingTask.id)
      if (error) throw error

      setTasks(prev => prev.map(t => t.id === editingTask.id ? { ...t, ...taskData } : t))
      setShowEditTask(false)
      setEditingTask(null)
    } catch (error: any) {
      setUpdateTaskError(error.message || "Failed to update task")
    } finally {
      setUpdatingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm("Are you sure you want to delete this task?")) return
    try {
      const { error } = await supabase.from("tasks").delete().eq("id", taskId)
      if (error) throw error

      setTasks(prev => prev.filter(t => t.id !== taskId))
    } catch (error: any) {
      alert(error.message || "Failed to delete task")
    }
  }

  const handleQuizSubmission = async (task: Task) => {
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      alert("Please sign in first")
      return
    }

    setVerifyingTask(task.id)
    try {
      const quizData = task.learn_questions;
      if (!quizData) {
        alert("Quiz data not found")
        return
      }

      const userAnswers = quizAnswers[task.id] || [];
      const correctAnswers = quizData.correctAnswers || [];
      
      // Check if answers are correct
      let isCorrect = false;
      if (quizData.multiSelect) {
        // For multi-select, all correct answers must be selected and no incorrect ones
        isCorrect = correctAnswers.length === userAnswers.length && 
                   correctAnswers.every((answer: number) => userAnswers.includes(answer));
      } else {
        // For single-select, the selected answer must be correct
        isCorrect = userAnswers.length === 1 && correctAnswers.includes(userAnswers[0]);
      }

      let response;
      let baseData: any = { taskId: task.id }
      if (walletUser) {
        baseData.userWallet = walletUser.walletAddress
      } else if (emailUser?.profile) {
        baseData.userId = emailUser.profile.id
        baseData.userEmail = emailUser.email
      }

      response = await fetch("/api/verify/learn-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...baseData,
          answers: userAnswers,
          isCorrect: isCorrect,
          quizData: quizData
        }),
      })

      if (response) {
        const result = await response.json()
        if (result.success) {
          // Update local state to reflect completion
          setTasks(prevTasks => 
            prevTasks.map(t => 
              t.id === task.id 
                ? { ...t, user_task_submissions: { ...result.submission } }
                : t
            )
          )
          setShowQuiz(s => ({ ...s, [task.id]: false }))
          alert(isCorrect ? "Quiz completed successfully!" : "Quiz completed, but some answers were incorrect.")
        } else {
          alert(result.error || "Quiz submission failed")
        }
      }
    } catch (error) {
      console.error("Quiz submission error:", error)
      alert("Quiz submission failed. Please try again.")
    } finally {
      setVerifyingTask(null)
    }
  }

  const getTaskIcon = (task: Task) => {
    switch (task.task_type) {
      case "social":
        switch (task.social_platform) {
          case "twitter":
            return <Twitter className="w-5 h-5" />
          case "telegram":
            return <MessageCircle className="w-5 h-5" />
          case "discord":
            return <MessageSquare className="w-5 h-5" />
          default:
            return <ExternalLink className="w-5 h-5" />
        }
      case "download":
        return <Download className="w-5 h-5" />
      case "form":
        return <FileText className="w-5 h-5" />
      case "visit":
        return <Eye className="w-5 h-5" />
      case "learn":
        return <BookOpen className="w-5 h-5" />
      default:
        return <Target className="w-5 h-5" />
    }
  }

  const isAdminOrCreator = () => {
    if (!currentUserUUID) {
      console.log('No current user UUID found')
      return false
    }
    
    // Check if user is the project owner (this is the main check)
    const isProjectOwner = quest.project_id && quest.projects?.owner_id ? currentUserUUID === quest.projects.owner_id : false
    
    // Also check if user is the quest creator as fallback
    const isQuestCreator = quest.creator_id ? currentUserUUID === quest.creator_id : false
    
    console.log('Admin check:', { 
      currentUserUUID,
      projectId: quest.project_id,
      projectOwnerId: quest.projects?.owner_id,
      questCreatorId: quest.creator_id,
      isProjectOwner,
      isQuestCreator,
      walletUser: walletUser?.walletAddress,
      emailUser: emailUser?.profile?.id,
      questData: quest,
      projectsData: quest.projects
    })
    
    return isProjectOwner || isQuestCreator
  }

  const renderQuizModal = (task: Task) => {
    if (task.task_type !== "learn" || !showQuiz[task.id]) return null;
    
    const quizData = task.learn_questions;
    if (!quizData) return null;
    
    return (
      <Dialog open={showQuiz[task.id]} onOpenChange={(open) => setShowQuiz(s => ({ ...s, [task.id]: open }))}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">{task.title}</DialogTitle>
            <DialogDescription className="text-gray-300">{task.description}</DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {quizData.question && (
              <div>
                <h3 className="text-white font-semibold mb-2">{quizData.question}</h3>
                {quizData.description && (
                  <p className="text-gray-300 text-sm mb-4">{quizData.description}</p>
                )}
              </div>
            )}
            
            <div className="space-y-3">
              <p className="text-gray-300 text-sm">
                {quizData.multiSelect ? "Select all correct answers:" : "Select the correct answer:"}
              </p>
              
              {quizData.answers?.map((answer: string, index: number) => (
                <div key={index} className="flex items-center space-x-3">
                  <input
                    type={quizData.multiSelect ? "checkbox" : "radio"}
                    name={`quiz-${task.id}`}
                    id={`answer-${task.id}-${index}`}
                    className="w-4 h-4 text-green-500 bg-white/10 border-white/20 rounded"
                    onChange={(e) => {
                      const currentAnswers = quizAnswers[task.id] || [];
                      let newAnswers: number[];
                      
                      if (quizData.multiSelect) {
                        if (e.target.checked) {
                          newAnswers = [...currentAnswers, index];
                        } else {
                          newAnswers = currentAnswers.filter(i => i !== index);
                        }
                      } else {
                        newAnswers = e.target.checked ? [index] : [];
                      }
                      
                      setQuizAnswers(prev => ({ ...prev, [task.id]: newAnswers }));
                    }}
                  />
                  <label 
                    htmlFor={`answer-${task.id}-${index}`}
                    className="text-white cursor-pointer flex-1"
                  >
                    {answer}
                  </label>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowQuiz(s => ({ ...s, [task.id]: false }))}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleQuizSubmission(task)}
                disabled={!quizAnswers[task.id] || quizAnswers[task.id].length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                Submit Quiz
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const TWITTER_TASK_TYPES = [
    { value: "tweet_reaction", label: "Tweet reaction" },
    { value: "twitter_follow", label: "Twitter follow" },
    { value: "tweet", label: "Tweet" },
    { value: "twitter_space", label: "Twitter space" },
  ];
  const TWEET_REACTION_ACTIONS = [
    { value: "like", label: "Like" },
    { value: "retweet", label: "Retweet" },
    { value: "reply", label: "Reply" },
  ];

  if (!mounted) return null; // or a loading spinner

  // Debug quest data
  console.log('Quest data:', quest)
  console.log('User data:', { walletUser, emailUser })
  console.log('Full quest object:', JSON.stringify(quest, null, 2))

  return (
    <div className="min-h-screen quest-page-bg">
      <div className="w-full px-2 sm:px-4 py-8">
        {/* Back Button */}
        <Link href={quest.project_id ? `/project/${quest.project_id}` : "/"} className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quests
        </Link>

        {/* Quest Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card className="bg-[#111111] rounded-lg backdrop-blur-sm overflow-hidden mb-2">
              <div className="relative">
                {quest.image_url ? (
                  <img
                    src={quest.image_url}
                    alt={quest.title}
                    className="w-full h-64 object-cover"
                  />
                ) : (
                  <QuestPlaceholderCover 
                    title={quest.title} 
                    categoryIcon={quest.quest_categories?.icon || undefined}
                  />
                )}
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge
                    className="text-white border-0 quest-badge-gradient"
                    style={{
                      '--quest-color': quest.quest_categories?.color || '#10b981',
                      '--quest-color-secondary': quest.quest_categories?.color || '#059669'
                    } as React.CSSProperties}
                  >
                    {quest.quest_categories?.icon} {quest.quest_categories?.name}
                  </Badge>
                </div>
                <div className="absolute top-4 right-4">
                  <Badge variant="outline" className="bg-black/50 text-white border-white/30">
                    <Clock className="w-3 h-3 mr-1" />
                    {quest.time_limit_days ? `${quest.time_limit_days} days` : "No limit"}
                  </Badge>
                </div>
              </div>
              <CardHeader className="bg-[#111111] border-b border-[#282828]">
                <CardTitle className="text-2xl text-white">{quest.title}</CardTitle>
                <CardDescription className="text-gray-300 text-base">{quest.description}</CardDescription>
              </CardHeader>
              <CardContent className="bg-[#111111] pt-6">
                <QuestStatsBar totalXP={quest.total_xp} participants={quest.participant_count} taskCount={tasks.length} />
              </CardContent>
            </Card>
          </div>

          {/* Quest Stats Sidebar (desktop only) */}
          <div className="space-y-6 hidden lg:block">
            <Card className="bg-[#111111] rounded-lg mb-4">
              <CardHeader className="pt-4 pb-2 px-6">
                <CardTitle className="text-lg font-bold text-white">Quest Stats</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-6">
                <div className="flex flex-col gap-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total Rewards</span>
                    <span className="font-bold text-yellow-400">{quest.total_xp} XP</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Participants</span>
                    <span className="font-bold text-white">{quest.participant_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Tasks</span>
                    <span className="font-bold text-white">{tasks.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Status</span>
                    <span className="font-bold text-green-400">active</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111111] rounded-lg mb-4">
              <CardHeader className="pt-4 pb-2 px-6">
                <CardTitle className="text-lg font-bold text-white">Creator</CardTitle>
              </CardHeader>
              <CardContent className="pb-4 px-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-xl">
                    {quest.users?.username?.charAt(0).toUpperCase() || "A"}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">{quest.users?.username || "Anonymous"}</span>
                    <span className="text-xs text-green-400">Verified Creator</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          {/* Mobile sidebar below main card */}
          <div className="space-y-2 block lg:hidden mt-8">
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm overflow-hidden rounded-lg border mb-2">
              <CardHeader className="bg-[#111111] border-b border-[#282828]">
                <CardTitle className="text-white">Quest Stats</CardTitle>
              </CardHeader>
              <CardContent className="bg-[#111111] space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Rewards</span>
                  <span className="text-yellow-400 font-semibold">{quest.total_xp} XP</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Participants</span>
                  <span className="text-white">{quest.participant_count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Tasks</span>
                  <span className="text-white">{tasks.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">{quest.status}</Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm overflow-hidden rounded-lg border mb-2">
              <CardHeader className="bg-[#111111] border-b border-[#282828]">
                <CardTitle className="text-white">Creator</CardTitle>
              </CardHeader>
              <CardContent className="bg-[#111111]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">
                      {quest.users?.username?.charAt(0).toUpperCase() || "A"}
                    </span>
                  </div>
                  <div>
                    <p className="text-white font-semibold">{quest.users?.username || "Anonymous"}</p>
                    <p className="text-gray-400 text-sm">Verified Creator</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tasks Section */}
        <Card className="text-card-foreground shadow-sm bg-[#111111] rounded-lg backdrop-blur-sm overflow-hidden mb-2">
          <CardHeader className="bg-[#111111] border-b border-[#282828]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 w-full">
              <div className="flex flex-col items-start w-full sm:w-auto">
                <CardTitle className="text-2xl font-bold text-white text-left">Quest Tasks</CardTitle>
                <CardDescription className="text-base text-gray-300 text-left">Complete all tasks to earn the full XP reward</CardDescription>
              </div>
              {isAdminOrCreator() && (
                <Button onClick={() => setShowAddTask(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center gap-2 w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="bg-[#111111] p-6">
            {/* Add Task Dialog */}
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Task</DialogTitle>
                </DialogHeader>
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateTask(); }}>
                  {createTaskError && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">{createTaskError}</div>}
                  <div>
                    <label className="text-white block mb-1">Task Type</label>
                    <Select value={newTask.type} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, type: val }))}>
                      <SelectTrigger className="bg-white/10 border-white/20 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                        <SelectItem value="social" className="text-white">Social</SelectItem>
                        <SelectItem value="download" className="text-white">Upload</SelectItem>
                        <SelectItem value="form" className="text-white">Form</SelectItem>
                        <SelectItem value="visit" className="text-white">Visit</SelectItem>
                        <SelectItem value="learn" className="text-white">Quiz</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {/* Only show social platform, action, and URL for social tasks */}
                  {newTask.type === "social" && (
                    <div className="space-y-2">
                      <label className="text-white block mb-1">Social Platform</label>
                      <Select value={newTask.socialPlatform} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialPlatform: val }))}>
                        <SelectTrigger className="bg-white/10 border-white/20 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#111111] border-[#282828]">
                          <SelectItem value="twitter" className="text-white">Twitter / X</SelectItem>
                          <SelectItem value="telegram" className="text-white">Telegram</SelectItem>
                          <SelectItem value="discord" className="text-white">Discord</SelectItem>
                        </SelectContent>
                      </Select>
                      {newTask.socialPlatform === 'telegram' ? (
                        <div>
                          <label className="text-white block mb-1">Channel Link</label>
                          <Input value={newTask.socialUrl} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                        </div>
                      ) : newTask.socialPlatform === 'discord' ? (
                        <div>
                          <label className="text-white block mb-1">Discord Invite Link</label>
                          <Input value={newTask.socialUrl} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://discord.gg/your-server" />
                        </div>
                      ) : newTask.socialPlatform === 'twitter' ? (
                        <>
                          <label className="text-white block mb-1">Action Type</label>
                          <Select value={newTask.socialAction || ''} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialAction: val }))}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue placeholder="Select Action" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111111] border-[#282828]">
                              <SelectItem value="follow" className="text-white">Follow</SelectItem>
                              <SelectItem value="like" className="text-white">Like</SelectItem>
                              <SelectItem value="retweet" className="text-white">Retweet</SelectItem>
                              <SelectItem value="post" className="text-white">Post</SelectItem>
                              <SelectItem value="reply" className="text-white">Reply</SelectItem>
                              <SelectItem value="quote" className="text-white">Quote</SelectItem>
                              <SelectItem value="bookmark" className="text-white">Bookmark</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="text-white block mb-1 mt-2">URL</label>
                          <Input value={newTask.socialUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://twitter.com/..." required />
                        </>
                      ) : (
                        <>
                          <label className="text-white block mb-1">Action</label>
                          <Select value={newTask.socialAction} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialAction: val }))}>
                            <SelectTrigger className="bg-white/10 border-white/20 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#111111] border-[#282828]">
                              <SelectItem value="follow" className="text-white">Follow</SelectItem>
                              <SelectItem value="join" className="text-white">Join</SelectItem>
                              <SelectItem value="like" className="text-white">Like</SelectItem>
                              <SelectItem value="retweet" className="text-white">Retweet</SelectItem>
                              <SelectItem value="subscribe" className="text-white">Subscribe</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="text-white block mb-1">URL/Link</label>
                          <Input value={newTask.socialUrl} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                        </>
                      )}
                    </div>
                  )}
                  {/* Quiz task fields */}
                  {newTask.type === "learn" && (
                    <div className="space-y-4">
                      <div>
                        <label className="text-white block mb-1">Quiz Headline</label>
                        <Input 
                          value={newTask.quizHeadline} 
                          onChange={e => setNewTask((t: typeof newTask) => ({ ...t, quizHeadline: e.target.value }))} 
                          className="bg-white/10 border-white/20 text-white" 
                          placeholder="Enter quiz question or headline"
                        />
                      </div>
                      <div>
                        <label className="text-white block mb-1">Quiz Description</label>
                        <Textarea 
                          value={newTask.quizDescription} 
                          onChange={e => setNewTask((t: typeof newTask) => ({ ...t, quizDescription: e.target.value }))} 
                          className="bg-white/10 border-white/20 text-white" 
                          placeholder="Enter quiz description or additional context"
                        />
                      </div>
                      <div>
                        <label className="text-white block mb-1">Answer Type</label>
                        <Select 
                          value={newTask.quizMultiSelect ? "multi" : "single"} 
                          onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ 
                            ...t, 
                            quizMultiSelect: val === "multi",
                            quizCorrectAnswers: val === "multi" ? [] : [0] // Reset to single answer if switching
                          }))}
                        >
                          <SelectTrigger className="bg-white/10 border-white/20 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#111111] border-[#282828]">
                            <SelectItem value="single" className="text-white">Single Select</SelectItem>
                            <SelectItem value="multi" className="text-white">Multi Select</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className="text-white block mb-1">Answer Options (1-4)</label>
                        <div className="space-y-2">
                          {[0, 1, 2, 3].map((index) => (
                            <div key={index} className="flex items-center gap-2">
                              <Input
                                value={newTask.quizAnswers[index] || ""}
                                onChange={(e) => {
                                  const newAnswers = [...newTask.quizAnswers];
                                  newAnswers[index] = e.target.value;
                                  setNewTask((t: typeof newTask) => ({ ...t, quizAnswers: newAnswers }));
                                }}
                                className="bg-white/10 border-white/20 text-white flex-1"
                                placeholder={`Answer ${index + 1}`}
                              />
                              <input
                                type={newTask.quizMultiSelect ? "checkbox" : "radio"}
                                name="correctAnswer"
                                id={`correct-answer-${index}`}
                                aria-label={`Mark answer ${index + 1} as correct`}
                                checked={newTask.quizCorrectAnswers.includes(index)}
                                onChange={(e) => {
                                  let newCorrectAnswers: number[];
                                  if (newTask.quizMultiSelect) {
                                    if (e.target.checked) {
                                      newCorrectAnswers = [...newTask.quizCorrectAnswers, index];
                                    } else {
                                      newCorrectAnswers = newTask.quizCorrectAnswers.filter((i: number) => i !== index);
                                    }
                                  } else {
                                    newCorrectAnswers = e.target.checked ? [index] : [];
                                  }
                                  setNewTask((t: typeof newTask) => ({ ...t, quizCorrectAnswers: newCorrectAnswers }));
                                }}
                                className="w-4 h-4 text-green-500 bg-white/10 border-white/20 rounded"
                              />
                              <span className="text-white text-sm">Correct</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddTask(false)}>Cancel</Button>
                    <Button type="submit" disabled={creatingTask} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                      {creatingTask ? "Creating..." : "Create Task"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>

            {/* Edit Task Dialog */}
            <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
              <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Task</DialogTitle>
                </DialogHeader>
                {editingTask && (
                  <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditTask(); }}>
                    {updateTaskError && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">{updateTaskError}</div>}

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setShowEditTask(false)}>Cancel</Button>
                      <Button type="submit" disabled={updatingTask} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                        {updatingTask ? "Updating..." : "Update Task"}
                      </Button>
                    </div>
                  </form>
                )}
              </DialogContent>
            </Dialog>

            {/* Tasks List */}
            <div className="space-y-3 md:space-y-4">
              {tasks.map((task, index) => {
                const isCompleted = task.user_task_submissions
                const isVerifying = verifyingTask === task.id
                return (
                  <div key={task.id} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-[#181818] rounded-lg border border-[#282828]">
                    <div className="flex-shrink-0">
                      <div className={`w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-600'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-white" />
                        ) : (
                          <span className="text-white font-semibold text-xs md:text-sm">{index + 1}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTaskIcon(task)}
                            <h3 className="text-white font-semibold text-sm md:text-base">{task.title}</h3>
                            {isCompleted && (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                                Completed
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-300 text-xs md:text-sm mb-3">{task.description}</p>
                          
                          {/* Task-specific content */}
                          {task.task_type === "social" && task.social_platform === "twitter" && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">
                                {getTwitterTaskHeading(task.social_action || "follow")}
                              </div>
                              {task.social_username && (
                                <div className="text-xs md:text-sm text-gray-300">
                                  @{task.social_username}
                                </div>
                              )}
                              {task.social_post_id && (
                                <div className="text-xs md:text-sm text-gray-300">
                                  Post ID: {task.social_post_id}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {task.task_type === "social" && task.social_platform === "telegram" && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">Join Telegram Channel</div>
                              {task.social_url && (
                                <div className="text-xs md:text-sm text-gray-300">
                                  <a href={getAbsoluteUrl(task.social_url)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                                    {task.social_url}
                                  </a>
                                </div>
                              )}
                              {!isCompleted && (
                                <div className="mt-2">
                                  <TelegramLoginWidget
                                    botName="YourBotName" // TODO: Replace with your bot's username
                                    onAuth={async (telegramUser) => {
                                      setVerifyingTask(task.id);
                                      const res = await fetch("/api/verify/telegram-join-real", {
                                        method: "POST",
                                        headers: { "Content-Type": "application/json" },
                                        body: JSON.stringify({
                                          userWallet: walletUser?.walletAddress,
                                          telegramUserId: telegramUser.id,
                                          telegramUsername: telegramUser.username,
                                          channelId: task.social_url?.split("/").pop(),
                                          taskId: task.id,
                                        }),
                                      });
                                      const data = await res.json();
                                      setSubmissionData((prev: any) => ({ ...prev, [task.id]: data }));
                                      setVerifyingTask(null);
                                      if (data.verified) {
                                        // Optionally refresh tasks or show success
                                      }
                                    }}
                                  />
                                  {submissionData[task.id] && (
                                    <div className={submissionData[task.id].verified ? "text-green-500 mt-2" : "text-red-500 mt-2"}>
                                      {submissionData[task.id].message}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          
                          {task.task_type === "social" && task.social_platform === "discord" && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">Join Discord Server</div>
                              {task.social_url && (
                                <div className="text-xs md:text-sm text-gray-300">
                                  <a href={getAbsoluteUrl(task.social_url)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                                    {task.social_url}
                                  </a>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {task.task_type === "download" && task.download_url && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">Download File</div>
                              <div className="text-xs md:text-sm text-gray-300">
                                <a href={getAbsoluteUrl(task.download_url)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                                  {task.download_url}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {task.task_type === "visit" && task.visit_url && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">Visit Website</div>
                              <div className="text-xs md:text-sm text-gray-300">
                                <a href={getAbsoluteUrl(task.visit_url)} target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300">
                                  {task.visit_url}
                                </a>
                              </div>
                            </div>
                          )}
                          
                          {task.task_type === "learn" && (
                            <div className="space-y-1 md:space-y-2">
                              <div className="text-xs md:text-sm text-gray-400">Complete Quiz</div>
                              {task.learn_content && (
                                <div className="text-xs md:text-sm text-gray-300 font-medium">
                                  {task.learn_content}
                                </div>
                              )}
                              {task.learn_questions && (
                                <div className="text-xs md:text-sm text-gray-400">
                                  {task.learn_questions.answers?.length || 0} answer options
                                  {task.learn_questions.multiSelect ? " (Multi-select)" : " (Single-select)"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 md:gap-2">
                          {isAdminOrCreator() && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTask(task)
                                  setShowEditTask(true)
                                }}
                                className="h-6 w-6 md:h-8 md:w-8 p-0"
                              >
                                <FileText className="w-3 h-3 md:w-4 md:h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteTask(task.id)}
                                className="h-6 w-6 md:h-8 md:w-8 p-0"
                              >
                                <Trash className="w-3 h-3 md:w-4 md:h-4" />
                              </Button>
                            </div>
                          )}
                          {!isCompleted && (
                            <div className="flex gap-1 md:gap-2">
                              {task.task_type === "learn" ? (
                                <Button
                                  onClick={() => setShowQuiz(s => ({ ...s, [task.id]: true }))}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                                  size="sm"
                                >
                                  Start Quiz
                                </Button>
                              ) : (
                                <Button
                                  onClick={() => handleTaskVerification(task)}
                                  disabled={isVerifying}
                                  className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                                  size="sm"
                                >
                                  {isVerifying ? "Verifying..." : "Verify Task"}
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Quiz Modals */}
        {tasks.map(task => (
          <div key={task.id}>
            {renderQuizModal(task)}
          </div>
        ))}

        {/* View All Responses Button */}
        {questCompleted && isAdminOrCreator() && (
          <Card className="mt-6 bg-[#111111] border-[#282828]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold text-lg mb-2">Quest Completed!</h3>
                  <p className="text-gray-400 text-sm">
                    All tasks have been completed. You can now view all user responses and manage XP distribution.
                  </p>
                </div>
                <Button
                  onClick={() => setShowResponsesViewer(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View All Responses
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Responses Viewer Dialog */}
        <Dialog open={showResponsesViewer} onOpenChange={setShowResponsesViewer}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="text-white">Quest Responses</DialogTitle>
              <DialogDescription className="text-gray-400">
                View all user responses and manage XP distribution for completed tasks.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              <QuestResponsesViewer
                quest={quest}
                tasks={tasks}
                isAdmin={isAdminOrCreator()}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
} 