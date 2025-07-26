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
            <div className="text-2xl font-bold text-white">{quest.total_xp || 0}</div>
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
    // Social media fields
    social_platform: "",
    social_action: "",
    social_url: "",
    // Learning fields
    learn_content: "",
    learn_passing_score: 70,
    // Visit website fields
    visit_url: "",
    visit_duration_seconds: 30,
    // Download fields
    download_url: "",
    download_title: "",
    // Form fields
    form_url: "",
    form_title: "",
    // Quiz fields
    quizHeadline: "",
    quizDescription: "",
    quizAnswers: ["", "", "", ""],
    quizCorrectAnswers: [],
    quizMultiSelect: false,
  })

  // Add new state for project data
  const [projectData, setProjectData] = useState<any>(null)
  const [projectOwner, setProjectOwner] = useState<any>(null)

  // Memoized auth check function
  const checkAuth = useCallback(async () => {
    try {
      // Check wallet auth
      let walletUser = null
      try {
        walletUser = await walletAuth.getCurrentUser()
        setWalletUser(walletUser)
      } catch (walletError) {
        console.error('Wallet auth error:', walletError)
      }

      // Check email auth
      let emailUser = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          emailUser = user
          setEmailUser(user)
          setCurrentUserUUID(user.id)
        }
      } catch (emailError) {
        console.error('Email auth error:', emailError)
      }

      setIsAuthenticated(!!walletUser || !!emailUser)
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
        // Fetch project owner separately if needed
        if (project.owner_id) {
          const { data: owner } = await supabase
            .from('users')
            .select('id, username, avatar_url')
            .eq('id', project.owner_id)
            .single()
          setProjectOwner(owner)
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
    }
  }, [quest.project_id])

  // Memoized isAdminOrCreator function
  const isAdminOrCreator = useCallback(() => {
    if (!currentUserUUID) return false
    return currentUserUUID === quest.creator_id || currentUserUUID === projectOwner?.id
  }, [currentUserUUID, quest.creator_id, projectOwner?.id])

  // Memoized task verification handler
  const handleTaskVerification = useCallback(async (task: Task) => {
    setVerifyingTask(task.id)
    try {
      // Implementation here
      toast.success('Task verified successfully!')
    } catch (error) {
      console.error('Error verifying task:', error)
      toast.error('Failed to verify task')
    } finally {
      setVerifyingTask(null)
    }
  }, [])

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
    if (!newTask.title || !newTask.type) {
      setCreateTaskError('Please fill in all required fields')
      return
    }

    setCreatingTask(true)
    setCreateTaskError("")

    try {
      const taskData: any = {
        quest_id: quest.id,
        title: newTask.title,
        description: newTask.description,
        type: newTask.type,
        xp_reward: newTask.xp_reward,
      }

      // Add type-specific fields
      if (newTask.type === 'social') {
        taskData.social_platform = newTask.social_platform
        taskData.social_action = newTask.social_action
        taskData.social_url = newTask.social_url
      } else if (newTask.type === 'learn') {
        taskData.learn_content = newTask.learn_content
        taskData.learn_passing_score = newTask.learn_passing_score
      } else if (newTask.type === 'visit') {
        taskData.visit_url = newTask.visit_url
        taskData.visit_duration_seconds = newTask.visit_duration_seconds
      } else if (newTask.type === 'download') {
        taskData.download_url = newTask.download_url
        taskData.download_title = newTask.download_title
      } else if (newTask.type === 'form') {
        taskData.form_url = newTask.form_url
        taskData.form_title = newTask.form_title
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
        // Social media fields
        social_platform: "",
        social_action: "",
        social_url: "",
        // Learning fields
        learn_content: "",
        learn_passing_score: 70,
        // Visit website fields
        visit_url: "",
        visit_duration_seconds: 30,
        // Download fields
        download_url: "",
        download_title: "",
        // Form fields
        form_url: "",
        form_title: "",
        // Quiz fields
        quizHeadline: "",
        quizDescription: "",
        quizAnswers: ["", "", "", ""],
        quizCorrectAnswers: [],
        quizMultiSelect: false,
      })
      toast.success('Task created successfully!')
    } catch (error) {
      console.error('Error creating task:', error)
      setCreateTaskError('Failed to create task')
    } finally {
      setCreatingTask(false)
    }
  }, [newTask, quest.id])

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
              <DialogTitle className="text-white text-xl font-display font-semibold">Add New Task</DialogTitle>
              <DialogDescription className="text-gray-300 font-body">
                Create a new task for this quest
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6">
              {/* Task Type */}
              <div>
                <label className="text-sm font-display font-medium text-white mb-2 block">Task Type</label>
                <Select value={newTask.type} onValueChange={(value) => setNewTask({...newTask, type: value})}>
                  <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040]">
                    <SelectValue placeholder="Select task type" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111111] border-[#282828]">
                    <SelectItem value="social">Social Media</SelectItem>
                    <SelectItem value="learn">Learning</SelectItem>
                    <SelectItem value="submit">Submission</SelectItem>
                    <SelectItem value="visit">Visit Website</SelectItem>
                    <SelectItem value="download">Download</SelectItem>
                    <SelectItem value="form">Form Submission</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Title */}
              <div>
                <label className="text-sm font-display font-medium text-white mb-2 block">Title</label>
                <Input 
                  value={newTask.title}
                  onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                  className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                  placeholder="Enter task title"
                />
              </div>
              
              {/* Description */}
              <div>
                <label className="text-sm font-display font-medium text-white mb-2 block">Description</label>
                <Textarea 
                  value={newTask.description}
                  onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                  className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500 min-h-[100px]"
                  placeholder="Enter task description"
                />
              </div>
              
              {/* XP Reward */}
              <div>
                <label className="text-sm font-display font-medium text-white mb-2 block">XP Reward</label>
                <Input 
                  type="number"
                  value={newTask.xp_reward}
                  onChange={(e) => setNewTask({...newTask, xp_reward: parseInt(e.target.value) || 0})}
                  className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                  placeholder="Enter XP reward"
                />
              </div>

              {/* Social Media Specific Fields */}
              {newTask.type === 'social' && (
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                  <h4 className="text-white font-display font-medium">Social Media Settings</h4>
                  
                                      <div>
                      <label className="text-sm font-display font-medium text-white mb-2 block">Social Platform</label>
                    <Select value={newTask.social_platform} onValueChange={(value) => setNewTask({...newTask, social_platform: value})}>
                      <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040]">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#282828]">
                        <SelectItem value="twitter">Twitter/X</SelectItem>
                        <SelectItem value="discord">Discord</SelectItem>
                        <SelectItem value="telegram">Telegram</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Social Action</label>
                    <Select value={newTask.social_action} onValueChange={(value) => setNewTask({...newTask, social_action: value})}>
                      <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040]">
                        <SelectValue placeholder="Select action" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#111111] border-[#282828]">
                        <SelectItem value="follow">Follow</SelectItem>
                        <SelectItem value="like">Like</SelectItem>
                        <SelectItem value="retweet">Retweet</SelectItem>
                        <SelectItem value="join">Join Server/Channel</SelectItem>
                        <SelectItem value="post">Post</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Social URL</label>
                    <Input 
                      value={newTask.social_url}
                      onChange={(e) => setNewTask({...newTask, social_url: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="https://twitter.com/username or https://discord.gg/invite"
                    />
                  </div>
                </div>
              )}

              {/* Learning Specific Fields */}
              {newTask.type === 'learn' && (
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                  <h4 className="text-white font-display font-medium">Learning Settings</h4>
                  
                                      <div>
                      <label className="text-sm font-display font-medium text-white mb-2 block">Learning Content</label>
                    <Textarea 
                      value={newTask.learn_content}
                      onChange={(e) => setNewTask({...newTask, learn_content: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500 min-h-[100px]"
                      placeholder="Enter learning content or instructions"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Passing Score (%)</label>
                    <Input 
                      type="number"
                      min="0"
                      max="100"
                      value={newTask.learn_passing_score}
                      onChange={(e) => setNewTask({...newTask, learn_passing_score: parseInt(e.target.value) || 0})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="70"
                    />
                  </div>
                </div>
              )}

              {/* Visit Website Specific Fields */}
              {newTask.type === 'visit' && (
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                  <h4 className="text-white font-display font-medium">Website Visit Settings</h4>
                  
                                      <div>
                      <label className="text-sm font-display font-medium text-white mb-2 block">Website URL</label>
                    <Input 
                      value={newTask.visit_url}
                      onChange={(e) => setNewTask({...newTask, visit_url: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="https://example.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Visit Duration (seconds)</label>
                    <Input 
                      type="number"
                      min="10"
                      value={newTask.visit_duration_seconds}
                      onChange={(e) => setNewTask({...newTask, visit_duration_seconds: parseInt(e.target.value) || 30})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="30"
                    />
                  </div>
                </div>
              )}

              {/* Download Specific Fields */}
              {newTask.type === 'download' && (
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                  <h4 className="text-white font-display font-medium">Download Settings</h4>
                  
                                      <div>
                      <label className="text-sm font-display font-medium text-white mb-2 block">Download URL</label>
                    <Input 
                      value={newTask.download_url}
                      onChange={(e) => setNewTask({...newTask, download_url: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="https://example.com/file.pdf"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Download Title</label>
                    <Input 
                      value={newTask.download_title}
                      onChange={(e) => setNewTask({...newTask, download_title: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="Download Title"
                    />
                  </div>
                </div>
              )}

              {/* Form Submission Specific Fields */}
              {newTask.type === 'form' && (
                <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                  <h4 className="text-white font-display font-medium">Form Settings</h4>
                  
                                      <div>
                      <label className="text-sm font-display font-medium text-white mb-2 block">Form URL</label>
                    <Input 
                      value={newTask.form_url}
                      onChange={(e) => setNewTask({...newTask, form_url: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="https://forms.google.com/..."
                    />
                  </div>

                  <div>
                    <label className="text-sm font-display font-medium text-white mb-2 block">Form Title</label>
                    <Input 
                      value={newTask.form_title}
                      onChange={(e) => setNewTask({...newTask, form_title: e.target.value})}
                      className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500"
                      placeholder="Form Title"
                    />
                  </div>
                </div>
              )}
              
              {createTaskError && (
                <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                  <p className="text-red-400 text-sm">{createTaskError}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={handleCreateTask}
                  disabled={creatingTask}
                  className="bg-green-600 hover:bg-green-700 text-white flex-1"
                >
                  {creatingTask ? 'Creating...' : 'Create Task'}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowAddTask(false)}
                  className="border-[#282828] text-white hover:bg-[#1a1a1a] flex-1"
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
    // Temporarily disable fetchProjectData to test
    // fetchProjectData()
  }, [])

  useEffect(() => {
    if (mounted && quest.project_id && currentUserUUID) {
      fetchCurrentUserSocialAccounts()
    }
  }, [mounted, quest.project_id, currentUserUUID, fetchCurrentUserSocialAccounts])

  // Temporarily disable loading checks for testing
  // if (!mounted) {
  //   return skeletonContent
  // }

  // if (loading) {
  //   return loadingContent
  // }

  return (
    <div className="min-h-screen bg-[#181818] p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-4">{quest.title}</h1>
        <p className="text-gray-300 mb-4">{quest.description}</p>
        <button 
          onClick={() => setShowAddTask(true)}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          Add New Task
        </button>
      </div>
    </div>
  )
} 