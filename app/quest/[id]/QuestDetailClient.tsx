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
} from "lucide-react"
import Link from "next/link"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"
import type { Database } from "@/lib/supabase"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import QuestStatsBar from "@/components/QuestStatsBar"
import { supabase } from "@/lib/supabase"
import EditQuestForm from "@/components/edit-quest-form"

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
}
type Task = Database["public"]["Tables"]["tasks"]["Row"] & {
  user_task_submissions?: Database["public"]["Tables"]["user_task_submissions"]["Row"] | null
}
const getAbsoluteUrl = (url: string) => url?.match(/^https?:\/\//i) ? url : `https://${url}`;

export default function QuestDetailClient({ quest, tasks }: { quest: Quest, tasks: Task[] }) {
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
        <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white max-w-lg">
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
                                <DialogContent className="bg-[#0b4b34] border-[#0b4b34] text-white max-w-2xl">
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