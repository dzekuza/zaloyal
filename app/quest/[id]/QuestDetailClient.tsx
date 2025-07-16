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

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
}
type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  user_task_submissions?: Database["public"]["Tables"]["user_task_submissions"]["Row"] | null
}
const getAbsoluteUrl = (url: string) => url?.match(/^https?:\/\//i) ? url : `https://${url}`;

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
      }
      setLoading(false)
    }
    checkEmailAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        setEmailUser(null)
        setLoading(false)
      }
    })
    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

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
                body: JSON.stringify({
                  ...baseData,
                  username: submissionData[task.id]?.username || "",
                }),
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
        if (result.verified) {
          alert(`Task completed! You earned ${result.xpEarned} XP`)
        } else {
          alert(result.message || "Verification failed")
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
    const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
    if (!userObj) {
      alert("Please sign in first")
      return
    }
    setVerifyingTask(task.id)
    try {
      let baseData: any = { taskId: task.id, telegramData: telegramUser }
      if (walletUser) {
        baseData.userWallet = walletUser.walletAddress
      } else if (emailUser?.profile) {
        baseData.userId = emailUser.profile.id
        baseData.userEmail = emailUser.email
      }
      const response = await fetch("/api/verify/telegram-join-real", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseData),
      })
      const result = await response.json()
      if (result.verified) {
        alert(`Task completed! You earned ${result.xpEarned} XP`)
      } else {
        alert(result.message || "Verification failed")
      }
    } catch (error) {
      console.error("Telegram verification error:", error)
      alert("Verification failed. Please try again.")
    } finally {
      setVerifyingTask(null)
    }
  }

  // In handleCreateTask, set the title automatically based on the selected Twitter task type
  const getTwitterTaskHeading = (twitterTaskType: string) => {
    switch (twitterTaskType) {
      case "tweet_reaction": return "Tweet reaction";
      case "twitter_follow": return "Twitter follow";
      case "tweet": return "Tweet";
      case "twitter_space": return "Twitter space";
      default: return "Twitter";
    }
  };

  const handleCreateTask = async () => {
    setCreatingTask(true)
    setCreateTaskError("")
    try {
      let title = newTask.title;
      if (newTask.type === "social" && newTask.socialPlatform === "twitter" && newTask.twitterTaskType) {
        title = getTwitterTaskHeading(newTask.twitterTaskType);
      }
      const { error } = await supabase.from("tasks").insert({
        quest_id: quest.id,
        title,
        description: "",
        task_type: newTask.type,
        xp_reward: 0, // Not used, but required by schema
        order_index: tasks.length,
        social_action: newTask.socialAction || null,
        social_platform: newTask.socialPlatform || null,
        social_url: newTask.socialUrl || newTask.tweetUrl || newTask.spaceUrl || null,
        social_username: newTask.twitterUsername || null,
        social_post_id: null,
        // ... add other fields as needed
        tweet_actions: newTask.tweetActions || null,
        tweet_words: newTask.tweetWords || null,
        default_tweet: newTask.defaultTweet || null,
        space_password: newTask.spacePassword || null,
        show_after_end: newTask.showAfterEnd || null,
      })
      if (error) throw error
      setShowAddTask(false)
      setNewTask({ type: "social", title: "", description: "", xpReward: 100, socialAction: "follow", socialPlatform: "twitter", socialUrl: "", twitterTaskType: undefined })
      // Refresh tasks
      const { data: updatedTasks } = await supabase.from("tasks").select("*").eq("quest_id", quest.id).order("order_index")
      setTasks(updatedTasks || [])
    } catch (e: any) {
      setCreateTaskError(e.message || "Failed to create task")
    } finally {
      setCreatingTask(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading quest...</div>
      </div>
    )
  }

  if (!quest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center">
        <div className="text-white text-xl">Quest not found</div>
      </div>
    )
  }

  // Calculate progress and XP
  const completedTasks = tasks.filter((task: Task) => task.user_task_submissions?.status === "verified").length
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
  const userXP = tasks
    .filter((task: Task) => task.user_task_submissions?.status === "verified")
    .reduce((sum: number, task: Task) => sum + task.xp_reward, 0)

  // Helper for task icons
  const getTaskIcon = (task: Task) => {
    switch (task.task_type) {
      case "social":
        if (task.social_platform === "twitter") return <Twitter className="w-5 h-5" />
        if (task.social_platform === "telegram") return <MessageCircle className="w-5 h-5" />
        return <Users className="w-5 h-5" />
      case "download":
        return <Download className="w-5 h-5" />
      case "form":
        return <FileText className="w-5 h-5" />
      case "visit":
        return <Eye className="w-5 h-5" />
      case "learn":
        return <BookOpen className="w-5 h-5" />
      default:
        return <Trophy className="w-5 h-5" />
    }
  }

  // Helper: is current user admin or quest creator?
  const isAdminOrCreator = () => {
    const user = emailUser?.profile || walletUser
    if (!user) return false
    if (user.role === 'admin') return true
    if (quest.creator_id && user.id && quest.creator_id === user.id) return true
    return false
  }
  // Quiz modal rendering
  const renderQuizModal = (task: Task) => {
    const questions = task.learn_questions || []
    const answers = quizAnswers[task.id] || Array(questions.length).fill("")
    return (
      <Dialog open={!!showQuiz[task.id]} onOpenChange={open => setShowQuiz(s => ({ ...s, [task.id]: open }))}>
        <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Quiz: {task.title}</DialogTitle>
            <DialogDescription>Answer all questions to complete the quiz.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault()
              setSubmissionData(d => ({ ...d, [task.id]: { answers } }))
              handleTaskVerification(task)
              setShowQuiz(s => ({ ...s, [task.id]: false }))
            }}
            className="space-y-4"
          >
            {questions.map((q: any, idx: number) => (
              <div key={idx} className="space-y-1">
                <div className="font-semibold">{q.question}</div>
                {q.options && Array.isArray(q.options) && q.options.map((opt: string, oidx: number) => (
                  <label key={oidx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={`quiz-${task.id}-q${idx}`}
                      value={opt}
                      checked={answers[idx] === opt}
                      onChange={() => setQuizAnswers(a => ({ ...a, [task.id]: Object.assign([], answers, { [idx]: opt }) }))}
                      className="accent-green-500"
                      required
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
            ))}
            <div className="flex justify-end gap-2 mt-4">
              <Button type="button" variant="outline" onClick={() => setShowQuiz(s => ({ ...s, [task.id]: false }))}>Cancel</Button>
              <Button type="submit" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Submit Quiz</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    )
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

  return (
    <div className="min-h-screen" style={{ background: '#181818' }}>
      <div className="w-full px-2 sm:px-4 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quests
        </Link>

        {/* Quest Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
              <div className="relative">
                <img
                  src={quest.image_url || "/placeholder.svg?height=300&width=600"}
                  alt={quest.title}
                  className="w-full h-64 object-cover"
                />
                <div className="absolute top-4 left-4 flex gap-2">
                  <Badge
                    className="text-white border-0"
                    style={{
                      background: `linear-gradient(to right, ${quest.quest_categories?.color || '#10b981'}, ${quest.quest_categories?.color || '#059669'})`,
                    }}
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
              <CardContent className="bg-[#111111]">
                <QuestStatsBar totalXP={quest.total_xp} participants={quest.participant_count} taskCount={tasks.length} />
              </CardContent>
            </Card>
          </div>

          {/* Quest Stats Sidebar (desktop only) */}
          <div className="space-y-6 hidden lg:block">
            <Card className="bg-[#111111] border-[#282828] rounded-lg">
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
            <Card className="bg-[#111111] border-[#282828] rounded-lg">
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
          {/* Mobile sidebar below main card */}
          <div className="space-y-2 block lg:hidden mt-8">
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
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
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
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
        <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm rounded-lg">
          <CardHeader className="bg-[#111111] border-b border-[#282828]">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-white">Quest Tasks</CardTitle>
                <CardDescription className="text-gray-300">Complete all tasks to earn the full XP reward</CardDescription>
              </div>
              {isAdminOrCreator() && (
                <Button onClick={() => setShowAddTask(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center gap-2">
                  <Plus className="w-4 h-4" /> Add Task
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="bg-[#111111]">
            {/* Add Task Dialog */}
            <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
              <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
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
                  {newTask.type === "social" && newTask.socialPlatform === "twitter" && (
                    <div className="space-y-4">
                      <label className="text-white block mb-1">Task type</label>
                      <div className="flex flex-wrap gap-2 mb-2">
                        {TWITTER_TASK_TYPES.map((tt) => (
                          <button
                            key={tt.value}
                            type="button"
                            className={`px-4 py-2 rounded border ${newTask.twitterTaskType === tt.value ? "bg-green-700 text-white border-green-500" : "bg-white/10 text-white border-white/20"}`}
                            onClick={() => setNewTask((t: typeof newTask) => ({ ...t, twitterTaskType: tt.value }))}
                          >
                            {tt.label}
                          </button>
                        ))}
                      </div>
                      {/* Tweet Reaction */}
                      {newTask.twitterTaskType === "tweet_reaction" && (
                        <>
                          <label className="text-white block mb-1">Tweet URL</label>
                          <Input value={newTask.tweetUrl || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, tweetUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://twitter.com/username/status/123456789" />
                          {/* Validation: show error if invalid */}
                          {/* Actions */}
                          <label className="text-white block mb-1 mt-2">Actions</label>
                          <div className="flex gap-4">
                            {TWEET_REACTION_ACTIONS.map((action) => (
                              <label key={action.value} className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={Array.isArray(newTask.tweetActions) && newTask.tweetActions.includes(action.value)}
                                  onChange={e => {
                                    setNewTask((t: typeof newTask) => {
                                      const arr = Array.isArray(t.tweetActions) ? [...t.tweetActions] : [];
                                      if (e.target.checked) {
                                        if (!arr.includes(action.value)) arr.push(action.value);
                                      } else {
                                        const idx = arr.indexOf(action.value);
                                        if (idx > -1) arr.splice(idx, 1);
                                      }
                                      return { ...t, tweetActions: arr };
                                    });
                                  }}
                                />
                                {action.label}
                              </label>
                            ))}
                          </div>
                        </>
                      )}
                      {/* Twitter Follow */}
                      {newTask.twitterTaskType === "twitter_follow" && (
                        <>
                          <label className="text-white block mb-1">Twitter username</label>
                          <Input value={newTask.twitterUsername || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, twitterUsername: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="@username" />
                        </>
                      )}
                      {/* Tweet */}
                      {newTask.twitterTaskType === "tweet" && (
                        <>
                          <label className="text-white block mb-1">Tweet words (can include mentions, hashtags, or any type of text)</label>
                          <Input value={newTask.tweetWords || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, tweetWords: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="@zealy_io" />
                          <label className="text-white block mb-1 mt-2">Default tweet <span className="text-gray-400 text-xs">(Optional)</span></label>
                          <Textarea value={newTask.defaultTweet || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, defaultTweet: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="Provide a default tweet for your members." />
                        </>
                      )}
                      {/* Twitter Space */}
                      {newTask.twitterTaskType === "twitter_space" && (
                        <>
                          <label className="text-white block mb-1">Space URL</label>
                          <Input value={newTask.spaceUrl || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, spaceUrl: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="https://twitter.com/i/spaces/1mnGeRkQwqQJX" />
                          <label className="text-white block mb-1 mt-2">Password <span className="text-gray-400 text-xs">(Optional)</span></label>
                          <Input value={newTask.spacePassword || ""} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, spacePassword: e.target.value }))} className="bg-white/10 border-white/20 text-white" placeholder="Enter password" />
                          <div className="flex items-center gap-2 mt-2">
                            <input type="checkbox" checked={!!newTask.showAfterEnd} onChange={e => setNewTask((t: typeof newTask) => ({ ...t, showAfterEnd: e.target.checked }))} />
                            <span className="text-white text-sm">Show quest visible after the space ends</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {/* Add more type-specific fields as needed, but do not show XP, title, description, username */}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setShowAddTask(false)} className="bg-white/10 border-white/20 text-white">Cancel</Button>
                    <Button type="submit" disabled={creatingTask} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">{creatingTask ? "Creating..." : "Add Task"}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            <div className="space-y-4">
              {tasks.map((task: Task, index: number) => (
                <div key={task.id}>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg bg-[#111111] border border-[#282828] hover:bg-emerald-800/80 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {task.user_task_submissions?.status === "verified" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-col gap-2 w-full">
                        {/* Heading and Complete Task button */}
                        <div className="flex items-center gap-2 mb-2">
                          {getTaskIcon(task)}
                          <h3 className={`font-semibold ${task.user_task_submissions?.status === "verified" ? "text-green-400" : "text-white"}`}>{task.title}</h3>
                          <Badge variant="outline" className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30">+{quest.total_xp} XP</Badge>
                          <Badge variant="outline" className="text-xs bg-green-500/20 text-green-400 border-green-500/30">{task.task_type}</Badge>
                          <Button size="sm" className="ml-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">Complete Task</Button>
                        </div>
                        <p className="text-gray-400 text-sm mb-3">{task.description}</p>
                        {task.social_url && (
                          <p className="text-xs text-green-400 hover:underline">
                            <a href={task.social_url} target="_blank" rel="noopener noreferrer">
                              {task.social_url}
                            </a>
                          </p>
                        )}
                        {/* Action button at the bottom on mobile, right on desktop */}
                        <div className="mt-2 sm:mt-0 w-full sm:w-auto flex flex-col sm:flex-row gap-2 justify-end">
                          {/* Quiz actions */}
                          {mounted && task.task_type === "learn" && !task.user_task_submissions?.status && (
                            <>
                              <Button
                                onClick={() => setShowQuiz(s => ({ ...s, [task.id]: true }))}
                                className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                              >
                                Complete Quiz
                              </Button>
                              {renderQuizModal(task)}
                            </>
                          )}
                          {/* Twitter (X) social task action: require X auth, show Go to X and Verify buttons */}
                          {mounted && task.task_type === "social" && task.social_platform === "twitter" && !task.user_task_submissions?.status && (
                            <>
                              {!(emailUser?.profile?.twitter_id) ? (
                                <Button
                                  className="bg-black text-white border-0"
                                  onClick={() => window.location.href = '/profile'}
                                >
                                  Connect X in Profile to Complete
                                </Button>
                              ) : (
                                <>
                                  {/* Go to X button: profile or post */}
                                  <a
                                    href={task.social_action === 'follow' && task.social_username ? `https://x.com/${task.social_username}` :
                                      (task.social_action === 'like' || task.social_action === 'retweet') && task.social_username && task.social_post_id ? `https://x.com/${task.social_username}/status/${task.social_post_id}` : task.social_url || '#'}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                  >
                                    <Button
                                      variant="outline"
                                      className="border-blue-500 text-blue-400 hover:bg-blue-900/40 mb-2"
                                    >
                                      Go to X
                                    </Button>
                                  </a>
                                  <Button
                                    onClick={() => handleTaskVerification(task)}
                                    disabled={verifyingTask === task.id}
                                    className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0"
                                  >
                                    {verifyingTask === task.id ? "Verifying..." : "Verify"}
                                  </Button>
                                </>
                              )}
                            </>
                          )}
                          {/* Admin/creator edit button for quiz */}
                          {mounted && task.task_type === "learn" && isAdminOrCreator() && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => setEditingQuizTask(task)}
                                className="border-green-500 text-green-400 hover:bg-green-900/40"
                              >
                                Edit Quiz
                              </Button>
                              <Dialog open={!!editingQuizTask && editingQuizTask.id === task.id} onOpenChange={open => open ? setEditingQuizTask(task) : setEditingQuizTask(null)}>
                                <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Edit Quiz Task</DialogTitle>
                                  </DialogHeader>
                                  {editingQuizTask && <EditQuestForm quest={quest} onSave={() => setEditingQuizTask(null)} />}
                                </DialogContent>
                              </Dialog>
                            </>
                          )}
                          {/* Other task action buttons (reuse from previous logic) */}
                        </div>
                      </div>
                    </div>
                  </div>
                  {index < tasks.length - 1 && <Separator className="bg-white/10" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 