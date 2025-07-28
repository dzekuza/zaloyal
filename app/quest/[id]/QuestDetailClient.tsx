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
  Edit,
  FileDown,
} from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import QuestStatsBar from "@/components/QuestStatsBar"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import AdminSubmissionsTable from "@/components/admin-submissions-table"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import TaskList from '@/components/quest-detail/TaskList';
import type { Task } from '@/components/quest-detail/types';
import { extractTweetIdFromUrl } from "@/lib/twitter-utils"
import PageContainer from "@/components/PageContainer";
import TaskForm from "@/components/quest-detail/TaskForm";
import QuizComponent from "@/components/quest-detail/QuizComponent";
import EditQuestForm from "@/components/edit-quest-form";

// Safe wallet auth import
import { walletAuth, WalletUser } from "@/lib/wallet-auth"

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  project_id?: string | null
  projects?: {
    owner_id: string
    name?: string
    logo_url?: string
  } | null
  creator_id?: string | null
  participant_count?: string | null
  featured?: boolean | null
  image_url?: string | null
  total_xp?: number | null
}

// Memoized quest header component to prevent unnecessary re-renders
const QuestHeader = React.memo(({ quest, isAdminOrCreator, onAddTask, onExport, onEditQuest }: { 
  quest: Quest, 
  isAdminOrCreator: () => boolean, 
  onAddTask: () => void, 
  onExport: () => void,
  onEditQuest: () => void 
}) => {
  const adminStatus = isAdminOrCreator()
  
  return (
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
                    className="w-6 h-6 rounded-full object-cover"
                  />
                ) : (
                  <FileText className="w-4 h-4 text-gray-400" />
                )}
              </div>
              <span className="text-gray-300">{quest.projects.name}</span>
            </div>
          )}
          
          {/* Quest Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <div className="flex items-center gap-1">
              <Target className="w-4 h-4" />
              <span>{quest.total_xp || 0} XP</span>
            </div>
            <div className="flex items-center gap-1">
              <Eye className="w-4 h-4" />
              <span>{quest.participant_count || 0} participants</span>
            </div>
          </div>
        </div>
        
        {adminStatus && (
          <div className="flex gap-2">
            <Button onClick={onAddTask} className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
            <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <FileDown className="w-4 h-4 mr-2" />
              Export Submissions
            </Button>
            <Button onClick={onEditQuest} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <Edit className="w-4 h-4 mr-2" />
              Edit Quest
            </Button>
          </div>
        )}
      </div>
    </div>
  )
})

export default function QuestDetailClient({ quest, tasks: initialTasks }: { quest: Quest, tasks: Task[] }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [verifyingTask, setVerifyingTask] = useState<string | null>(null)
  const [submissionData, setSubmissionData] = useState<Record<string, any>>({})
  const [showEditTask, setShowEditTask] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [showQuiz, setShowQuiz] = useState<Record<string, boolean>>({})
  const [currentUserUUID, setCurrentUserUUID] = useState<string | null>(null)
  const [walletUser, setWalletUser] = useState<any>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showEditQuest, setShowEditQuest] = useState(false)
  const { toast } = useToast()

  // Track task completion
  const trackTaskCompletion = async (task: Task, action: string, metadata?: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      await fetch('/api/track-task-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          taskId: task.id,
          questId: quest.id,
          action,
          taskType: task.type,
          metadata
        })
      })
    } catch (error) {
      console.error('Error tracking task completion:', error)
    }
  }

  // Refresh tasks data
  const refreshTasks = async () => {
    try {
      const { data: tasksData, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('quest_id', quest.id)
        .order('order_index', { ascending: true })

      if (error) {
        console.error('Error refreshing tasks:', error)
        return
      }

      setTasks(tasksData || [])
    } catch (error) {
      console.error('Error refreshing tasks:', error)
    }
  }

  // Export submissions function
  const handleExportSubmissions = async () => {
    try {
      // Fetch all submissions for this quest
      const { data: submissions, error } = await supabase
        .from('user_task_submissions')
        .select(`
          *,
          users:user_id (*),
          tasks:task_id (*)
        `)
        .eq('quest_id', quest.id)

      if (error) {
        console.error('Error fetching submissions:', error)
        toast({
          title: 'Export failed',
          description: 'Failed to fetch submissions data',
          variant: 'destructive',
        })
        return
      }

      console.log('DEBUG: Fetched submissions:', submissions)

      // Transform data for CSV export
      const csvData = submissions?.map(submission => ({
        'User ID': submission.user_id || 'Unknown',
        'Username': submission.users?.username || submission.users?.email || 'Unknown',
        'Wallet Address': submission.users?.wallet_address || 'N/A',
        'Task Title': submission.tasks?.title || 'Unknown Task',
        'Task Type': submission.tasks?.type || 'Unknown',
        'XP Earned': submission.xp_earned || 0,
        'Submission Date': submission.submitted_at || submission.created_at || 'N/A',
        'Verification Date': submission.verified_at || 'N/A',
        'Social Username': submission.social_username || 'N/A',
        'Social Post URL': submission.social_post_url || 'N/A',
        'Quiz Answers': submission.quiz_answers ? JSON.stringify(submission.quiz_answers) : 'N/A',
        'Manual Verification Note': submission.manual_verification_note || 'N/A',
        'XP Removal Reason': submission.xp_removal_reason || 'N/A',
      })) || []

      if (csvData.length === 0) {
        toast({
          title: 'No data to export',
          description: 'No submissions found for this quest',
          variant: 'destructive',
        })
        return
      }

      // Convert to CSV
      const headers = Object.keys(csvData[0])
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${String(row[header as keyof typeof row])}"`).join(','))
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `${quest.title}_submissions_${new Date().toISOString().split('T')[0]}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: 'Export successful',
        description: `Exported ${csvData.length} submissions`,
      })
    } catch (error) {
      console.error('Error exporting submissions:', error)
      toast({
        title: 'Export failed',
        description: 'An error occurred while exporting',
        variant: 'destructive',
      })
    }
  }

  // Check authentication status
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Check for wallet authentication
        const walletAuthResult = await walletAuth.getCurrentUser()
        if (walletAuthResult) {
          setWalletUser(walletAuthResult)
          setCurrentUserUUID(walletAuthResult.walletAddress)
          setIsAuthenticated(true)
        }

        // Check for email authentication
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setEmailUser(session.user)
          setCurrentUserUUID(session.user.id)
          setIsAuthenticated(true)
        }

        setLoading(false)
      } catch (error) {
        console.error('Error checking authentication:', error)
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  // Check if user is admin or creator
  const isAdminOrCreator = useCallback(() => {
    if (!currentUserUUID) {
      return false
    }
    
    // Check if user is the project owner (quest creator)
    const isCreator = currentUserUUID === quest.projects?.owner_id
    // Check if user has admin role
    const isAdmin = (emailUser?.user_metadata?.role === 'admin') || (emailUser?.app_metadata?.role === 'admin')
    
    return isCreator || isAdmin
  }, [currentUserUUID, quest.projects?.owner_id, emailUser])

  // Memoized task verification handler
  const handleTaskVerification = useCallback(async (task: Task) => {
    console.log('DEBUG: handleTaskVerification called for task:', task.id, task);
    
    if (!currentUserUUID) {
      console.log('DEBUG: No currentUserUUID');
      toast({
        title: 'Please sign in to verify tasks',
        description: 'Please sign in to verify tasks',
        variant: 'destructive',
      })
      return
    }

    // Check if user is authenticated
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    console.log('DEBUG: Session check:', { session: !!session, sessionError });
    
    if (!session) {
      console.log('DEBUG: No session found');
      toast({
        title: 'Please sign in to verify tasks',
        description: 'Please sign in to verify tasks',
        variant: 'destructive',
      })
      return
    }

    setVerifyingTask(task.id)
    console.log('DEBUG: Starting verification process for task:', task.id);
    try {
      let verified = false
      let message = ""

      // Verify based on task type using new auth.users data
      switch (task.type) {
        case 'social':
          if (task.social_platform === 'twitter') {
            
            // Get user's X data from auth.users
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            
            console.log('DEBUG: User data:', user);
            console.log('DEBUG: User app_metadata:', (user as any)?.app_metadata);
            console.log('DEBUG: User user_metadata:', (user as any)?.user_metadata);
            
            if (userError || !user) {
              console.log('DEBUG: User error or no user:', userError);
              toast({
                title: 'Authentication error',
                description: 'Please sign in again to verify tasks',
                variant: 'destructive',
              })
              return
            }

            // Check if user has X authentication - try multiple methods
            const hasXAuth = (user as any)?.app_metadata?.providers?.includes('twitter') || 
                           (user as any)?.user_metadata?.provider === 'twitter' ||
                           (user as any)?.identities?.some((identity: any) => identity.provider === 'twitter')
            
            console.log('DEBUG: Has X auth check:', hasXAuth);
            console.log('DEBUG: User identities:', (user as any)?.identities);
            
            if (!hasXAuth) {
              console.log('DEBUG: No X authentication found');
              toast({
                title: 'X account not connected',
                description: 'Please connect your X account in your profile to verify tasks',
                variant: 'destructive',
              })
              return
            }

            // Get X user ID from user metadata
            const xUserId = (user as any)?.user_metadata?.provider_id || (user as any)?.user_metadata?.sub
            if (!xUserId) {
              toast({
                title: 'X account data not found',
                description: 'Please reconnect your X account in your profile',
                variant: 'destructive',
              })
              return
            }

            // Determine the action based on task
            let action = 'follow'
            let targetId = null
            let tweetId = null

            if (task.social_action === 'follow') {
              action = 'follow'
              // Extract target account ID from social_url or social_username
              targetId = task.social_url?.match(/twitter\.com\/([^\/\?]+)/)?.[1] || 
                        task.social_username || 
                        task.social_url?.match(/x\.com\/([^\/\?]+)/)?.[1]
            } else if (task.social_action === 'like') {
              action = 'like'
              tweetId = task.social_url?.match(/status\/(\d+)/)?.[1]
            } else if (task.social_action === 'retweet') {
              action = 'retweet'
              tweetId = task.social_url?.match(/status\/(\d+)/)?.[1]
            }

            if (!targetId && action === 'follow') {
              toast({
                title: 'Invalid task configuration',
                description: 'Target account not specified for follow task',
                variant: 'destructive',
              })
              return
            }

            if (!tweetId && (action === 'like' || action === 'retweet')) {
              toast({
                title: 'Invalid task configuration',
                description: 'Tweet ID not found for like/retweet task',
                variant: 'destructive',
              })
              return
            }

            console.log('DEBUG: Starting X verification for task:', task.id);
            console.log('DEBUG: User ID:', currentUserUUID);
            console.log('DEBUG: Task data:', task);
            
            // 🔥 BEST PRACTICE: Call the simplified X verification API
            const response = await fetch('/api/verify/twitter-follow-real', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              credentials: 'include',
              body: JSON.stringify({
                taskId: task.id
              })
            })
            
            console.log('DEBUG: X verification response status:', response.status);

            const result = await response.json()
            console.log('DEBUG: X verification response:', result);
            
            if (!response.ok) {
              if (response.status === 400 && result.action === 'connect_twitter') {
                toast({
                  title: 'X account not connected',
                  description: 'Please connect your X account in your profile to verify tasks',
                  variant: 'destructive',
                })
              } else {
                toast({
                  title: 'Verification failed',
                  description: result.error || result.message || 'Failed to verify task',
                  variant: 'destructive',
                })
              }
              return
            }
            
            verified = result.verified
            message = result.message || (verified ? 'Task verified successfully!' : 'Task verification failed. Please complete the task and try again.')
          } else if (task.social_platform === 'discord') {
            // For Discord verification using the new API
            const response = await fetch('/api/verify/discord-join-real', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              credentials: 'include',
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID,
                questId: quest.id
              })
            })
            
            console.log('DEBUG: Discord verification response status:', response.status);

            const result = await response.json()
            console.log('DEBUG: Discord verification response:', result);
            
            if (!response.ok) {
              if (response.status === 400 && result.action === 'connect_discord') {
                toast({
                  title: 'Discord account not connected',
                  description: 'Please connect your Discord account in your profile to verify tasks',
                  variant: 'destructive',
                })
              } else {
                toast({
                  title: 'Verification failed',
                  description: result.error || result.message || 'Failed to verify Discord task',
                  variant: 'destructive',
                })
              }
              return
            }
            
            verified = result.verified
            message = result.message || (verified ? 'Discord task verified successfully!' : 'Discord task verification failed. Please join the server and try again.')
          } else if (task.social_platform === 'telegram') {
            // For Telegram, use the existing verification endpoint
            const response = await fetch('/api/verify/telegram-join-real', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || ''}`
              },
              credentials: 'include',
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID,
                channelId: task.social_url?.match(/t\.me\/([a-zA-Z0-9_]+)/)?.[1] || task.social_username
              })
            })

            const result = await response.json()
            
            if (response.status === 400 && result.action === 'connect_telegram') {
              toast({
                title: result.message || 'Please connect your Telegram account first',
                description: result.message || 'Please connect your Telegram account first',
                variant: 'destructive',
              })
              toast({
                title: 'Please connect your Telegram account to verify tasks. Go to your profile to connect your account.',
                description: 'Please connect your Telegram account to verify tasks. Go to your profile to connect your account.',
                variant: 'destructive',
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

        case 'download':
          // For download tasks, we'll implement download tracking
          try {
            console.log('DEBUG: Starting download verification for task:', task.id);
            console.log('DEBUG: Download URL:', task.download_url);
            console.log('DEBUG: Session token:', session.access_token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/verify/download-completion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID,
                questId: quest.id,
                downloadUrl: task.download_url,
                metadata: {
                  task_title: task.title,
                  task_description: task.description,
                  download_title: task.download_title,
                  download_description: task.download_description
                }
              })
            })

            console.log('DEBUG: Download verification response status:', response.status);
            const result = await response.json()
            console.log('DEBUG: Download verification result:', result);
            
            if (result.success && result.verified) {
              verified = true
              message = result.message
              // Download tasks are already handled by the API
              // No need to create duplicate submission records
              toast({
                title: 'Task completed!',
                description: message,
              })
              setVerifyingTask(null)
              return
            } else {
              verified = false
              message = result.message || 'Download verification failed'
            }
          } catch (error) {
            console.error('Error verifying download task:', error)
            verified = false
            message = 'Download verification failed due to network error'
          }
          break

        case 'visit':
          // For visit tasks, we'll implement visit tracking
          try {
            console.log('DEBUG: Starting visit verification for task:', task.id);
            console.log('DEBUG: Visit URL:', task.visit_url);
            console.log('DEBUG: Session token:', session.access_token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/verify/visit-completion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID,
                questId: quest.id,
                visitUrl: task.visit_url,
                duration: task.visit_duration_seconds || 10,
                metadata: {
                  task_title: task.title,
                  task_description: task.description
                }
              })
            })

            console.log('DEBUG: Visit verification response status:', response.status);
            const result = await response.json()
            console.log('DEBUG: Visit verification result:', result);
            
            if (result.success && result.verified) {
              verified = true
              message = result.message
              // Visit tasks are already handled by the API
              // No need to create duplicate submission records
              toast({
                title: 'Task completed!',
                description: message,
              })
              setVerifyingTask(null)
              return
            } else {
              verified = false
              message = result.message || 'Visit verification failed'
            }
          } catch (error) {
            console.error('Error verifying visit task:', error)
            verified = false
            message = 'Visit verification failed due to network error'
          }
          break

        case 'form':
          // For form tasks, we'll implement form tracking
          try {
            console.log('DEBUG: Starting form verification for task:', task.id);
            console.log('DEBUG: Form URL:', task.form_url);
            console.log('DEBUG: Session token:', session.access_token ? 'Present' : 'Missing');
            
            const response = await fetch('/api/verify/form-completion', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
              },
              body: JSON.stringify({
                taskId: task.id,
                userId: currentUserUUID,
                questId: quest.id,
                formUrl: task.form_url,
                metadata: {
                  task_title: task.title,
                  task_description: task.description,
                  form_title: task.form_title,
                  form_description: task.form_description
                }
              })
            })

            console.log('DEBUG: Form verification response status:', response.status);
            const result = await response.json()
            console.log('DEBUG: Form verification result:', result);
            
            if (result.success && result.verified) {
              verified = true
              message = result.message
              // Form tasks are already handled by the API
              // No need to create duplicate submission records
              toast({
                title: 'Task completed!',
                description: message,
              })
              setVerifyingTask(null)
              return
            } else {
              verified = false
              message = result.message || 'Form verification failed'
            }
          } catch (error) {
            console.error('Error verifying form task:', error)
            verified = false
            message = 'Form verification failed due to network error'
          }
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
          toast({
            title: 'Failed to record task completion',
            description: 'Failed to record task completion',
            variant: 'destructive',
          })
          return
        }

        toast({
          title: 'Task completed!',
          description: message,
        })

        // Refresh tasks to show completion status
        // You might want to implement a way to refresh the task list here
      } else {
        toast({
          title: 'Verification failed',
          description: message,
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error verifying task:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while verifying the task',
        variant: 'destructive',
      })
    } finally {
      setVerifyingTask(null)
    }
  }, [currentUserUUID, quest.id, toast])

  // Handle task deletion
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!isAdminOrCreator()) {
      toast({
        title: 'Unauthorized',
        description: 'Only admins can delete tasks',
        variant: 'destructive',
      })
      return
    }

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) {
        console.error('Error deleting task:', error)
        toast({
          title: 'Failed to delete task',
          description: 'Failed to delete task',
          variant: 'destructive',
        })
        return
      }

      // Remove task from local state
      setTasks(prev => prev.filter(task => task.id !== taskId))
      
      toast({
        title: 'Task deleted',
        description: 'Task has been deleted successfully',
      })
    } catch (error) {
      console.error('Error deleting task:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while deleting the task',
        variant: 'destructive',
      })
    }
  }, [isAdminOrCreator, toast])

  // Handle adding new task
  const handleAddTask = useCallback(async (taskData: Partial<Task>) => {
    console.log('DEBUG: handleAddTask called with data:', taskData)
    
    if (!isAdminOrCreator()) {
      toast({
        title: 'Unauthorized',
        description: 'Only admins can add tasks',
        variant: 'destructive',
      })
      return
    }

    try {
      // Filter out fields that don't exist in the database based on error messages
      const taskInsertData = {
        quest_id: quest.id,
        type: taskData.type || 'social',
        title: taskData.title || '',
        description: taskData.description || '',
        xp_reward: taskData.xp_reward || 100,
        status: 'pending',
        // Only include fields that exist in the database
        social_platform: taskData.social_platform || null,
        social_action: taskData.social_action || null,
        social_url: taskData.social_url || null,
        social_username: taskData.social_username || null,
        social_post_id: taskData.social_post_id || null,
        download_url: taskData.download_url || null,
        form_url: taskData.form_url || null,
        visit_url: taskData.visit_url || null,
        visit_title: taskData.visit_title || null,
        visit_description: taskData.visit_description || null,
        visit_duration_seconds: taskData.visit_duration_seconds || null,
        learn_content: taskData.learn_content || null,
        learn_questions: taskData.learn_questions || null,
        learn_passing_score: taskData.learn_passing_score || 80,
        // New quiz fields
        quiz_question: taskData.quiz_question || null,
        quiz_answer_1: taskData.quiz_answer_1 || null,
        quiz_answer_2: taskData.quiz_answer_2 || null,
        quiz_answer_3: taskData.quiz_answer_3 || null,
        quiz_answer_4: taskData.quiz_answer_4 || null,
        quiz_correct_answer: taskData.quiz_correct_answer || null,
        quiz_is_multi_select: taskData.quiz_is_multi_select || false,
        order_index: tasks.length
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert(taskInsertData)
        .select()
        .single()

      if (error) {
        console.error('Error adding task:', error)
        toast({
          title: 'Failed to add task',
          description: 'Failed to add task',
          variant: 'destructive',
        })
        return
      }

      // Add task to local state
      setTasks(prev => [...prev, data])
      setShowEditTask(false)
      
      toast({
        title: 'Task added',
        description: 'Task has been added successfully',
      })
    } catch (error) {
      console.error('Error adding task:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while adding the task',
        variant: 'destructive',
      })
    }
  }, [isAdminOrCreator, quest.id, tasks.length, toast])

  // Handle editing task
  const handleEditTask = useCallback(async (taskId: string, taskData: Partial<Task>) => {
    if (!isAdminOrCreator()) {
      toast({
        title: 'Unauthorized',
        description: 'Only admins can edit tasks',
        variant: 'destructive',
      })
      return
    }

    try {
      // Filter out fields that don't exist in the database
      const taskUpdateData = {
        type: taskData.type,
        title: taskData.title,
        description: taskData.description,
        xp_reward: taskData.xp_reward,
        social_platform: taskData.social_platform,
        social_action: taskData.social_action,
        social_url: taskData.social_url,
        social_username: taskData.social_username,
        social_post_id: taskData.social_post_id,
        download_url: taskData.download_url,
        // Removed fields that don't exist: download_title, download_description, form_title, form_description, etc.
                          // form_url: taskData.form_url, // Removed - column doesn't exist in database
        visit_url: taskData.visit_url,
        visit_title: taskData.visit_title,
        visit_description: taskData.visit_description,
        visit_duration_seconds: taskData.visit_duration_seconds,
        learn_content: taskData.learn_content,
        learn_questions: taskData.learn_questions,
        learn_passing_score: taskData.learn_passing_score,
        // Quiz fields
        quiz_question: taskData.quiz_question,
        quiz_answer_1: taskData.quiz_answer_1,
        quiz_answer_2: taskData.quiz_answer_2,
        quiz_answer_3: taskData.quiz_answer_3,
        quiz_answer_4: taskData.quiz_answer_4,
        quiz_correct_answer: taskData.quiz_correct_answer,
        quiz_is_multi_select: taskData.quiz_is_multi_select
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(taskUpdateData)
        .eq('id', taskId)
        .select()
        .single()

      if (error) {
        console.error('Error updating task:', error)
        toast({
          title: 'Failed to update task',
          description: 'Failed to update task',
          variant: 'destructive',
        })
        return
      }

      // Update task in local state
      setTasks(prev => prev.map(task => task.id === taskId ? data : task))
      setShowEditTask(false)
      setEditingTask(null)
      
      toast({
        title: 'Task updated',
        description: 'Task has been updated successfully',
      })
    } catch (error) {
      console.error('Error updating task:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while updating the task',
        variant: 'destructive',
      })
    }
  }, [isAdminOrCreator, toast])

  if (loading) {
    return (
      <PageContainer>
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-32 w-full" />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="space-y-6">
        
        <QuestHeader 
          quest={quest} 
          isAdminOrCreator={isAdminOrCreator}
          onAddTask={() => setShowEditTask(true)}
          onExport={handleExportSubmissions}
          onEditQuest={() => setShowEditQuest(true)}
        />
        
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
          isAuthenticated={isAuthenticated}
          questId={quest.id}
        />

        {/* Admin Submissions Table */}
        {isAdminOrCreator() && (
          <div className="mt-8">
            <AdminSubmissionsTable 
              quest={quest} 
              tasks={tasks} 
              isAdmin={true} 
            />
          </div>
        )}

        {/* Add/Edit Task Dialog */}
        <Dialog open={showEditTask} onOpenChange={setShowEditTask}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </DialogTitle>
              <DialogDescription>
                {editingTask ? 'Update the task details below.' : 'Create a new task for this quest.'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="px-6 pb-6">
              <TaskForm
                task={editingTask}
                onSubmit={editingTask ? 
                  (data: Partial<Task>) => handleEditTask(editingTask.id, data) : 
                  handleAddTask
                }
                onCancel={() => {
                  setShowEditTask(false)
                  setEditingTask(null)
                }}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* Quiz Dialog */}
        {Object.entries(showQuiz).map(([taskId, isOpen]) => (
          <Dialog key={taskId} open={isOpen} onOpenChange={(open) => setShowQuiz(prev => ({ ...prev, [taskId]: open }))}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Quiz</DialogTitle>
                <DialogDescription>
                  Answer the questions to complete this task.
                </DialogDescription>
              </DialogHeader>
              
              <div className="px-6 pb-6">
                <QuizComponent
                  task={tasks.find(t => t.id === taskId)}
                  onComplete={async () => {
                    setShowQuiz(prev => ({ ...prev, [taskId]: false }))
                    // Handle quiz completion
                    const task = tasks.find(t => t.id === taskId)
                    if (task) {
                      // Track completion
                      await trackTaskCompletion(task, 'quiz_completed')
                      // Refresh task data
                      await refreshTasks()
                      // Show success toast
                      toast({
                        title: 'Quiz completed!',
                        description: 'You have successfully completed the quiz task.',
                        variant: 'default',
                      })
                      // Force a page refresh to update task completion status
                      window.location.reload()
                    }
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        ))}

        {/* Edit Quest Dialog */}
        <Dialog open={showEditQuest} onOpenChange={setShowEditQuest}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Quest</DialogTitle>
              <DialogDescription>
                Update the details of this quest.
              </DialogDescription>
            </DialogHeader>
            
            <EditQuestForm
              quest={quest}
              onSave={() => {
                setShowEditQuest(false)
                toast({
                  title: 'Quest updated',
                  description: 'Quest has been updated successfully',
                })
                // Refresh the page to get updated quest data
                window.location.reload()
              }}
            />
          </DialogContent>
        </Dialog>
      </div>
    </PageContainer>
  )
} 