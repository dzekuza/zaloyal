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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import { Textarea } from "@/components/ui/textarea"
import type { Task } from '@/components/quest-detail/types'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

type UserTaskSubmission = Database["public"]["Tables"]["user_task_submissions"]["Row"] & {
  users: Database["public"]["Tables"]["users"]["Row"] | null
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
}

export default function AdminSubmissionsTable({ quest, tasks, isAdmin }: AdminSubmissionsTableProps) {
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
      const usersMap = new Map(usersData?.map(u => [u.user_id, u]) || [])
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

      // Combine the data
      const combinedData = submissionsData?.map(submission => ({
        ...submission,
        users: usersMap.get(submission.user_id) || null,
        tasks: tasksMap.get(submission.task_id) || null,
        social_accounts: socialAccountsMap.get(submission.user_id) || []
      })) || []

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
        updateData.xp_removed = submissions.find(s => s.id === submissionId)?.xp_earned || 0
        updateData.xp_removal_reason = removeXPReason
      } catch (error) {
        console.log('XP removal fields not available, using fallback')
        // If the fields don't exist, we'll just update the submission_data with the removal info
        const submission = submissions.find(s => s.id === submissionId)
        const submissionData = submission?.submission_data || {}
        submissionData.xp_removed = submission?.xp_earned || 0
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
    if (!task) return null

    const submissionData = submission.submission_data || {}
    const verificationData = submission.verification_data || {}

    return (
      <div className="space-y-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-semibold text-white mb-2">Submission Data</h4>
            <div className="space-y-2 text-sm">
              {submissionData.answers && (
                <div>
                  <span className="text-gray-400">Quiz Answers:</span>
                  <div className="text-white mt-1">
                    {Array.isArray(submissionData.answers) 
                      ? submissionData.answers.join(', ')
                      : JSON.stringify(submissionData.answers)
                    }
                  </div>
                </div>
              )}
              {submissionData.score && (
                <div>
                  <span className="text-gray-400">Score:</span>
                  <span className="text-white ml-2">{submissionData.score}%</span>
                </div>
              )}
              {submissionData.visit_url && (
                <div>
                  <span className="text-gray-400">Visit URL:</span>
                  <a 
                    href={submissionData.visit_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 ml-2 flex items-center gap-1"
                  >
                    {submissionData.visit_url}
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              )}
              {submissionData.download_url && (
                <div>
                  <span className="text-gray-400">Download URL:</span>
                  <a 
                    href={submissionData.download_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 ml-2 flex items-center gap-1"
                  >
                    {submissionData.download_url}
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              )}
              {submissionData.form_url && (
                <div>
                  <span className="text-gray-400">Form URL:</span>
                  <a 
                    href={submissionData.form_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 ml-2 flex items-center gap-1"
                  >
                    {submissionData.form_url}
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                </div>
              )}
              {submissionData.social_platform === 'discord' && submissionData.social_url && (
                <div>
                  <span className="text-gray-400">Discord Server:</span>
                  <a 
                    href={submissionData.social_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 ml-2 flex items-center gap-1"
                  >
                    {submissionData.social_url}
                    <ExternalLinkIcon className="w-3 h-3" />
                  </a>
                  {submissionData.discord_user_id && (
                    <div className="mt-1">
                      <span className="text-gray-400 text-xs">Discord User ID:</span>
                      <span className="text-white text-xs ml-2">{submissionData.discord_user_id}</span>
                    </div>
                  )}
                  {submissionData.guild_id && (
                    <div>
                      <span className="text-gray-400 text-xs">Server ID:</span>
                      <span className="text-white text-xs ml-2">{submissionData.guild_id}</span>
                    </div>
                  )}
                </div>
              )}
              {submissionData.social_username && (
                <div>
                  <span className="text-gray-400">Social Username:</span>
                  <span className="text-white ml-2">{submissionData.social_username}</span>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-2">Verification Data</h4>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-400">Method:</span>
                <span className="text-white ml-2">{verificationData.method || 'Unknown'}</span>
              </div>
              {verificationData.verified !== undefined && (
                <div>
                  <span className="text-gray-400">Verified:</span>
                  <span className={`ml-2 ${verificationData.verified ? 'text-green-400' : 'text-red-400'}`}>
                    {verificationData.verified ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
                             {(submission.xp_removal_reason || submission.submission_data?.xp_removal_reason) && (
                 <div>
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details</DialogTitle>
            <DialogDescription>
              Complete user information and connected accounts
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
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
                <p className="text-gray-400">{user.email}</p>
                <div className="flex items-center gap-2 mt-2">
                  <Trophy className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 font-semibold">{user.total_xp || 0} XP</span>
                  <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                    Level {user.level || 1}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Connected Accounts */}
            <div>
              <h4 className="font-semibold text-white mb-3">Connected Accounts</h4>
              <div className="space-y-3">
                {/* Wallet */}
                {socialAccounts.find(acc => acc.platform === 'solana') && (
                  <div className="flex items-center gap-3 p-3 bg-[#111111] rounded-lg border border-[#282828]">
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
                  <div className="flex items-center gap-3 p-3 bg-[#111111] rounded-lg border border-[#282828]">
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
                  <div className="flex items-center gap-3 p-3 bg-[#111111] rounded-lg border border-[#282828]">
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
                  <div className="flex items-center gap-3 p-3 bg-[#111111] rounded-lg border border-[#282828]">
                    <MessageSquare className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="text-white font-medium">Telegram</div>
                      <div className="text-gray-400 text-sm">
                        {socialAccounts.find(acc => acc.platform === 'telegram')?.telegram_username}
                      </div>
                    </div>
                  </div>
                )}

                {socialAccounts.length === 0 && (
                  <div className="text-gray-400 text-center py-4">
                    No connected accounts found
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* User Bio */}
            {user.bio && (
              <div>
                <h4 className="font-semibold text-white mb-2">Bio</h4>
                <p className="text-gray-300">{user.bio}</p>
              </div>
            )}

            {/* Account Created */}
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
        <CardHeader>
          <CardTitle className="text-white">User Submissions</CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="text-white">User Submissions</CardTitle>
        </CardHeader>
        <CardContent>
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
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Submissions ({submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#282828] hover:bg-[#181818]">
                  <TableHead className="text-gray-400">User</TableHead>
                  <TableHead className="text-gray-400">Task</TableHead>
                  <TableHead className="text-gray-400">Type</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">XP</TableHead>
                  <TableHead className="text-gray-400">Date</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((submission) => {
                  const user = submission.users
                  const task = submission.tasks
                  
                  if (!user || !task) return null

                  const isExpanded = expandedRows.has(submission.id)

                  return (
                    <>
                      <TableRow key={submission.id} className="border-[#282828] hover:bg-[#181818]">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar 
                              className="w-8 h-8 cursor-pointer hover:opacity-80"
                              onClick={() => {
                                setSelectedUser(submission.user_id)
                                setShowUserModal(true)
                              }}
                            >
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback className="bg-green-500 text-white text-sm">
                                {user.username?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || 'U'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="text-white font-medium">
                                {user.username || 'Unknown User'}
                              </div>
                              <div className="text-gray-400 text-sm">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getTaskIcon(task as Task)}
                            <span className="text-white">{task.title}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {task.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(submission)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Trophy className="w-4 h-4 text-green-400" />
                            <span className="text-green-400 font-semibold">
                              {submission.xp_earned || 0}
                            </span>
                            {(submission.xp_removed || submission.submission_data?.xp_removed) && (
                              <span className="text-red-400 text-sm">
                                (-{submission.xp_removed || submission.submission_data?.xp_removed || 0})
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="text-white">{formatDate(submission.created_at)}</div>
                            {submission.verified_at && (
                              <div className="text-gray-400 text-xs">
                                Verified: {formatDate(submission.verified_at)}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleRowExpansion(submission.id)}
                              className="text-gray-400 hover:text-white"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </Button>
                                                         {submission.status === 'verified' && 
                              !submission.xp_removed && 
                              !submission.submission_data?.xp_removed && (
                               <Button
                                 variant="ghost"
                                 size="sm"
                                 onClick={() => setShowRemoveXPDialog(submission.id)}
                                 className="text-red-400 hover:text-red-300"
                               >
                                 <Trash className="w-4 h-4" />
                               </Button>
                             )}
                          </div>
                        </TableCell>
                      </TableRow>
                      
                      {/* Expanded Details Row */}
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={7} className="p-0">
                            {renderSubmissionDetails(submission)}
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  )
                })}
              </TableBody>
            </Table>
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