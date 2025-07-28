'use client'

import { useState, useEffect } from 'react'
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
import React from 'react'

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
        return <Twitter className="w-4 h-4 text-blue-400" />
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
      <div className="p-4 bg-[#111111] border-t border-[#282828]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-3">Submission Data</h4>
            <div className="space-y-3 text-sm">
              {/* Quiz Answers - Enhanced Display */}
              {submissionData.answers && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Quiz Answers:</span>
                  <div className="text-white">
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
                  <div className="text-white mb-2">{submissionData.question}</div>
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
                            <div className="text-sm">{answer.question || 'No question text'}</div>
                            <div className="text-green-400 text-sm mt-1">
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
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 break-all"
                  >
                    {submissionData.visit_url}
                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
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
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 break-all"
                  >
                    {submissionData.download_url}
                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              {/* Form URL */}
              {submissionData.form_url && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Form URL:</span>
                  <a 
                    href={submissionData.form_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 break-all"
                  >
                    {submissionData.form_url}
                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                  </a>
                </div>
              )}
              
              {/* Discord Social */}
              {submissionData.social_platform === 'discord' && submissionData.social_url && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Discord Server:</span>
                  <a 
                    href={submissionData.social_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 break-all"
                  >
                    {submissionData.social_url}
                    <ExternalLinkIcon className="w-3 h-3 flex-shrink-0" />
                  </a>
                  {submissionData.discord_user_id && (
                    <div className="mt-2 text-xs">
                      <span className="text-gray-400">Discord User ID:</span>
                      <span className="text-white ml-2">{submissionData.discord_user_id}</span>
                    </div>
                  )}
                  {submissionData.guild_id && (
                    <div className="mt-1 text-xs">
                      <span className="text-gray-400">Server ID:</span>
                      <span className="text-white ml-2">{submissionData.guild_id}</span>
                    </div>
                  )}
                </div>
              )}
              
              {/* Social Username */}
              {submissionData.social_username && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400">Social Username:</span>
                  <span className="text-white ml-2">{submissionData.social_username}</span>
                </div>
              )}
              
              {/* Raw Submission Data for Debugging */}
              {Object.keys(submissionData).length > 0 && 
               !submissionData.answers && 
               !submissionData.score && 
               !submissionData.visit_url && 
               !submissionData.download_url && 
               !submissionData.form_url && 
               !submissionData.social_platform && 
               !submissionData.social_username && 
               !submissionData.question && 
               !submissionData.quiz_answers && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400 block mb-2">Raw Submission Data:</span>
                  <pre className="text-white text-xs overflow-auto">
                    {JSON.stringify(submissionData, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Show empty state if no submission data */}
              {Object.keys(submissionData).length === 0 && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400">No submission data available</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-3">Verification Data</h4>
            <div className="space-y-3 text-sm">
              <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                <span className="text-gray-400">Method:</span>
                <span className="text-white ml-2">{verificationData.method || 'Unknown'}</span>
              </div>
              
              {verificationData.verified !== undefined && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400">Verified:</span>
                  <span className={`ml-2 ${verificationData.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {verificationData.verified ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              
              {(submission.xp_removal_reason || submission.submission_data?.xp_removal_reason) && (
                <div className="bg-[#181818] p-3 rounded-lg border border-[#282828]">
                  <span className="text-gray-400">XP Removal Reason:</span>
                  <span className="text-red-400 ml-2">
                    {submission.xp_removal_reason || submission.submission_data?.xp_removal_reason}
                  </span>
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
    const socialAccounts = submission.social_accounts || []

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
                {/* Wallet */}
                {socialAccounts.find(acc => acc.platform === 'solana') && (
                  <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                    <Wallet className="w-5 h-5 text-purple-400" />
                    <div>
                      <div className="text-white font-medium">Wallet</div>
                      <div className="text-gray-400 text-sm">
                        {socialAccounts.find(acc => acc.platform === 'solana')?.wallet_address}
                      </div>
                    </div>
                  </div>
                )}

                {/* Discord */}
                {socialAccounts.find(acc => acc.platform === 'discord') && (
                  <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                    <MessageCircle className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">Discord</div>
                      <div className="text-gray-400 text-sm">
                        {socialAccounts.find(acc => acc.platform === 'discord')?.discord_username}
                      </div>
                    </div>
                  </div>
                )}

                {/* X/Twitter */}
                {socialAccounts.find(acc => acc.platform === 'x') && (
                  <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                    <Twitter className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">X (Twitter)</div>
                      <div className="text-gray-400 text-sm">
                        {socialAccounts.find(acc => acc.platform === 'x')?.x_username}
                      </div>
                    </div>
                  </div>
                )}

                {/* Telegram */}
                {socialAccounts.find(acc => acc.platform === 'telegram') && (
                  <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">Telegram</div>
                      <div className="text-gray-400 text-sm">
                        {socialAccounts.find(acc => acc.platform === 'telegram')?.telegram_username}
                      </div>
                    </div>
                  </div>
                )}

                {/* Check for social accounts in user metadata (for OAuth users) */}
                {user.user_metadata && (
                  <>
                    {/* Discord from metadata */}
                    {user.user_metadata.discord_id && (
                      <div className="flex items-center gap-3 p-3 bg-[#181818] rounded-lg border border-[#282828]">
                        <MessageCircle className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="text-white font-medium">Discord (OAuth)</div>
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
                          <div className="text-white font-medium">X (Twitter) (OAuth)</div>
                          <div className="text-gray-400 text-sm">
                            {user.user_metadata.x_username}
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {socialAccounts.length === 0 && !user.user_metadata?.discord_id && !user.user_metadata?.x_username && (
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
            {onExport && (
              <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                <FileDown className="w-4 h-4 mr-2" />
                Export Submissions
              </Button>
            )}
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
            {onExport && (
              <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                <FileDown className="w-4 h-4 mr-2" />
                Export Submissions
              </Button>
            )}
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
            {onExport && (
              <Button onClick={onExport} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800 w-full sm:w-auto">
                <FileDown className="w-4 h-4 mr-2" />
                Export Submissions
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full inline-block align-middle">
              <div className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#282828] hover:bg-[#181818]">
                      <TableHead className="text-gray-400 text-xs sm:text-sm">User</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Task</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Type</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Status</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Task XP</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Date</TableHead>
                      <TableHead className="text-gray-400 text-xs sm:text-sm">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {submissions.map((submission) => (
                      <TableRow key={submission.id} className="border-[#282828] hover:bg-[#181818]">
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6 sm:w-8 sm:h-8">
                              <AvatarImage src={submission.users?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs">
                                {submission.users?.username?.charAt(0) || submission.users?.email?.charAt(0) || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0 flex-1">
                              <div className="text-white font-medium truncate">
                                {submission.users?.username || submission.users?.email || 'Unknown User'}
                              </div>
                              <div className="text-gray-400 text-xs truncate">
                                {submission.users?.email ? (
                                  <span className="flex items-center gap-1">
                                    <Mail className="w-3 h-3" />
                                    {submission.users.email}
                                  </span>
                                ) : (
                                  <span className="text-gray-500">No email</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="max-w-[120px] sm:max-w-[200px]">
                            <div className="text-white font-medium truncate">
                              {submission.tasks?.title || 'Unknown Task'}
                            </div>
                            <div className="text-gray-400 text-xs truncate">
                              {submission.tasks && getTaskIcon(submission.tasks as Task)}
                              {submission.tasks?.type || 'Unknown'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-1">
                            {submission.tasks && getTaskIcon(submission.tasks as Task)}
                            <span className="capitalize">{submission.tasks?.type || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {getStatusBadge(submission)}
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="text-center">
                            <div className="text-white font-medium">
                              {submission.xp_earned || 0} XP
                            </div>
                            {submission.xp_removed && (
                              <div className="text-red-400 text-xs">
                                -{submission.xp_removed} XP
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="text-gray-300">
                            {formatDate(submission.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleRowExpansion(submission.id)}
                              className="h-6 w-6 p-0"
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
                                setSelectedUser(submission.users?.id || null)
                                setShowUserModal(true)
                              }}
                              className="h-6 w-6 p-0"
                            >
                              <User className="w-3 h-3" />
                            </Button>
                            {submission.status === 'verified' && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => setShowRemoveXPDialog(submission.id)}
                                className="h-6 w-6 p-0"
                              >
                                <Trash className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
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