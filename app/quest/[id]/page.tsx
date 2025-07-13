import { supabase } from "@/lib/supabase"
import { useParams } from "next/navigation"
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
} from "lucide-react"
import Link from "next/link"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import type { Database } from "@/lib/supabase"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import QuestStatsBar from "@/components/QuestStatsBar"

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
}

type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  user_task_submissions?: Database["public"]["Tables"]["user_task_submissions"]["Row"] | null
}

const getAbsoluteUrl = (url: string) => url?.match(/^https?:\/\//i) ? url : `https://${url}`;

function QuestDetailClient({ quest, tasks, userSubmissions, userProfile }: any) {
  const { useState } = require("react")
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null)
  const [submissionData, setSubmissionData] = useState<{ [key: string]: any }>({})

  // Wallet user
  const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
    setWalletUser(user)
    if (user && quest?.id) {
      // fetchTasks() // This will be handled by the parent
    }
  })
  // Email user
  const checkEmailAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
      setEmailUser({ ...user, profile })
      if (profile && quest?.id) {
        // fetchTasks() // This will be handled by the parent
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

  const fetchTasks = async () => {
    try {
      const query = supabase.from("tasks").select("*").eq("quest_id", quest?.id).order("order_index")
      const { data: tasksData, error } = await query
      if (error) throw error
      // If user is connected, fetch their submissions
      const userObj = walletUser || (emailUser?.profile ? { ...emailUser.profile, email: emailUser.email } : null)
      if (userObj) {
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
        if (userId) {
          const { data: submissions } = await supabase
            .from("user_task_submissions")
            .select("*")
            .eq("quest_id", quest?.id)
            .eq("user_id", userId)
          // Merge submissions with tasks
          const tasksWithSubmissions = tasksData?.map((task) => ({
            ...task,
            user_task_submissions: submissions?.find((sub) => sub.task_id === task.id) || null,
          }))
          // setTasks(tasksWithSubmissions || []) // This will be handled by the parent
        } else {
          // setTasks(tasksData || []) // This will be handled by the parent
        }
      } else {
        // setTasks(tasksData || []) // This will be handled by the parent
      }
    } catch (error) {
      console.error("Error fetching tasks:", error)
    } finally {
      setLoading(false)
    }
  }

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
              response = await fetch("/api/verify/twitter-follow", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...baseData,
                  username: submissionData[task.id]?.username || "",
                }),
              })
            } else if (task.social_action === "like") {
              response = await fetch("/api/verify/twitter-like", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  ...baseData,
                  username: submissionData[task.id]?.username || "",
                  postId: task.social_post_id,
                }),
              })
            }
          } else if (task.social_platform === "telegram") {
            response = await fetch("/api/verify/telegram-join", {
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
          // fetchTasks() // This will be handled by the parent
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

  const getTaskActionButton = (task: Task) => {
    const isCompleted = task.user_task_submissions?.status === "verified"
    const isVerifying = verifyingTask === task.id

    if (isCompleted) {
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>
    }

    switch (task.task_type) {
      case "social":
        if (task.social_platform === "telegram") {
          return (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  disabled={isVerifying}
                  className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
                >
                  {isVerifying ? "Verifying..." : "Verify"} <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white">
                <DialogHeader>
                  <DialogTitle>Verify Telegram Group Membership</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    First join the Telegram group, then authenticate with Telegram to verify your membership.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="text-center">
                    <Button
                      onClick={() => window.open(task.social_url || "", "_blank")}
                      className="bg-green-500 hover:bg-green-600 text-white mb-4"
                    >
                      Join Telegram Group
                    </Button>
                  </div>

                  <div className="text-center">
                    <TelegramLoginWidget
                      botUsername="your_bot_username" // Replace with actual bot username
                      onAuth={(telegramUser) => {
                        handleTelegramAuth(task, telegramUser)
                      }}
                    />
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )
        }
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={isVerifying}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
              >
                {isVerifying ? "Verifying..." : "Verify"} <ExternalLink className="w-3 h-3 ml-1" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white">
              <DialogHeader>
                <DialogTitle>Verify Social Task</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Complete the social media action and provide your username for verification.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Your {task.social_platform} username (without @)</label>
                  <Input
                    placeholder="username"
                    value={submissionData[task.id]?.username || ""}
                    onChange={(e) =>
                      setSubmissionData((prev: any) => ({
                        ...prev,
                        [task.id]: { ...prev[task.id], username: e.target.value },
                      }))
                    }
                    className="bg-white/10 border-white/20 text-white"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => window.open(task.social_url || "", "_blank")}
                    variant="outline"
                    className="flex-1"
                  >
                    Open {task.social_platform}
                  </Button>
                  <Button
                    onClick={() => handleTaskVerification(task)}
                    disabled={!submissionData[task.id]?.username}
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    Verify
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )

      case "download":
        return (
          <Button
            size="sm"
            onClick={() => {
              window.open(getAbsoluteUrl(task.download_url || ""), "_blank")
              setTimeout(() => handleTaskVerification(task), 2000)
            }}
            disabled={isVerifying}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {isVerifying ? "Verifying..." : "Download"} <Download className="w-3 h-3 ml-1" />
          </Button>
        )

      case "visit":
        return (
          <Button
            size="sm"
            onClick={() => {
              window.open(getAbsoluteUrl(task.visit_url || ""), "_blank")
              setTimeout(() => handleTaskVerification(task), 3000)
            }}
            disabled={isVerifying}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {isVerifying ? "Verifying..." : "Visit"} <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )

      case "form":
        return (
          <Button
            size="sm"
            onClick={() => {
              window.open(getAbsoluteUrl(task.form_url || ""), "_blank")
              setTimeout(() => handleTaskVerification(task), 5000)
            }}
            disabled={isVerifying}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {isVerifying ? "Verifying..." : "Complete Form"} <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        )

      case "learn":
        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button
                size="sm"
                disabled={isVerifying}
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
              >
                {isVerifying ? "Submitting..." : "Take Quiz"}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Learn & Quiz</DialogTitle>
                <DialogDescription className="text-gray-300">
                  Read the content below and answer the questions.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                <div className="prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: task.learn_content || "" }} />
                </div>
                <Separator className="bg-white/20" />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Quiz Questions</h3>
                  {/* Quiz questions would be rendered here */}
                  <Button
                    onClick={() => handleTaskVerification(task)}
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                  >
                    Submit Quiz
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )

      default:
        return (
          <Button
            size="sm"
            onClick={() => handleTaskVerification(task)}
            disabled={isVerifying}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0"
          >
            {isVerifying ? "Verifying..." : "Complete"}
          </Button>
        )
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
      const response = await fetch("/api/verify/telegram-join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(baseData),
      })
      const result = await response.json()
      if (result.verified) {
        alert(`Task completed! You earned ${result.xpEarned} XP`)
        // fetchTasks() // This will be handled by the parent
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

  const completedTasks = tasks.filter((task: Task) => task.user_task_submissions?.status === "verified").length
  const progressPercentage = tasks.length > 0 ? (completedTasks / tasks.length) * 100 : 0
  const userXP = tasks
    .filter((task: Task) => task.user_task_submissions?.status === "verified")
    .reduce((sum: number, task: Task) => sum + task.xp_reward, 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
      <div className="w-full px-2 sm:px-4 py-8">
        {/* Back Button */}
        <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to Quests
        </Link>

        {/* Quest Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card className="w-full bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
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
              <CardHeader>
                <CardTitle className="text-2xl text-white">{quest.title}</CardTitle>
                <CardDescription className="text-gray-300 text-base">{quest.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <QuestStatsBar totalXP={quest.total_xp} participants={quest.participant_count} taskCount={tasks.length} />
              </CardContent>
            </Card>
          </div>

          {/* Quest Stats Sidebar (desktop only) */}
          <div className="space-y-6 hidden lg:block">
            <Card className="bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm w-full">
              <CardHeader>
                <CardTitle className="text-white">Quest Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
            <Card className="bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm w-full">
              <CardHeader>
                <CardTitle className="text-white">Creator</CardTitle>
              </CardHeader>
              <CardContent>
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
            <Card className="w-full bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
              <CardHeader>
                <CardTitle className="text-white">Quest Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
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
            <Card className="w-full bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm overflow-hidden rounded-xl border mb-2">
              <CardHeader>
                <CardTitle className="text-white">Creator</CardTitle>
              </CardHeader>
              <CardContent>
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
        <Card className="bg-[#0b4b34] border-[#0b4b34] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white">Quest Tasks</CardTitle>
            <CardDescription className="text-gray-300">Complete all tasks to earn the full XP reward</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task: Task, index: number) => (
                <div key={task.id}>
                  <div className="flex flex-col sm:flex-row items-start gap-4 p-4 rounded-lg bg-green-900/80 hover:bg-emerald-800/80 transition-colors">
                    <div className="flex-shrink-0 mt-1">
                      {task.user_task_submissions?.status === "verified" ? (
                        <CheckCircle className="w-6 h-6 text-green-400" />
                      ) : (
                        <Circle className="w-6 h-6 text-gray-400" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex flex-col gap-2 w-full">
                        <div className="flex items-center gap-2 mb-2">
                          {getTaskIcon(task)}
                          <h3
                            className={`font-semibold ${task.user_task_submissions?.status === "verified" ? "text-green-400" : "text-white"}`}
                          >
                            {task.title}
                          </h3>
                          <Badge
                            variant="outline"
                            className="text-xs bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                          >
                            +{task.xp_reward} XP
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-xs bg-green-500/20 text-green-400 border-green-500/30"
                          >
                            {task.task_type}
                          </Badge>
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
                        <div className="mt-2 sm:mt-0 w-full sm:w-auto flex justify-end">
                          {getTaskActionButton(task)}
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

export default async function QuestDetail({ params }: { params: { id: string } }) {
  const questId = params.id
  // Fetch quest and related data
  const { data: quest } = await supabase
    .from("quests")
    .select(`*, quest_categories(*), users(*)`)
    .eq("id", questId)
    .single()
  // Fetch tasks for the quest
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("quest_id", questId)
    .order("order_index")
  // Fetch user (if authenticated)
  const { data: { user } } = await supabase.auth.getUser()
  let userProfile = null
  let userSubmissions = []
  if (user) {
    const { data: profile } = await supabase.from("users").select("*").eq("id", user.id).single()
    userProfile = profile
    // Fetch user submissions for this quest
    const { data: submissions } = await supabase
      .from("user_task_submissions")
      .select("*")
      .eq("quest_id", questId)
      .eq("user_id", user.id)
    userSubmissions = submissions || []
  }
  return <QuestDetailClient quest={quest} tasks={tasks || []} userSubmissions={userSubmissions} userProfile={userProfile} />
}
