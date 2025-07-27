"use client"

import React from 'react'
import { useState, useEffect, useCallback, useMemo } from 'react'
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
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import TaskList from '@/components/quest-detail/TaskList';
import type { Task } from '@/components/quest-detail/types';
import { extractTweetIdFromUrl } from "@/lib/twitter-utils"
import PageContainer from "@/components/PageContainer";

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  project_id?: string | null
  projects?: {
    owner_id: string
    name?: string
    logo_url?: string
  } | null
  // Add missing properties that might be used in the component
  creator_id?: string | null
  participant_count?: string | null
  featured?: boolean | null
  image_url?: string | null
  total_xp?: number | null
}

// Memoized quest header component to prevent unnecessary re-renders
const QuestHeader = React.memo(({ quest, isAdminOrCreator, onAddTask }: { quest: Quest, isAdminOrCreator: () => boolean, onAddTask: () => void }) => (
  <div className="space-y-6">
    {/* Quest Image */}
    {quest.image_url && (
      <div className="relative w-full h-48 rounded-lg overflow-hidden bg-[#111111] border border-[#282828]">
        <img 
          src={quest.image_url} 
          alt={quest.title}
          className="w-full h-full object-cover"
        />
      </div>
    )}
    
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-2">
          <Link href={`/project/${quest.project_id}`} className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <Badge variant="secondary" className="bg-green-600 text-white">
            {quest.status}
          </Badge>
          {quest.featured && (
            <Badge variant="outline" className="border-yellow-500 text-yellow-500">
              Featured
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">{quest.title}</h1>
        <p className="text-gray-300 mb-4">{quest.description}</p>
        
        {/* Project Information */}
        {quest.projects?.name && (
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#111111] border border-[#282828] flex items-center justify-center">
              {quest.projects.logo_url ? (
                <img 
                  src={quest.projects.logo_url} 
                  alt={quest.projects.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <span className="text-white text-sm font-medium">
                  {quest.projects.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-white text-sm font-medium">Project: {quest.projects.name}</p>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-4 text-sm text-gray-400">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>Created {new Date(quest.created_at).toLocaleDateString()}</span>
          </div>
          {quest.participant_count !== null && (
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{quest.participant_count} participants</span>
            </div>
          )}
        </div>
      </div>
      {isAdminOrCreator() && (
        <Button
          onClick={onAddTask}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Task
        </Button>
      )}
    </div>
  </div>
))
QuestHeader.displayName = 'QuestHeader'

// Memoized quest stats component
const QuestStats = React.memo(({ quest, tasks }: { quest: Quest, tasks: Task[] }) => {
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(task => task.status === 'completed').length
  const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  
  // Calculate total XP from tasks if not available on quest
  const totalXP = quest.total_xp || tasks.reduce((sum, task) => sum + (task.xp_reward || 0), 0)

  return (
    <Card className="mb-6 bg-[#111111] border-[#282828]">
      <CardContent className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalTasks}</div>
            <div className="text-sm text-gray-400">Total Tasks</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{completedTasks}</div>
            <div className="text-sm text-gray-400">Completed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-white">{totalXP}</div>
            <div className="text-sm text-gray-400">Total XP</div>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Progress</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardContent>
    </Card>
  )
})
QuestStats.displayName = 'QuestStats'

export default function QuestDetailClient({ quest, tasks: initialTasks }: { quest: Quest, tasks: Task[] }) {
  // All hooks must be called at the top level, before any conditional logic
  const [mounted, setMounted] = useState(false)
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showEditTask, setShowEditTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [creatingTask, setCreatingTask] = useState(false)
  const [updatingTask, setUpdatingTask] = useState(false)
  const [createTaskError, setCreateTaskError] = useState("")
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null)
  const [showQuiz, setShowQuiz] = useState<Record<string, boolean>>({})
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number[]>>({})
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({})
  const [currentUserUUID, setCurrentUserUUID] = useState<string | null>(null)
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [questCompleted, setQuestCompleted] = useState(false)
  const [updateTaskError, setUpdateTaskError] = useState("")
  const [showResponsesViewer, setShowResponsesViewer] = useState(false)
  const [newTask, setNewTask] = useState<any>({
    type: "",
    title: "",
    description: "",
    xp_reward: 100,
    // Social task fields
    social_platform: "",
    social_action: "",
    social_url: "",
    social_username: "",
    social_post_id: "",
    // Quiz task fields
    learn_content: "",
    learn_questions: null,
    learn_passing_score: 70,
    // URL view task fields
    visit_url: "",
    visit_title: "",
    visit_description: "",
    visit_duration_seconds: 30,
  })

  // Add new state for project data
  const [projectData, setProjectData] = useState<any>(null)

  // Debug logging
  useEffect(() => {
    console.log('QuestDetailClient - Quest:', quest)
    console.log('QuestDetailClient - Initial Tasks:', initialTasks)
    console.log('QuestDetailClient - Tasks State:', tasks)
  }, [quest, initialTasks, tasks])

  // Memoized auth check function
  const checkAuth = useCallback(async () => {
    try {
      // Check wallet auth
      const walletUser = await walletAuth.getCurrentUser()
      setWalletUser(walletUser)

      // Check email auth
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setEmailUser(user)
        setCurrentUserUUID(user.id)
      }

      setIsAuthenticated(!!walletUser || !!user)
      setLoading(false)
    } catch (error) {
      console.error('Error checking auth:', error)
      setLoading(false)
    }
  }, [])

  // Memoized project data fetch
  const fetchProjectData = useCallback(async () => {
    if (!quest.project_id) return

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', quest.project_id)
        .single()

      if (!error && project) {
        setProjectData(project)
        // Remove the project owner fetch since it's causing 406 errors
        // The owner_id is already available in quest.projects?.owner_id
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
    }
  }, [quest.project_id])

  // Memoized isAdminOrCreator function
  const isAdminOrCreator = useCallback(() => {
    if (!currentUserUUID) return false
    return currentUserUUID === quest.creator_id || currentUserUUID === quest.projects?.owner_id
  }, [currentUserUUID, quest.creator_id, quest.projects?.owner_id])

  // Memoized task verification handler
  const handleTaskVerification = useCallback(async (task: Task) => {
    if (!currentUserUUID) {
      toast.error('Please sign in to verify tasks')
      return
    }

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    console.log('DEBUG: Session check:', { 
      hasSession: !!session, 
      sessionError, 
      currentUserUUID 
    })

    if (!session) {
      toast.error('Please sign in to verify tasks')
      return
    }

    setVerifyingTask(task.id)
    try {
      // Get user's social accounts for verification
      const { data: userSocialAccounts, error: socialError } = await supabase
        .from('social_accounts')
        .select('platform, platform_username, access_token')
        .eq('user_id', currentUserUUID)

      if (socialError) {
        console.error('Error fetching user social accounts:', socialError)
        toast.error('Failed to fetch social accounts')
        return
      }

      let verified = false
      let message = ""

      // Verify based on task type
      switch (task.type) {
        case 'social':
          if (task.social_platform === 'twitter') {
            console.log('DEBUG: Starting Twitter verification for task:', task.id)
            // Use the existing X API verification endpoint
            const response = await fetch('/api/verify/twitter-follow-real', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                // Include authentication headers
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              credentials: 'include', // Include cookies for session
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID // Pass the user ID for wallet auth
              })
            })

            console.log('DEBUG: Twitter verification response status:', response.status)
            const result = await response.json()
            console.log('DEBUG: Twitter verification result:', result)
            
            if (response.status === 400 && result.action === 'connect_twitter') {
              // User needs to connect Twitter account
              toast.error(result.message || 'Please connect your Twitter account first')
              // Show a toast with a link to profile page
              toast.error('Please connect your Twitter account to verify tasks. Go to your profile to connect your account.', {
                action: {
                  label: 'Go to Profile',
                  onClick: () => window.location.href = '/profile'
                }
              })
              return
            }
            
            verified = result.verified
            message = result.message || (verified ? 'Task verified!' : 'Verification failed')
          } else if (task.social_platform === 'discord') {
            // For Discord, redirect to OAuth flow
            const guildId = task.social_url?.match(/discord\.gg\/([a-zA-Z0-9]+)/)?.[1] || 
                           task.social_url?.match(/discord\.com\/invite\/([a-zA-Z0-9]+)/)?.[1]
            
            if (guildId) {
              // Redirect to Discord OAuth with state containing task info
              const state = `${guildId}:${task.id}`
              const discordClientId = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID
              if (!discordClientId) {
                toast.error('Discord integration not configured')
                return
              }
              const authUrl = `https://discord.com/oauth2/authorize?client_id=${discordClientId}&response_type=code&redirect_uri=${encodeURIComponent(window.location.origin + '/discord-callback')}&scope=identify%20guilds.members.read&state=${state}`
              window.location.href = authUrl
              return // Don't show toast since we're redirecting
            } else {
              message = 'Invalid Discord server URL'
            }
          } else if (task.social_platform === 'telegram') {
            console.log('DEBUG: Starting Telegram verification for task:', task.id)
            // For Telegram, use the existing verification endpoint
            const response = await fetch('/api/verify/telegram-join-real', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                // Include authentication headers
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              credentials: 'include', // Include cookies for session
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID, // Pass the user ID for wallet auth
                channelId: task.social_url?.match(/t\.me\/([a-zA-Z0-9_]+)/)?.[1] || task.social_username
              })
            })

            console.log('DEBUG: Telegram verification response status:', response.status)
            const result = await response.json()
            console.log('DEBUG: Telegram verification result:', result)
            
            if (response.status === 400 && result.action === 'connect_telegram') {
              // User needs to connect Telegram account
              toast.error(result.message || 'Please connect your Telegram account first')
              // Show a toast with a link to profile page
              toast.error('Please connect your Telegram account to verify tasks. Go to your profile to connect your account.', {
                action: {
                  label: 'Go to Profile',
                  onClick: () => window.location.href = '/profile'
                }
              })
              return
            }
            
            verified = result.verified
            message = result.message || (verified ? 'Task verified!' : 'Verification failed')
          }
          break

        case 'learn':
          // For quiz tasks, we'll implement quiz verification later
          message = 'Quiz verification not implemented yet'
          break

        case 'visit':
          // For visit tasks, we'll implement visit tracking later
          message = 'Visit verification not implemented yet'
          break

        default:
          message = 'Unsupported task type'
      }

      if (verified) {
        // Create task submission record
        const submissionData = {
          user_id: currentUserUUID,
          task_id: task.id,
          quest_id: quest.id,
          status: 'verified',
          submitted_at: new Date().toISOString(),
          verified_at: new Date().toISOString(),
          submission_data: {
            task_type: task.type,
            social_platform: task.social_platform,
            social_action: task.social_action,
            social_url: task.social_url,
            visit_url: task.visit_url,
            learn_content: task.learn_content
          },
          verification_data: {
            method: 'api_verification',
            verified: true
          },
          xp_earned: task.xp_reward,
          xp_awarded: task.xp_reward
        }

        // Save task submission to database
        const { error: submissionError } = await supabase
          .from('user_task_submissions')
          .insert(submissionData)

        if (submissionError) {
          console.error('Error creating submission:', submissionError)
          toast.error('Failed to record task completion')
          return
        }

        // Update the task status in the UI
        setTasks(prev => prev.map(t => 
          t.id === task.id 
            ? { ...t, user_task_submissions: submissionData }
            : t
        ))

        toast.success(`Task verified! You earned ${task.xp_reward} XP`)
      } else {
        toast.error(message || 'Verification failed')
      }

    } catch (error) {
      console.error('Error verifying task:', error)
      toast.error('Failed to verify task')
    } finally {
      setVerifyingTask(null)
    }
  }, [currentUserUUID, quest.id, emailUser?.email, walletUser?.walletAddress])

  // Memoized task deletion handler
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error

      setTasks(prev => prev.filter(task => task.id !== taskId))
      toast.success('Task deleted successfully!')
    } catch (error) {
      console.error('Error deleting task:', error)
      toast.error('Failed to delete task')
    }
  }, [])

  // Memoized task creation handler
  const handleCreateTask = useCallback(async () => {
    if (!newTask.type) {
      setCreateTaskError('Please select a task type')
      return
    }

    setCreatingTask(true)
    setCreateTaskError("")

    try {
      // Prepare task data based on type
      const taskData: any = {
        quest_id: quest.id,
        xp_reward: newTask.xp_reward,
        type: newTask.type,
      }

      // Generate dynamic title and description based on task type
      switch (newTask.type) {
        case 'social':
          // Remove validation for non-existent database fields
          // if (!newTask.social_platform || !newTask.social_action) {
          //   setCreateTaskError('Please select both social network and action')
          //   setCreatingTask(false)
          //   return
          // }

          // Generate dynamic title and description
          const platformNames: Record<string, string> = {
            twitter: 'X',
            discord: 'Discord',
            telegram: 'Telegram'
          }
          
          const actionNames: Record<string, string> = {
            follow: 'Follow',
            like: 'Like post',
            retweet: 'Retweet post',
            join: 'Join channel'
          }

          taskData.title = `${platformNames[newTask.social_platform]}`
          taskData.description = `${actionNames[newTask.social_action]}`
          
          // For follow actions, automatically fetch admin's social account
          if (newTask.social_action === 'follow') {
            try {
              // Get the project owner's social account for the platform
              const { data: socialAccount, error: socialError } = await supabase
                .from('social_accounts')
                .select('username, account_id, platform')
                .eq('platform', newTask.social_platform)
                .eq('user_id', quest.projects?.owner_id)
                .single()

              if (socialAccount && !socialError) {
                // Generate the appropriate URL based on platform
                let socialUrl = ''
                switch (newTask.social_platform) {
                  case 'twitter':
                    socialUrl = `https://x.com/${socialAccount.username}`
                    break
                  case 'discord':
                    // For Discord, we need the server invite URL
                    // TODO: Admins should update this with real invite URL in project settings
                    socialUrl = '' // Empty string - admin needs to configure Discord invite URL
                    break
                  case 'telegram':
                    socialUrl = `https://t.me/${socialAccount.username}`
                    break
                }
                taskData.social_url = socialUrl
                taskData.social_username = socialAccount.username
              } else {
                console.warn('No social account found for admin on platform:', newTask.social_platform)
              }
            } catch (error) {
              console.error('Error fetching admin social account:', error)
            }
          }
          
          // Only add URL for actions that require it (like/retweet)
          if ((newTask.social_platform === 'twitter' && (newTask.social_action === 'like' || newTask.social_action === 'retweet'))) {
            if (!newTask.social_url) {
              setCreateTaskError('Please provide the post URL')
              setCreatingTask(false)
              return
            }
            taskData.social_url = newTask.social_url
          }
          break

        case 'learn':
          if (!newTask.learn_content) {
            setCreateTaskError('Please provide quiz content')
            setCreatingTask(false)
            return
          }
          
          taskData.title = 'Quiz'
          taskData.description = 'Complete the quiz'
          taskData.learn_content = newTask.learn_content
          taskData.learn_passing_score = newTask.learn_passing_score
          taskData.learn_questions = newTask.learn_questions
          break

        case 'visit':
          if (!newTask.visit_url) {
            setCreateTaskError('Please provide the URL to visit')
            setCreatingTask(false)
            return
          }
          
          taskData.title = 'Visit URL'
          taskData.description = 'Visit the specified URL'
          taskData.visit_url = newTask.visit_url
          taskData.visit_duration_seconds = newTask.visit_duration_seconds
          break
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()

      if (error) throw error

      setTasks(prev => [...prev, data])
      setShowAddTask(false)
      setNewTask({
        type: "",
        title: "",
        description: "",
        xp_reward: 100,
        // Social task fields
        social_platform: "",
        social_action: "",
        social_url: "",
        social_username: "",
        social_post_id: "",
        // Quiz task fields
        learn_content: "",
        learn_questions: null,
        learn_passing_score: 70,
        // URL view task fields
        visit_url: "",
        visit_title: "",
        visit_description: "",
        visit_duration_seconds: 30,
      })
      toast.success('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      setCreateTaskError('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }, [newTask, quest.id, quest.projects?.owner_id])

  // Memoized task update handler
  const handleEditTask = useCallback(async () => {
    if (!editingTask || !newTask.title || !newTask.type) {
      setUpdateTaskError('Please fill in all required fields')
      return
    }

    setUpdatingTask(true)
    setUpdateTaskError("")

    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          title: newTask.title,
          description: newTask.description,
          type: newTask.type,
          xp_reward: newTask.xp_reward,
          // Update other fields based on task type
        })
        .eq('id', editingTask.id)

      if (error) throw error

      setTasks(prev => prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...newTask }
          : task
      ))
      setShowEditTask(false)
      setEditingTask(null)
      toast.success('Task updated successfully!')
    } catch (error) {
      console.error('Error updating task:', error)
      setUpdateTaskError('Failed to update task')
    } finally {
      setUpdatingTask(false)
    }
  }, [editingTask, newTask])

  // Memoized social accounts fetch
  const fetchCurrentUserSocialAccounts = useCallback(async () => {
    if (!currentUserUUID) return

    try {
      const { data, error } = await supabase
        .from('social_accounts')
        .select('*')
        .eq('user_id', currentUserUUID)

      if (error) {
        console.error('Error fetching social accounts:', error)
      }
    } catch (error) {
      console.error('Error fetching social accounts:', error)
    }
  }, [currentUserUUID])

  // Memoized user task submissions fetch
  const fetchUserTaskSubmissions = useCallback(async () => {
    if (!currentUserUUID || !quest.id) return

    try {
      const { data: submissions, error } = await supabase
        .from('user_task_submissions')
        .select('*')
        .eq('user_id', currentUserUUID)
        .eq('quest_id', quest.id)

      if (error) {
        console.error('Error fetching user task submissions:', error)
        return
      }

      // Update tasks with submission data
      if (submissions) {
        setTasks(prev => prev.map(task => {
          const submission = submissions.find(s => s.task_id === task.id)
          return submission ? { ...task, user_task_submissions: submission } : task
        }))
      }
    } catch (error) {
      console.error('Error fetching user task submissions:', error)
    }
  }, [currentUserUUID, quest.id])

  // Memoized user social username getter
  const getUserSocialUsername = useCallback((platform: string) => {
    // Implementation here
    return ""
  }, [])

  // Memoized quiz modal renderer
  const renderQuizModal = useCallback((task: Task) => {
    if (task.type !== "learn" || !showQuiz[task.id]) return null;
    
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
            
            {/* Quiz content would go here */}
          </div>
        </DialogContent>
      </Dialog>
    );
  }, [showQuiz]);

  // Memoized main content to prevent unnecessary re-renders
  const mainContent = useMemo(() => (
    <PageContainer>
      <div className="max-w-4xl mx-auto">
        <QuestHeader quest={quest} isAdminOrCreator={isAdminOrCreator} onAddTask={() => setShowAddTask(true)} />
        
        <QuestStats quest={quest} tasks={tasks} />

        <Card className="bg-[#111111] border-[#282828]">
          <CardHeader>
            <CardTitle className="text-white">Tasks</CardTitle>
            <CardDescription className="text-gray-400">
              Complete tasks to earn XP and progress through this quest
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded text-yellow-300 text-xs">
                <p>Debug: {tasks.length} tasks loaded</p>
                <p>Quest ID: {quest.id}</p>
                <p>Quest Title: {quest.title}</p>
              </div>
            )}
            
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

        {/* Add Task Dialog */}
        <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Task</DialogTitle>
              <DialogDescription>
                Create a new task for this quest
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-white">Task Type</label>
                <Select value={newTask.type} onValueChange={(value) => setNewTask({...newTask, type: value})}>
                  <SelectTrigger className="bg-[#111111] border-[#282828] text-white">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#282828]">
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="learn">Quiz</SelectItem>
                    <SelectItem value="visit">URL View</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* XP Reward - Always shown */}
              <div>
                <label className="text-sm font-medium text-white">XP Reward</label>
                <Input 
                  type="number"
                  value={newTask.xp_reward}
                  onChange={(e) => setNewTask({...newTask, xp_reward: parseInt(e.target.value) || 0})}
                  className="bg-[#111111] border-[#282828] text-white"
                  placeholder="Enter XP reward"
                />
              </div>

              {/* Social Media Task Fields */}
              {newTask.type === 'social' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-white">Social Network</label>
                    <Select value={newTask.social_platform} onValueChange={(value) => setNewTask({...newTask, social_platform: value})}>
                      <SelectTrigger className="bg-[#111111] border-[#282828] text-white">
                        <SelectValue placeholder="Select social network" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#282828]">
                        <SelectItem value="twitter">X (Twitter)</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white">Action</label>
                    <Select value={newTask.social_action} onValueChange={(value) => setNewTask({...newTask, social_action: value})}>
                      <SelectTrigger className="bg-[#111111] border-[#282828] text-white">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#282828]">
                        {newTask.social_platform === 'twitter' && (
                          <>
                            <SelectItem value="follow">Follow</SelectItem>
                            <SelectItem value="like">Like post</SelectItem>
                            <SelectItem value="retweet">Retweet post</SelectItem>
                          </>
                        )}
                        {newTask.social_platform === 'discord' && (
                          <SelectItem value="join">Join channel</SelectItem>
                        )}
                        {newTask.social_platform === 'telegram' && (
                          <SelectItem value="join">Join channel</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Show URL field only for X actions that require it */}
                  {(newTask.social_platform === 'twitter' && (newTask.social_action === 'like' || newTask.social_action === 'retweet')) && (
                    <div>
                      <label className="text-sm font-medium text-white">Post URL</label>
                      <Input 
                        value={newTask.social_url}
                        onChange={(e) => setNewTask({...newTask, social_url: e.target.value})}
                        className="bg-[#111111] border-[#282828] text-white"
                        placeholder="Enter post URL to like/retweet"
                      />
                    </div>
                  )}
                </>
              )}

              {/* Quiz Task Fields */}
              {newTask.type === 'learn' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-white">Quiz Content</label>
                    <Textarea 
                      value={newTask.learn_content}
                      onChange={(e) => setNewTask({...newTask, learn_content: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white"
                      placeholder="Enter quiz content or instructions"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white">Passing Score (%)</label>
                    <Input 
                      type="number"
                      value={newTask.learn_passing_score}
                      onChange={(e) => setNewTask({...newTask, learn_passing_score: parseInt(e.target.value) || 70})}
                      className="bg-[#111111] border-[#282828] text-white"
                      placeholder="Enter passing score"
                    />
                  </div>
                </>
              )}

              {/* URL View Task Fields */}
              {newTask.type === 'visit' && (
                <>
                  <div>
                    <label className="text-sm font-medium text-white">URL to Visit</label>
                    <Input 
                      value={newTask.visit_url}
                      onChange={(e) => setNewTask({...newTask, visit_url: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white"
                      placeholder="Enter URL to visit"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-white">Visit Duration (seconds)</label>
                    <Input 
                      type="number"
                      value={newTask.visit_duration_seconds}
                      onChange={(e) => setNewTask({...newTask, visit_duration_seconds: parseInt(e.target.value) || 30})}
                      className="bg-[#111111] border-[#282828] text-white"
                      placeholder="Enter minimum visit duration"
                    />
                  </div>
                </>
              )}
              
              {createTaskError && (
                <p className="text-red-400 text-sm">{createTaskError}</p>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={handleCreateTask}
                  disabled={creatingTask}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowAddTask(false)}
                  className="border-[#282828] text-white hover:bg-[#1a1a1a]"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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
                tasks={tasks}
                isAdmin={isAdminOrCreator()}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  ), [
    quest, tasks, isAdminOrCreator, verifyingTask, submissionData,
    handleTaskVerification, handleDeleteTask, walletUser, emailUser,
    questCompleted, showResponsesViewer, setShowResponsesViewer, renderQuizModal,
    showAddTask, setShowAddTask, newTask, createTaskError, creatingTask, handleCreateTask
  ])

  // Memoized loading content
  const loadingContent = useMemo(() => (
    <PageContainer>
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading quest...</div>
      </div>
    </PageContainer>
  ), [])

  // Memoized skeleton content
  const skeletonContent = useMemo(() => (
    <PageContainer>
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-32 w-full" />
      </div>
    </PageContainer>
  ), [])

  useEffect(() => {
    setMounted(true)
    checkAuth()
    fetchProjectData()
  }, [checkAuth, fetchProjectData])

  useEffect(() => {
    if (mounted && quest.project_id && currentUserUUID) {
      fetchCurrentUserSocialAccounts()
      fetchUserTaskSubmissions()
    }
  }, [mounted, quest.project_id, currentUserUUID, fetchCurrentUserSocialAccounts, fetchUserTaskSubmissions])

  // Show loading state while auth is being checked
  if (!mounted) {
    return skeletonContent
  }

  if (loading) {
    return loadingContent
  }

  return mainContent
} 