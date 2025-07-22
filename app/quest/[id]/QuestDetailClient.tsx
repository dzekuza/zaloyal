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
} from "@/components/ui/dialog"
import {
  CheckCircle,
  Twitter,
  MessageCircle,
  MessageSquare,
  ExternalLink,
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import QuestResponsesViewer from "@/components/quest-responses-viewer"
import PageContainer from "@/components/PageContainer";
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import TaskList from '@/components/quest-detail/TaskList';
import type { Task } from '@/components/quest-detail/types';

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
  project_id?: string | null
  projects?: {
    owner_id: string
  } | null
}

// Utility: getAbsoluteUrl
function getAbsoluteUrl(url: string): string {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}
// Utility: getTwitterTaskHeading
function getTwitterTaskHeading(twitterTaskType: string): string {
  switch (twitterTaskType) {
    case "tweet_reaction":
      return "React to Tweet";
    case "twitter_follow":
      return "Follow on Twitter";
    case "tweet":
      return "Tweet";
    case "twitter_space":
      return "Join Twitter Space";
    case "like":
      return "Like Tweet";
    case "retweet":
      return "Retweet";
    case "post":
      return "Post";
    case "reply":
      return "Reply";
    case "quote":
      return "Quote";
    case "bookmark":
      return "Bookmark";
    default:
      return "Twitter Task";
  }
}

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
      {/* Removed quest title overlay */}
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
  const [quizAnswers, setQuizAnswers] = useState<{ [taskId: string]: number[] }>({})
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
    type: "",
    title: "",
    description: "",
    xp_reward: 100,
    socialAction: "",
    socialPlatform: "",
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

  useEffect(() => {
    if (editingTask) {
      setNewTask({
        type: editingTask.task_type,
        title: editingTask.title || "",
        description: editingTask.description || "",
        xp_reward: editingTask.xp_reward || 100,
        // Social fields
        socialPlatform: editingTask.social_platform || "twitter",
        socialAction: editingTask.social_action || "follow",
        socialUrl: editingTask.social_url || "",
        socialUsername: editingTask.social_username || "",
        socialPostId: editingTask.social_post_id || "",
        // Quiz fields
        quizHeadline: editingTask.learn_questions?.question || "",
        quizDescription: editingTask.learn_questions?.description || editingTask.learn_content || "",
        quizAnswers: editingTask.learn_questions?.answers || ["", "", "", ""],
        quizCorrectAnswers: editingTask.learn_questions?.correctAnswers || [],
        quizMultiSelect: editingTask.learn_questions?.multiSelect || false,
      });
    }
  }, [editingTask]);

  if (!mounted) return null;

  const handleTaskVerification = async (task: Task) => {
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      toast.error("Please sign in first")
      return
    }
    setVerifyingTask(task.id)
    try {
      let baseData: any = { taskId: task.id, userId: userObj.id || userObj.userId || userObj.walletAddress }
      let type = ''
      let payload: any = { ...baseData }
      if (task.task_type === 'social') {
        if (task.social_platform === 'twitter') {
          if (task.social_action === 'follow') {
            type = 'twitter-follow'
            let userTwitterId = null;
            if (emailUser?.identities) {
              const twitterIdentity = emailUser.identities.find((i: any) => i.provider === 'twitter');
              userTwitterId = twitterIdentity?.id || twitterIdentity?.identity_data?.user_id;
            }
            if (!userTwitterId && userObj.x_id) userTwitterId = userObj.x_id;
            let targetAccountId = task.social_username || '';
            if (!targetAccountId) {
              toast.error('Twitter username to follow is missing. Please contact the quest creator.');
              setVerifyingTask(null);
              return;
            }
            payload = { ...baseData, userTwitterId, targetAccountId };
            // Debug logging
            console.log('[Twitter Follow Debug] userObj:', userObj);
            console.log('[Twitter Follow Debug] task:', task);
            console.log('[Twitter Follow Debug] payload:', payload);
          } else if (task.social_action === 'like') {
            type = 'twitter-like'
            let userTwitterId = null;
            if (emailUser?.identities) {
              const twitterIdentity = emailUser.identities.find((i: any) => i.provider === 'twitter');
              userTwitterId = twitterIdentity?.id || twitterIdentity?.identity_data?.user_id;
            }
            if (!userTwitterId && userObj.x_id) userTwitterId = userObj.x_id;
            payload = { ...baseData, userTwitterId, tweetId: task.social_post_id };
          } else if (task.social_action === 'retweet') {
            type = 'twitter-retweet'
            let userTwitterId = null;
            if (emailUser?.identities) {
              const twitterIdentity = emailUser.identities.find((i: any) => i.provider === 'twitter');
              userTwitterId = twitterIdentity?.id || twitterIdentity?.identity_data?.user_id;
            }
            if (!userTwitterId && userObj.x_id) userTwitterId = userObj.x_id;
            payload = { ...baseData, userTwitterId, tweetId: task.social_post_id };
          }
        } else if (task.social_platform === 'discord' && task.social_action === 'join') {
          type = 'discord-join'
          payload = { ...baseData, userDiscordId: userObj.discord_id, guildId: task.social_url?.split("/").pop(), userAccessToken: userObj.discord_access_token }
        } else if (task.social_platform === 'telegram' && task.social_action === 'join') {
          type = 'telegram-join'
          payload = { ...baseData, userTelegramId: userObj.telegram_id, groupId: task.social_url?.split("/").pop() }
        }
      } else if (task.task_type === 'form') {
        type = 'form'
        payload = { ...baseData }
      } else if (task.task_type === 'visit') {
        type = 'visit'
        payload = { ...baseData }
      } else if (task.task_type === 'download') {
        type = 'download'
        payload = { ...baseData }
      } else if (task.task_type === 'learn') {
        type = 'learn'
        payload = { ...baseData, answers: submissionData[task.id]?.answers || [] }
      }
      if (!type) {
        toast.error('Unsupported task type or missing integration.')
        setVerifyingTask(null)
        return
      }
      const response = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...payload }),
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
        toast.success('Task verified successfully!')
        if (type === 'learn') setShowQuiz(s => ({ ...s, [task.id]: false }))
      } else {
        toast.error(result.error || 'Verification failed')
      }
    } catch (error) {
      console.error('Verification error:', error)
      toast.error('Verification failed. Please try again.')
    } finally {
      setVerifyingTask(null)
    }
  }

  // Define handleCreateTask and handleEditTask as async functions before their usage
  const handleCreateTask = async () => {
    if (!currentUserUUID) {
      toast.error("User not logged in or UUID not found.")
      return
    }

    setCreatingTask(true)
    setCreateTaskError("")

    try {
      const taskData: Record<string, any> = {
        quest_id: quest.id,
        title: newTask.title,
        description: newTask.description,
        task_type: newTask.type,
        xp_reward: newTask.xp_reward,
      }

      if (newTask.type === "social") {
        taskData.social_platform = newTask.socialPlatform
        taskData.social_action = newTask.socialAction
        taskData.social_url = newTask.socialUrl
        taskData.social_username = newTask.socialUsername
        taskData.social_post_id = newTask.socialPostId
      } else if (newTask.type === "learn") {
        taskData.learn_content = newTask.quizDescription
        taskData.learn_questions = {
          question: newTask.quizHeadline,
          description: newTask.quizDescription,
          multiSelect: newTask.quizMultiSelect,
          answers: newTask.quizAnswers,
          correctAnswers: newTask.quizCorrectAnswers,
        }
      }

      const { data, error } = await supabase
        .from("tasks")
        .insert([taskData])
        .select()
        .single()

      if (error) {
        setCreateTaskError(error.message)
        console.error("Error creating task:", error)
      } else {
        setTasks(prevTasks => [...prevTasks, data])
        setShowAddTask(false)
        toast.success("Task created successfully!")
        if (typeof window !== 'undefined') {
          localStorage.setItem('onboarding_task', 'true');
        }
      }
    } catch (error) {
      setCreateTaskError("Failed to create task. Please try again.")
      console.error("Error creating task:", error)
    } finally {
      setCreatingTask(false)
    }
  }

  const handleEditTask = async () => {
    if (!editingTask || !currentUserUUID) {
      toast.error("No task selected or user not logged in.")
      return
    }

    setUpdatingTask(true)
    setUpdateTaskError("")

    try {
      const updates: Record<string, any> = {}
      if (editingTask.title !== newTask.title) updates.title = newTask.title
      if (editingTask.description !== newTask.description) updates.description = newTask.description
      if (editingTask.xp_reward !== newTask.xp_reward) updates.xp_reward = newTask.xp_reward
      if (editingTask.task_type !== newTask.type) updates.task_type = newTask.type

      if (newTask.type === "social") {
        updates.social_platform = newTask.socialPlatform
        updates.social_action = newTask.socialAction
        updates.social_url = newTask.socialUrl
        updates.social_username = newTask.socialUsername
        updates.social_post_id = newTask.socialPostId
      } else if (newTask.type === "learn") {
        updates.learn_content = newTask.quizDescription
        updates.learn_questions = {
          question: newTask.quizHeadline,
          description: newTask.quizDescription,
          multiSelect: newTask.quizMultiSelect,
          answers: newTask.quizAnswers,
          correctAnswers: newTask.quizCorrectAnswers,
        }
      }

      const { error } = await supabase
        .from("tasks")
        .update(updates)
        .eq("id", editingTask.id)
        .eq("quest_id", quest.id)

      if (error) {
        setUpdateTaskError(error.message)
        console.error("Error updating task:", error)
      } else {
        setTasks(prevTasks => 
          prevTasks.map(t => 
            t.id === editingTask.id 
              ? { ...t, ...updates }
              : t
          )
        )
        setEditingTask(null)
        setShowEditTask(false)
        toast.success("Task updated successfully!")
      }
    } catch (error) {
      setUpdateTaskError("Failed to update task. Please try again.")
      console.error("Error updating task:", error)
    } finally {
      setUpdatingTask(false)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!currentUserUUID) {
      toast.error("User not logged in.")
      return
    }

    if (!confirm("Are you sure you want to delete this task?")) {
      return
    }

    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId)
        .eq("quest_id", quest.id)

      if (error) {
        toast.error(error.message)
        console.error("Error deleting task:", error)
      } else {
        setTasks(prevTasks => prevTasks.filter(t => t.id !== taskId))
        toast.success("Task deleted successfully!")
      }
    } catch (error) {
      toast.error("Failed to delete task. Please try again.")
      console.error("Error deleting task:", error)
    }
  }

  const handleQuizSubmission = async (task: Task) => {
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      toast.error("Please sign in first")
      return
    }

    setVerifyingTask(task.id)
    try {
      const quizData = task.learn_questions;
      if (!quizData) {
        toast.error("Quiz data not found")
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

      let baseData: any = { taskId: task.id }
      if (walletUser) {
        baseData.userWallet = walletUser.walletAddress
      } else if (emailUser?.profile) {
        baseData.userId = emailUser.profile.id
        baseData.userEmail = emailUser.email
      }

      const response = await fetch("/api/verify/learn-completion", {
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
          toast.success(isCorrect ? "Quiz completed successfully!" : "Quiz completed, but some answers were incorrect.")
        } else {
          toast.error(result.error || "Quiz submission failed")
        }
      }
    } catch (error) {
      console.error("Quiz submission error:", error)
      toast.error("Quiz submission failed. Please try again.")
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

  if (!mounted) return null; // or a loading spinner

  // Debug quest data
  console.log('Quest data:', quest)
  console.log('User data:', { walletUser, emailUser })
  console.log('Full quest object:', JSON.stringify(quest, null, 2))

  return (
    <PageContainer>
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
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Add New Task</DialogTitle>
                <DialogDescription>
                  Fill in the details for the new task
                </DialogDescription>
              </DialogHeader>
              <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateTask(); }}>
                {createTaskError && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">{createTaskError}</div>}
                <div>
                  <label className="text-white block mb-1">Task Type</label>
                  <Select value={newTask.type} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, type: val }))}>
                    <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#181818] border-[#282828] text-white">
                      <SelectItem value="social" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Social</SelectItem>
                      <SelectItem value="download" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Upload</SelectItem>
                      <SelectItem value="form" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Form</SelectItem>
                      <SelectItem value="visit" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Visit</SelectItem>
                      <SelectItem value="learn" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Quiz</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {/* Only show social platform, action, and URL for social tasks */}
                {newTask.type === "social" && (
                  <div className="space-y-2">
                    <label className="text-white block mb-1">Social Platform</label>
                    <Select value={newTask.socialPlatform} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialPlatform: val }))}>
                      <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-[#181818] border-[#282828] text-white">
                        <SelectItem value="twitter" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Twitter / X</SelectItem>
                        <SelectItem value="telegram" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Telegram</SelectItem>
                        <SelectItem value="discord" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Discord</SelectItem>
                      </SelectContent>
                    </Select>
                    {newTask.socialPlatform === 'twitter' && (
                      <>
                        <label className="text-white block mb-1">Action Type</label>
                        <Select value={newTask.socialAction || ''} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialAction: val }))}>
                          <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                            <SelectValue placeholder="Select Action" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#181818] border-[#282828] text-white">
                            <SelectItem value="follow" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Follow</SelectItem>
                            <SelectItem value="like" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Like</SelectItem>
                            <SelectItem value="retweet" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Retweet</SelectItem>
                            <SelectItem value="post" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Post</SelectItem>
                            <SelectItem value="reply" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Reply</SelectItem>
                            <SelectItem value="quote" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Quote</SelectItem>
                            <SelectItem value="bookmark" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Bookmark</SelectItem>
                          </SelectContent>
                        </Select>
                        <label className="text-white block mb-1 mt-2">URL</label>
                        <Input value={newTask.socialUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://twitter.com/..." required />
                      </>
                    )}
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
                    ) : null}
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
                        <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#181818] border-[#282828] text-white">
                          <SelectItem value="single" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Single Select</SelectItem>
                          <SelectItem value="multi" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Multi Select</SelectItem>
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
            <DialogContent className="max-w-2xl max-h-[80vh]">
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription>
                  Edit the details for this task
                </DialogDescription>
              </DialogHeader>
              {editingTask && (
                <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleEditTask(); }}>
                  {updateTaskError && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">{updateTaskError}</div>}

                  {/* Social task fields for editing */}
                  {newTask.type === "social" && (
                    <div className="space-y-2">
                      <label className="text-white block mb-1">Social Platform</label>
                      <Select value={newTask.socialPlatform} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialPlatform: val }))}>
                        <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#181818] border-[#282828] text-white">
                          <SelectItem value="twitter" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Twitter / X</SelectItem>
                          <SelectItem value="telegram" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Telegram</SelectItem>
                          <SelectItem value="discord" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Discord</SelectItem>
                        </SelectContent>
                      </Select>
                      {newTask.socialPlatform === 'twitter' && (
                        <>
                          <label className="text-white block mb-1">Action Type</label>
                          <Select value={newTask.socialAction || ''} onValueChange={(val: string) => setNewTask((t: typeof newTask) => ({ ...t, socialAction: val }))}>
                            <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                              <SelectValue placeholder="Select Action" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#181818] border-[#282828] text-white">
                              <SelectItem value="follow" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Follow</SelectItem>
                              <SelectItem value="like" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Like</SelectItem>
                              <SelectItem value="retweet" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Retweet</SelectItem>
                              <SelectItem value="post" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Post</SelectItem>
                              <SelectItem value="reply" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Reply</SelectItem>
                              <SelectItem value="quote" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Quote</SelectItem>
                              <SelectItem value="bookmark" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Bookmark</SelectItem>
                            </SelectContent>
                          </Select>
                          <label className="text-white block mb-1 mt-2">URL</label>
                          <Input value={newTask.socialUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, socialUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://twitter.com/..." required />
                        </>
                      )}
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
                      ) : null}
                    </div>
                  )}
                  {/* Quiz task fields for editing */}
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
                          <SelectTrigger className="bg-[#181818] border-[#282828] text-white focus:ring-2 focus:ring-green-500">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[#181818] border-[#282828] text-white">
                            <SelectItem value="single" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Single Select</SelectItem>
                            <SelectItem value="multi" className="text-white data-[state=checked]:bg-green-700 data-[state=checked]:text-green-300 focus:bg-green-800">Multi Select</SelectItem>
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
                  {/* Download task fields for editing */}
                  {newTask.type === "download" && (
                    <div className="space-y-2">
                      <label className="text-white block mb-1">Download URL</label>
                      <Input value={newTask.downloadUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, downloadUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://..." />
                      <label className="text-white block mb-1">Download Title</label>
                      <Input value={newTask.downloadTitle || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, downloadTitle: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                      <label className="text-white block mb-1">Download Description</label>
                      <Textarea value={newTask.downloadDescription || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, downloadDescription: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}
                  {/* Form task fields for editing */}
                  {newTask.type === "form" && (
                    <div className="space-y-2">
                      <label className="text-white block mb-1">Form URL</label>
                      <Input value={newTask.formUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, formUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://..." />
                      <label className="text-white block mb-1">Form Title</label>
                      <Input value={newTask.formTitle || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, formTitle: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                      <label className="text-white block mb-1">Form Description</label>
                      <Textarea value={newTask.formDescription || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, formDescription: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}
                  {/* Visit task fields for editing */}
                  {newTask.type === "visit" && (
                    <div className="space-y-2">
                      <label className="text-white block mb-1">Visit URL</label>
                      <Input value={newTask.visitUrl || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, visitUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://..." />
                      <label className="text-white block mb-1">Visit Title</label>
                      <Input value={newTask.visitTitle || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, visitTitle: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                      <label className="text-white block mb-1">Visit Description</label>
                      <Textarea value={newTask.visitDescription || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, visitDescription: e.target.value }))} className="bg-white/10 border-white/20 text-white" />
                      <label className="text-white block mb-1">Visit Duration (seconds)</label>
                      <Input type="number" value={newTask.visitDurationSeconds || ''} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, visitDurationSeconds: Number(e.target.value) }))} className="bg-white/10 border-white/20 text-white" />
                    </div>
                  )}

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
          <TaskList
            tasks={tasks}
            verifyingTask={verifyingTask}
            submissionData={submissionData}
            isAdminOrCreator={isAdminOrCreator}
            setEditingTask={setEditingTask}
            setShowEditTask={setShowEditTask}
            setShowQuiz={setShowQuiz}
            handleTaskVerification={handleTaskVerification}
            handleDeleteTask={handleDeleteTask}
            walletUser={walletUser}
            isAuthenticated={!!walletUser || !!emailUser}
            onSignIn={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
          />
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
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Quest Responses</DialogTitle>
            <DialogDescription>
              View all user responses and manage XP distribution for completed tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <QuestResponsesViewer
              quest={quest}
              tasks={tasks as Database["public"]["Tables"]["tasks"]["Row"][]}
              isAdmin={isAdminOrCreator()}
            />
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
} 