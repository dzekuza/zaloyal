'use client'

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Users,
  Trophy,
  Eye,
  Trash,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  Download,
  BookOpen,
  Twitter,
  MessageCircle,
  User,
  Calendar,
  Clock,
  Wallet,
  Mail,
  ChevronDown,
  ChevronUp,
  FileText,
  ExternalLink as ExternalLinkIcon,
  FileDown,
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import { Textarea } from "@/components/ui/textarea"
import type { Task } from '@/components/quest-detail/types'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type UserTaskSubmission = Database["public"]["Tables"]["user_task_submissions"]["Row"] & {
  users: (Database["public"]["Tables"]["users"]["Row"] & {
    email_confirmed_at?: string | null
    last_sign_in_at?: string | null
    user_metadata?: any
    app_metadata?: any
  }) | null
  tasks: Database["public"]["Tables"]["tasks"]["Row"] | null
  social_accounts?: Database["public"]["Tables"]["social_accounts"]["Row"][]
  xp_earned?: number
  xp_removed?: number
  social_username?: string
  social_post_url?: string
  quiz_answers?: any[]
  manual_verification_note?: string
  xp_removal_reason?: string
}

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  project_id?: string | null
  projects?: {
    owner_id: string
  } | null
}

interface AdminSubmissionsTableProps {
  quest: Quest
  tasks: Task[]
  isAdmin: boolean
  onExport?: () => void
}

export default function AdminSubmissionsTable({ quest, tasks, isAdmin, onExport }: AdminSubmissionsTableProps) {
  const [submissions, setSubmissions] = useState<UserTaskSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [removingXP, setRemovingXP] = useState<string | null>(null)
  const [showRemoveXPDialog, setShowRemoveXPDialog] = useState<string | null>(null)
  const [removeXPReason, setRemoveXPReason] = useState("")
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)

  useEffect(() => {
    fetchSubmissions()
  }, [quest.id])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      
      // Fetch submissions first
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('user_task_submissions')
        .select('*')
        .eq('quest_id', quest.id)
        .order('created_at', { ascending: false })

      // Fetch users and tasks separately
      const userIds = [...new Set(submissionsData?.map(s => s.user_id) || [])]
      const taskIds = [...new Set(submissionsData?.map(s => s.task_id) || [])]

      // Fetch auth.users data using API endpoint
      const authUsersResponse = await fetch('/api/admin/get-auth-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userIds })
      })

      let authUsersMap = new Map()
      if (authUsersResponse.ok) {
        const { users: authUsersData } = await authUsersResponse.json()
        authUsersData?.forEach((user: any) => {
          authUsersMap.set(user.id, user)
        })
      } else {
        console.error('Error fetching auth users:', authUsersResponse.statusText)
      }

      // Fetch public.users profiles for additional data
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .in('user_id', userIds)

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)

      if (usersError) {
        console.error('Error fetching users:', usersError)
      }
      if (tasksError) {
        console.error('Error fetching tasks:', tasksError)
      }

      // Create maps for easy lookup
      const usersMap = new Map(usersData?.map(u => [u.id, u]) || [])
      const tasksMap = new Map(tasksData?.map(t => [t.id, t]) || [])

      // Fetch social accounts for each user
      const { data: socialAccounts, error: socialError } = await supabase
        .from('social_accounts')
        .select('*')
        .in('user_id', userIds)

      if (socialError) {
        console.error('Error fetching social accounts:', socialError)
      }

      // Create a map of social accounts by user ID
      const socialAccountsMap = new Map()
      socialAccounts?.forEach(account => {
        if (!socialAccountsMap.has(account.user_id)) {
          socialAccountsMap.set(account.user_id, [])
        }
        socialAccountsMap.get(account.user_id).push(account)
      })

      // Combine the data - include all submissions with proper user data
      const combinedData = submissionsData?.map(submission => {
        const authUser = authUsersMap.get(submission.user_id)
        const userProfile = usersMap.get(submission.user_id)
        
        // Create comprehensive user object with auth data and profile data
        const combinedUser = authUser ? {
          user_id: authUser.id,
          username: userProfile?.username || authUser.user_metadata?.username || `User ${authUser.id.slice(0, 8)}`,
          email: authUser.email || 'No email available',
          avatar_url: userProfile?.avatar_url || authUser.user_metadata?.avatar_url || null,
          total_xp: userProfile?.total_xp || 0,
          level: userProfile?.level || 1,
          bio: userProfile?.bio || null,
          social_links: userProfile?.social_links || {},
          created_at: authUser.created_at,
          updated_at: authUser.updated_at,
          // Add auth user metadata for additional info
          email_confirmed_at: authUser.email_confirmed_at,
          last_sign_in_at: authUser.last_sign_in_at,
          user_metadata: authUser.user_metadata,
          app_metadata: authUser.app_metadata
        } : {
          user_id: submission.user_id,
          username: `User ${submission.user_id.slice(0, 8)}`,
          email: 'No email available',
          avatar_url: null,
          total_xp: 0,
          level: 1,
          bio: null,
          social_links: {},
          created_at: submission.created_at,
          updated_at: submission.updated_at
        }

        return {
          ...submission,
          users: combinedUser,
          tasks: tasksMap.get(submission.task_id) || null,
          social_accounts: socialAccountsMap.get(submission.user_id) || []
        }
      }) || []

      setSubmissions(combinedData)
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveXP = async (submissionId: string) => {
    if (!removeXPReason.trim()) {
      return
    }

    try {
      setRemovingXP(submissionId)
      
      // Try to update with XP removal fields, fallback to just updating the reason
      const updateData: any = {
        updated_at: new Date().toISOString()
      }

      // Try to add XP removal fields if they exist
      try {
        updateData.xp_removed = submissions.find(s => s.id === submissionId)?.tasks?.xp_reward || 0
        updateData.xp_removal_reason = removeXPReason
      } catch (error) {
        console.log('XP removal fields not available, using fallback')
        // If the fields don't exist, we'll just update the submission_data with the removal info
        const submission = submissions.find(s => s.id === submissionId)
        const submissionData = submission?.submission_data || {}
        submissionData.xp_removed = submission?.tasks?.xp_reward || 0
        submissionData.xp_removal_reason = removeXPReason
        updateData.submission_data = submissionData
      }

      const { error } = await supabase
        .from('user_task_submissions')
        .update(updateData)
        .eq('id', submissionId)

      if (error) {
        console.error('Error removing XP:', error)
        return
      }

      // Refresh submissions
      await fetchSubmissions()
      setShowRemoveXPDialog(null)
      setRemoveXPReason("")
    } catch (error) {
      console.error('Error removing XP:', error)
    } finally {
      setRemovingXP(null)
    }
  }

  const getTaskIcon = (task: Task) => {
    switch (task.type) {
      case 'social':
        if (task.social_platform === 'twitter') return <Twitter className="w-4 h-4 text-blue-400" />
        if (task.social_platform === 'discord') return <MessageCircle className="w-4 h-4 text-indigo-400" />
        if (task.social_platform === 'telegram') return <MessageSquare className="w-4 h-4 text-blue-500" />
        return <ExternalLink className="w-4 h-4 text-gray-400" />
      case 'visit':
        return <ExternalLink className="w-4 h-4 text-green-400" />
      case 'download':
        return <Download className="w-4 h-4 text-purple-400" />
      case 'learn':
        return <BookOpen className="w-4 h-4 text-yellow-400" />
      case 'form':
        return <FileText className="w-4 h-4 text-orange-400" />
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const getTaskTypeDisplay = (task: Task) => {
    switch (task.type) {
      case 'social':
        if (task.social_platform === 'twitter') return 'X';
        if (task.social_platform === 'discord') return 'Discord';
        if (task.social_platform === 'telegram') return 'Telegram';
        return 'Social';
      case 'visit':
        return 'Visit URL';
      case 'download':
        return 'Download';
      case 'learn':
        return 'Quiz';
      case 'form':
        return 'Form';
      default:
        return task.title || 'Task';
    }
  }

  const getStatusBadge = (submission: UserTaskSubmission) => {
    // Check for XP removal in both the direct field and submission_data
    const isXpRemoved = submission.xp_removed || 
                       (submission.submission_data?.xp_removed && submission.submission_data.xp_removed > 0)
    
    if (isXpRemoved) {
      return <Badge variant="destructive" className="text-xs">XP Removed</Badge>
    }
    
    switch (submission.status) {
      case 'verified':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Verified</Badge>
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">{submission.status}</Badge>
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleRowExpansion = (submissionId: string) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(submissionId)) {
      newExpanded.delete(submissionId)
    } else {
      newExpanded.add(submissionId)
    }
    setExpandedRows(newExpanded)
  }

  const renderSubmissionDetails = (submission: UserTaskSubmission) => {
    const task = submission.tasks
    const submissionData = submission.submission_data || {}
    const verificationData = submission.verification_data || {}

    return (
      <div className="p-3 sm:p-4 bg-[#111111] border-t border-[#282828]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <div className="space-y-3">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Submission Data</h4>
            <div className="space-y-3 text-xs sm:text-sm">
              {/* Quiz Answers - Enhanced Display */}
              {submissionData.answers && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Quiz Answers:</span>
                  <div className="text-white break-words">
                    {Array.isArray(submissionData.answers) 
                      ? submissionData.answers.map((answer: string, index: number) => (
                          <div key={index} className="mb-1">
                            <span className="text-gray-400">Q{index + 1}:</span> {answer}
                          </div>
                        ))
                      : typeof submissionData.answers === 'object' 
                        ? Object.entries(submissionData.answers).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="text-gray-400">{key}:</span> {String(value)}
                            </div>
                          ))
                        : <span>{String(submissionData.answers)}</span>
                    }
                  </div>
                </div>
              )}
              
              {/* Quiz Score */}
              {submissionData.score && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400">Score:</span>
                  <span className="text-white ml-2 font-semibold">{submissionData.score}%</span>
                </div>
              )}
              
              {/* Quiz Question and Selected Answers */}
              {submissionData.question && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Question:</span>
                  <div className="text-white mb-2 break-words">{submissionData.question}</div>
                  {submissionData.selected_answers && (
                    <div>
                      <span className="text-gray-400 block mb-1">Selected Answer(s):</span>
                      <div className="text-white">
                        {Array.isArray(submissionData.selected_answers) 
                          ? submissionData.selected_answers.map((answer: string, index: number) => (
                              <div key={index} className="mb-1">
                                <span className="text-green-400">✓</span> {answer}
                              </div>
                            ))
                          : <span>{String(submissionData.selected_answers)}</span>
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* Quiz Answer Details */}
              {submissionData.quiz_answers && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Quiz Answer Details:</span>
                  <div className="text-white">
                    {Array.isArray(submissionData.quiz_answers) 
                      ? submissionData.quiz_answers.map((answer: any, index: number) => (
                          <div key={index} className="mb-2 p-2 bg-[#0a0a0a] rounded border border-[#333]">
                            <div className="text-gray-400 text-xs mb-1">Question {index + 1}</div>
                            <div className="text-sm break-words">{answer.question || 'No question text'}</div>
                            <div className="text-green-400 text-sm mt-1 break-words">
                              Selected: {answer.selected || answer.answer || 'No answer'}
                            </div>
                            {answer.correct !== undefined && (
                              <div className={`text-xs mt-1 ${answer.correct ? 'text-green-400' : 'text-red-400'}`}>
                                {answer.correct ? '✓ Correct' : '✗ Incorrect'}
                              </div>
                            )}
                          </div>
                        ))
                      : typeof submissionData.quiz_answers === 'object' 
                        ? Object.entries(submissionData.quiz_answers).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="text-gray-400">{key}:</span> {String(value)}
                            </div>
                          ))
                        : <span>{String(submissionData.quiz_answers)}</span>
                    }
                  </div>
                </div>
              )}
              
              {/* Visit URL */}
              {submissionData.visit_url && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Visit URL:</span>
                  <a
                    href={submissionData.visit_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 break-all"
                  >
                    {submissionData.visit_url}
                  </a>
                </div>
              )}
              
              {/* Download URL */}
              {submissionData.download_url && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Download URL:</span>
                  <a
                    href={submissionData.download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-green-400 hover:text-green-300 break-all"
                  >
                    {submissionData.download_url}
                  </a>
                </div>
              )}
              
              {/* Form Data */}
              {submissionData.form_data && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Form Data:</span>
                  <div className="text-white">
                    {typeof submissionData.form_data === 'object' 
                      ? Object.entries(submissionData.form_data).map(([key, value]) => (
                          <div key={key} className="mb-1">
                            <span className="text-gray-400">{key}:</span> {String(value)}
                          </div>
                        ))
                      : <span>{String(submissionData.form_data)}</span>
                    }
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-white mb-3 text-sm sm:text-base">Verification Data</h4>
            <div className="space-y-3 text-xs sm:text-sm">
              {/* Social Verification */}
              {verificationData.social_verified && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Social Verification:</span>
                  <div className="text-white">
                    <div className="mb-1">
                      <span className="text-gray-400">Status:</span> 
                      <span className="text-green-400 ml-2">Verified</span>
                    </div>
                    {verificationData.social_username && (
                      <div className="mb-1">
                        <span className="text-gray-400">Username:</span> 
                        <span className="text-white ml-2">{verificationData.social_username}</span>
                      </div>
                    )}
                    {verificationData.social_post_url && (
                      <div className="mb-1">
                        <span className="text-gray-400">Post URL:</span>
                        <a
                          href={verificationData.social_post_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 ml-2 break-all"
                        >
                          {verificationData.social_post_url}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Manual Verification */}
              {submission.manual_verification_note && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Manual Verification Note:</span>
                  <div className="text-white break-words">{submission.manual_verification_note}</div>
                </div>
              )}
              
              {/* XP Removal */}
              {submission.xp_removed && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-red-400 block mb-2">XP Removed: {submission.xp_removed}</span>
                  {submission.xp_removal_reason && (
                    <div className="text-gray-300 break-words">{submission.xp_removal_reason}</div>
                  )}
                </div>
              )}
              
              {/* Any other fields that aren't covered above */}
              {Object.keys(submissionData).length > 0 && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Submission Details:</span>
                  <div className="space-y-2 text-sm">
                    {/* URL-based submissions */}
                    {submissionData.url && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">URL:</span>
                        <a
                          href={submissionData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 flex items-center gap-1 break-all"
                        >
                          {submissionData.url}
                          <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    )}
                    
                    {/* Action-based submissions */}
                    {submissionData.action && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Action:</span>
                        <span className="text-white capitalize">{submissionData.action}</span>
                      </div>
                    )}
                    
                    {/* Task type */}
                    {submissionData.task_type && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Task Type:</span>
                        <span className="text-white capitalize">{submissionData.task_type}</span>
                      </div>
                    )}
                    
                    {/* Duration */}
                    {submissionData.duration_seconds && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Duration:</span>
                        <span className="text-white">{submissionData.duration_seconds} seconds</span>
                      </div>
                    )}
                    
                    {/* Social platform */}
                    {submissionData.social_platform && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Platform:</span>
                        <span className="text-white capitalize">{submissionData.social_platform}</span>
                      </div>
                    )}
                    
                    {/* Social action */}
                    {submissionData.social_action && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Social Action:</span>
                        <span className="text-white capitalize">{submissionData.social_action}</span>
                      </div>
                    )}
                    
                    {/* Discord specific */}
                    {submissionData.discord_user_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Discord User ID:</span>
                        <span className="text-white">{submissionData.discord_user_id}</span>
                      </div>
                    )}
                    
                    {submissionData.guild_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Guild ID:</span>
                        <span className="text-white">{submissionData.guild_id}</span>
                      </div>
                    )}
                    
                    {/* Telegram specific */}
                    {submissionData.telegram_user_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Telegram User ID:</span>
                        <span className="text-white">{submissionData.telegram_user_id}</span>
                      </div>
                    )}
                    
                    {submissionData.telegram_username && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Telegram Username:</span>
                        <span className="text-white">@{submissionData.telegram_username}</span>
                      </div>
                    )}
                    
                    {submissionData.channel_id && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Channel ID:</span>
                        <span className="text-white">{submissionData.channel_id}</span>
                      </div>
                    )}
                    
                    {/* Quiz specific */}
                    {submissionData.score && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Score:</span>
                        <span className="text-white">{submissionData.score}%</span>
                      </div>
                    )}
                    
                    {submissionData.correct_answers && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Correct Answers:</span>
                        <span className="text-white">{submissionData.correct_answers}</span>
                      </div>
                    )}
                    
                    {submissionData.total_questions && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Total Questions:</span>
                        <span className="text-white">{submissionData.total_questions}</span>
                      </div>
                    )}
                    
                    {/* Form specific */}
                    {submissionData.form_data && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Form Data:</span>
                        <span className="text-white">{JSON.stringify(submissionData.form_data)}</span>
                      </div>
                    )}
                    
                    {/* Download specific */}
                    {submissionData.download_path && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Download Path:</span>
                        <span className="text-white">{submissionData.download_path}</span>
                      </div>
                    )}
                    
                    {/* Verification timestamp */}
                    {submissionData.verified_at && (
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Verified At:</span>
                        <span className="text-white">{new Date(submissionData.verified_at).toLocaleString()}</span>
                      </div>
                    )}
                    
                    {/* Any other fields that aren't covered above */}
                    {Object.entries(submissionData).filter(([key, value]) =>
                      value &&
                      !['url', 'action', 'task_type', 'duration_seconds', 'social_platform',
                        'social_action', 'discord_user_id', 'guild_id', 'telegram_user_id',
                        'telegram_username', 'channel_id', 'score', 'correct_answers',
                        'total_questions', 'form_data', 'download_path', 'verified_at'].includes(key)
                    ).map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}:</span>
                        <span className="text-white break-words">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  const renderUserModal = () => {
    const submission = submissions.find(s => s.user_id === selectedUser)
    if (!submission?.users) return null

    const user = submission.users
    // Get social accounts from the user's actual connected accounts, not from submission
    const socialAccounts = user.user_metadata?.providers || []

    return (
      <Dialog open={showUserModal} onOpenChange={setShowUserModal}>
        <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user information and connected accounts
            </DialogDescription>
          </DialogHeader>
          
          <div className="px-6 pb-6 space-y-6">
            {/* User Basic Info */}
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={user.avatar_url || undefined} />
                <AvatarFallback className="bg-green-500 text-white text-lg">
                  {user.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-xl font-semibold text-white">{user.username || 'Unknown User'}</h3>
                <p className="text-gray-400">{user.email || 'No email available'}</p>
                {user.email_confirmed_at && (
                  <p className="text-green-400 text-sm">✓ Email verified</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold">{user.total_xp || 0} XP</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Level {user.level || 1}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Connected Accounts */}
            <div>
              <h4 className="font-semibold text-white mb-3">Connected Accounts</h4>
              <div className="space-y-3">
                {/* Check for social accounts in user metadata (for OAuth users) */}
                {user.user_metadata && (
                  <>
                    {/* Discord from metadata */}
                    {user.user_metadata.discord_id && (
                      <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-white font-medium">Discord</div>
                          <div className="text-gray-400 text-sm">
                            {user.user_metadata.discord_username || user.user_metadata.discord_id}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* X/Twitter from metadata */}
                    {user.user_metadata.x_username && (
                      <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                        <Twitter className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-white font-medium">X (Twitter)</div>
                          <div className="text-gray-400 text-sm">
                            {user.user_metadata.x_username}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Telegram from metadata */}
                    {user.user_metadata.telegram_id && (
                      <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                        <MessageSquare className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-white font-medium">Telegram</div>
                          <div className="text-gray-400 text-sm">
                            {user.user_metadata.telegram_username || user.user_metadata.telegram_id}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {!user.user_metadata?.discord_id && !user.user_metadata?.x_username && !user.user_metadata?.telegram_id && (
                  <div className="text-gray-400 text-center py-4">
                    No connected accounts found
                  </div>
                )}
              </div>
            </div>

            {/* User Bio */}
            {user.bio && (
              <div>
                <h4 className="font-semibold text-white mb-2">Bio</h4>
                <p className="text-gray-300">{user.bio}</p>
              </div>
            )}

            {/* Account Information */}
            <div>
              <h4 className="font-semibold text-white mb-2">Account Information</h4>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Created:</span>
                  <span className="text-white ml-2">{formatDate(user.created_at)}</span>
                </div>
                <div>
                  <span className="text-gray-400">Last Updated:</span>
                  <span className="text-white ml-2">{formatDate(user.updated_at)}</span>
                </div>
                {user.last_sign_in_at && (
                  <div>
                    <span className="text-gray-400">Last Sign In:</span>
                    <span className="text-white ml-2">{formatDate(user.last_sign_in_at)}</span>
                  </div>
                )}
                {user.email_confirmed_at && (
                  <div>
                    <span className="text-gray-400">Email Confirmed:</span>
                    <span className="text-white ml-2">{formatDate(user.email_confirmed_at)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (loading) {
    return (
      <Card className="bg-[#111111] border-[#282828]">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Submissions
            </CardTitle>
            <div className="flex gap-2">
              {onExport && (
                <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-8 text-gray-400">
            Loading submissions...
          </div>
        </CardContent>
      </Card>
    )
  }

  if (submissions.length === 0) {
    return (
      <Card className="bg-[#111111] border-[#282828]">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Submissions
            </CardTitle>
            <div className="flex gap-2">
              {onExport && (
                <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="text-center py-8 text-gray-400">
            No submissions found for this quest
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="bg-[#111111] border-[#282828]">
        <CardHeader className="p-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              User Submissions ({submissions.length})
            </CardTitle>
            <div className="flex gap-2">
              {onExport && (
                <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                  <FileDown className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <div className="min-w-full">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#282828] hover:bg-[#181818]">
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[120px] sm:min-w-[140px]">User</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[120px] sm:min-w-[160px] max-w-[200px] lg:max-w-[250px]">Task</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[70px] sm:min-w-[90px]">Type</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[70px] sm:min-w-[90px]">Status</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[60px] sm:min-w-[80px]">XP</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[80px] sm:min-w-[100px]">Date</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm font-medium min-w-[80px] sm:min-w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <React.Fragment key={submission.id}>
                        <TableRow className="border-[#282828] hover:bg-[#181818]">
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-2 min-w-[100px] sm:min-w-[120px]">
                              <Avatar className="w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0">
                                <AvatarImage src={submission.users?.avatar_url || undefined} />
                                <AvatarFallback className="text-xs">
                                  {submission.users?.username?.charAt(0) || submission.users?.email?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="text-white font-medium break-words leading-tight text-xs sm:text-sm">
                                  {submission.users?.username || submission.users?.email || 'Unknown User'}
                                </div>
                                <div className="text-gray-400 text-xs break-words leading-tight mt-1">
                                  {submission.users?.email ? (
                                    <span className="flex items-center gap-1">
                                      <Mail className="w-3 h-3 flex-shrink-0" />
                                      <span className="truncate">{submission.users.email}</span>
                                    </span>
                                  ) : (
                                    <span className="text-gray-500">No email</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="min-w-[100px] sm:min-w-[140px] max-w-[180px] lg:max-w-[220px]">
                              <div className="text-white font-medium break-words leading-tight text-xs sm:text-sm">
                                {submission.tasks?.title || 'Unknown Task'}
                              </div>
                              <div className="text-gray-400 text-xs break-words leading-tight mt-1">
                                <div className="flex items-center gap-1">
                                  {submission.tasks && getTaskIcon(submission.tasks as Task)}
                                  <span className="capitalize">{submission.tasks ? getTaskTypeDisplay(submission.tasks as Task) : 'Unknown'}</span>
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-1 min-w-[60px] sm:min-w-[80px]">
                              {submission.tasks && getTaskIcon(submission.tasks as Task)}
                              <span className="capitalize font-medium text-white text-xs sm:text-sm">{submission.tasks ? getTaskTypeDisplay(submission.tasks as Task) : 'Unknown'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="min-w-[60px] sm:min-w-[80px]">
                              {getStatusBadge(submission)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="text-center min-w-[50px] sm:min-w-[70px]">
                              <div className="text-white font-medium text-xs sm:text-sm">
                                {submission.tasks?.xp_reward || 0} XP
                              </div>
                              {submission.xp_removed && (
                                <div className="text-red-400 text-xs">
                                  -{submission.xp_removed} XP
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="text-gray-300 min-w-[70px] sm:min-w-[90px] text-xs sm:text-sm">
                              {formatDate(submission.created_at)}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            <div className="flex items-center gap-1 min-w-[70px] sm:min-w-[90px]">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => toggleRowExpansion(submission.id)}
                                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                              >
                                {expandedRows.has(submission.id) ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(submission.user_id)
                                  setShowUserModal(true)
                                }}
                                className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                              >
                                <User className="w-3 h-3" />
                              </Button>
                              {submission.status === 'verified' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => setShowRemoveXPDialog(submission.id)}
                                  className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                >
                                  <Trash className="w-3 h-3" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        
                        {/* Expanded Row Details */}
                        {expandedRows.has(submission.id) && (
                          <TableRow>
                            <TableCell colSpan={7} className="p-0">
                              {renderSubmissionDetails(submission)}
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remove XP Dialog */}
      <Dialog open={!!showRemoveXPDialog} onOpenChange={() => setShowRemoveXPDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove XP</DialogTitle>
            <DialogDescription>
              Provide a reason for removing XP from this submission
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason for XP removal..."
              value={removeXPReason}
              onChange={(e) => setRemoveXPReason(e.target.value)}
              className="min-h-[100px]"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRemoveXPDialog(null)
                setRemoveXPReason("")
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => showRemoveXPDialog && handleRemoveXP(showRemoveXPDialog)}
              disabled={!removeXPReason.trim() || removingXP === showRemoveXPDialog}
            >
              {removingXP === showRemoveXPDialog ? 'Removing...' : 'Remove XP'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* User Details Modal */}
      {renderUserModal()}
    </>
  )
} 