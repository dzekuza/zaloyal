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
} from "lucide-react"
import Link from "next/link"
import type { Database } from "@/lib/supabase"
import TelegramLoginWidget from "@/components/telegram-login-widget"
import QuestStatsBar from "@/components/QuestStatsBar"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import QuestResponsesViewer from "@/components/quest-responses-viewer"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import TaskList from '@/components/quest-detail/TaskList';
import type { Task } from '@/components/quest-detail/types';
import { extractTweetIdFromUrl } from "@/lib/twitter-utils"
import PageContainer from "@/components/PageContainer";
import TaskForm from "@/components/quest-detail/TaskForm";
import QuizComponent from "@/components/quest-detail/QuizComponent";

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
const QuestHeader = React.memo(({ quest, isAdminOrCreator, onAddTask }: { quest: Quest, isAdminOrCreator: () => boolean, onAddTask: () => void }) => {
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
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
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
  const { toast } = useToast()

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
            // For Discord verification
            const { data: { user }, error: userError } = await supabase.auth.getUser()
            
            if (userError || !user) {
              toast({
                title: 'Authentication error',
                description: 'Please sign in again to verify tasks',
                variant: 'destructive',
              })
              return
            }

            // Check if user has Discord authentication
            const hasDiscordAuth = (user as any)?.app_metadata?.providers?.includes('discord')
            if (!hasDiscordAuth) {
              toast({
                title: 'Discord account not connected',
                description: 'Please connect your Discord account in your profile to verify tasks',
                variant: 'destructive',
              })
              return
            }

            // Extract guild ID from Discord invite URL
            const guildId = task.social_url?.match(/discord\.gg\/([a-zA-Z0-9]+)/)?.[1] || 
                           task.social_url?.match(/discord\.com\/invite\/([a-zA-Z0-9]+)/)?.[1]
            
            if (!guildId) {
              toast({
                title: 'Invalid Discord invite',
                description: 'Discord invite URL not found in task',
                variant: 'destructive',
              })
              return
            }

            // Call Discord verification API
            const response = await fetch('/api/verify/discord-join', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                userId: currentUserUUID,
                guildId
              })
            })

            const result = await response.json()
            
            if (!response.ok) {
              toast({
                title: 'Discord verification not available',
                description: result.error || 'Discord verification requires additional setup',
                variant: 'destructive',
              })
              return
            }
            
            verified = result.success
            message = verified ? 'Discord task verified successfully!' : 'Discord task verification failed. Please join the server and try again.'
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
    if (!isAdminOrCreator()) {
      toast({
        title: 'Unauthorized',
        description: 'Only admins can add tasks',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          quest_id: quest.id,
          type: taskData.type || 'social',
          title: taskData.title || '',
          description: taskData.description || '',
          xp_reward: taskData.xp_reward || 100,
          status: 'pending',
          social_platform: taskData.social_platform || null,
          social_action: taskData.social_action || null,
          social_url: taskData.social_url || null,
          social_username: taskData.social_username || null,
          social_post_id: taskData.social_post_id || null,
          download_url: taskData.download_url || null,
          download_title: taskData.download_title || null,
          download_description: taskData.download_description || null,
          form_url: taskData.form_url || null,
          form_title: taskData.form_title || null,
          form_description: taskData.form_description || null,
          visit_url: taskData.visit_url || null,
          visit_title: taskData.visit_title || null,
          visit_description: taskData.visit_description || null,
          visit_duration_seconds: taskData.visit_duration_seconds || null,
          learn_content: taskData.learn_content || null,
          learn_questions: taskData.learn_questions || null,
          learn_passing_score: taskData.learn_passing_score || 80,
          order_index: tasks.length
        })
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
      const { data, error } = await supabase
        .from('tasks')
        .update({
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
          download_title: taskData.download_title,
          download_description: taskData.download_description,
          form_url: taskData.form_url,
          form_title: taskData.form_title,
          form_description: taskData.form_description,
          visit_url: taskData.visit_url,
          visit_title: taskData.visit_title,
          visit_description: taskData.visit_description,
          visit_duration_seconds: taskData.visit_duration_seconds,
          learn_content: taskData.learn_content,
          learn_questions: taskData.learn_questions,
          learn_passing_score: taskData.learn_passing_score
        })
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
        />

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
                  onComplete={() => {
                    setShowQuiz(prev => ({ ...prev, [taskId]: false }))
                    // Handle quiz completion
                  }}
                />
              </div>
            </DialogContent>
          </Dialog>
        ))}
      </div>
    </PageContainer>
  )
} 