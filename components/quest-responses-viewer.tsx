'use client'

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import type { Database } from "@/lib/supabase"
import { Textarea } from "@/components/ui/textarea"

type UserTaskSubmission = Database["public"]["Tables"]["user_task_submissions"]["Row"] & {
  users: Database["public"]["Tables"]["users"]["Row"] | null
  tasks: Database["public"]["Tables"]["tasks"]["Row"] | null
}

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  quest_categories: Database["public"]["Tables"]["quest_categories"]["Row"] | null
  users: Database["public"]["Tables"]["users"]["Row"] | null
  project_id?: string | null
  projects?: {
    owner_id: string
  } | null
}

type Task = Database["public"]["Tables"]["tasks"]["Row"]

interface QuestResponsesViewerProps {
  quest: Quest
  tasks: Task[]
  isAdmin: boolean
}

export default function QuestResponsesViewer({ quest, tasks, isAdmin }: QuestResponsesViewerProps) {
  const [submissions, setSubmissions] = useState<UserTaskSubmission[]>([])
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [removingXP, setRemovingXP] = useState<string | null>(null)
  const [showRemoveXPDialog, setShowRemoveXPDialog] = useState<string | null>(null)
  const [removeXPReason, setRemoveXPReason] = useState("")

  // Group submissions by user
  const userSubmissions = submissions.reduce((acc, submission) => {
    const userId = submission.user_id
    if (!acc[userId]) {
      acc[userId] = {
        user: submission.users,
        submissions: [],
        totalXP: 0,
        completedTasks: 0,
        totalTasks: tasks.length
      }
    }
    acc[userId].submissions.push(submission)
    acc[userId].totalXP += submission.xp_earned || 0
    acc[userId].completedTasks++
    return acc
  }, {} as Record<string, {
    user: Database["public"]["Tables"]["users"]["Row"] | null
    submissions: UserTaskSubmission[]
    totalXP: number
    completedTasks: number
    totalTasks: number
  }>)

  const selectedUserData = selectedUser ? userSubmissions[selectedUser] : null

  useEffect(() => {
    fetchSubmissions()
  }, [quest.id])

  const fetchSubmissions = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('user_task_submissions')
        .select(`
          *,
          users (*),
          tasks (*)
        `)
        .eq('quest_id', quest.id)
        .eq('verified', true)

      if (error) {
        console.error('Error fetching submissions:', error)
        return
      }

      setSubmissions(data || [])
      
      // Auto-select first user if available
      if (data && data.length > 0 && !selectedUser) {
        const firstUserId = data[0].user_id
        setSelectedUser(firstUserId)
      }
    } catch (error) {
      console.error('Error fetching submissions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveXP = async (submissionId: string) => {
    if (!removeXPReason.trim()) {
      alert('Please provide a reason for removing XP')
      return
    }

    try {
      setRemovingXP(submissionId)
      
      const { error } = await supabase
        .from('user_task_submissions')
        .update({
          xp_earned: 0,
          xp_removed: true,
          xp_removal_reason: removeXPReason,
          xp_removed_at: new Date().toISOString()
        })
        .eq('id', submissionId)

      if (error) {
        console.error('Error removing XP:', error)
        alert('Failed to remove XP')
        return
      }

      // Refresh submissions
      await fetchSubmissions()
      setShowRemoveXPDialog(null)
      setRemoveXPReason("")
    } catch (error) {
      console.error('Error removing XP:', error)
      alert('Failed to remove XP')
    } finally {
      setRemovingXP(null)
    }
  }

  const getTaskIcon = (task: Task) => {
    switch (task.task_type) {
      case 'social':
        switch (task.social_platform) {
          case 'twitter':
            return <Twitter className="w-4 h-4 text-blue-400" />
          case 'telegram':
            return <MessageCircle className="w-4 h-4 text-blue-400" />
          case 'discord':
            return <MessageSquare className="w-4 h-4 text-indigo-400" />
          default:
            return <ExternalLink className="w-4 h-4 text-gray-400" />
        }
      case 'download':
        return <Download className="w-4 h-4 text-green-400" />
      case 'visit':
        return <ExternalLink className="w-4 h-4 text-blue-400" />
      case 'learn':
        return <BookOpen className="w-4 h-4 text-purple-400" />
      default:
        return <CheckCircle className="w-4 h-4 text-gray-400" />
    }
  }

  const renderSubmissionResponse = (submission: UserTaskSubmission) => {
    const task = submission.tasks
    if (!task) return null

    return (
      <div key={submission.id} className="border border-[#282828] rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          {getTaskIcon(task)}
          <h4 className="font-semibold text-white">{task.title}</h4>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            +{submission.xp_earned || 0} XP
          </Badge>
          {submission.xp_removed && (
            <Badge variant="destructive" className="text-xs">
              XP Removed
            </Badge>
          )}
        </div>

        <div className="space-y-2 text-sm">
          {submission.social_username && (
            <div>
              <span className="text-gray-400">Username:</span>
              <span className="text-white ml-2">@{submission.social_username}</span>
            </div>
          )}
          
          {submission.social_post_url && (
            <div>
              <span className="text-gray-400">Post URL:</span>
              <a 
                href={submission.social_post_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 ml-2"
              >
                View Post
              </a>
            </div>
          )}

          {submission.quiz_answers && (
            <div>
              <span className="text-gray-400">Quiz Answers:</span>
              <div className="text-white ml-2 mt-1">
                {submission.quiz_answers.map((answer: any, index: number) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="text-gray-500">Q{index + 1}:</span>
                    <span>{answer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submission.manual_verification_note && (
            <div>
              <span className="text-gray-400">Verification Note:</span>
              <span className="text-white ml-2">{submission.manual_verification_note}</span>
            </div>
          )}

          {submission.xp_removal_reason && (
            <div>
              <span className="text-red-400">XP Removal Reason:</span>
              <span className="text-red-300 ml-2">{submission.xp_removal_reason}</span>
            </div>
          )}

          <div className="text-gray-400 text-xs">
            Completed: {new Date(submission.created_at).toLocaleDateString()}
          </div>
        </div>

        {isAdmin && !submission.xp_removed && (
          <div className="mt-3 pt-3 border-t border-[#282828]">
            <Dialog>
              <DialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => setShowRemoveXPDialog(submission.id)}
                >
                  <Trash className="w-4 h-4 mr-2" />
                  Remove XP
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Remove XP</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to remove {submission.xp_earned} XP from this user? 
                    This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-300">Reason for removal</label>
                    <Textarea
                      value={removeXPReason}
                      onChange={(e) => setRemoveXPReason(e.target.value)}
                      placeholder="Enter the reason for removing XP..."
                      className="mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      onClick={() => handleRemoveXP(submission.id)}
                      disabled={removingXP === submission.id}
                    >
                      {removingXP === submission.id ? "Removing..." : "Remove XP"}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowRemoveXPDialog(null)
                        setRemoveXPReason("")
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-white">Loading responses...</div>
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-white font-semibold mb-2">No Responses Yet</h3>
          <p className="text-gray-400">No users have completed this quest yet.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
      {/* Left Column - Users List */}
      <div className="lg:col-span-1 bg-[#111111] rounded-lg border border-[#282828] overflow-hidden">
        <div className="p-4 border-b border-[#282828]">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <Users className="w-5 h-5" />
            Participants ({Object.keys(userSubmissions).length})
          </h3>
        </div>
        <div className="overflow-y-auto h-[calc(600px-80px)]">
          {Object.entries(userSubmissions).map(([userId, userData]) => (
            <div
              key={userId}
              className={`p-4 border-b border-[#282828] cursor-pointer transition-colors ${
                selectedUser === userId 
                  ? 'bg-[#181818] border-l-4 border-l-green-500' 
                  : 'hover:bg-[#181818]'
              }`}
              onClick={() => setSelectedUser(userId)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {userData.user?.username?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div>
                    <div className="text-white font-medium">
                      {userData.user?.username || userData.user?.wallet_address?.slice(0, 8) + '...' || 'Unknown User'}
                    </div>
                    <div className="text-gray-400 text-sm">
                      {userData.completedTasks}/{userData.totalTasks} tasks
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-semibold flex items-center gap-1">
                    <Trophy className="w-4 h-4" />
                    {userData.totalXP} XP
                  </div>
                  <div className="text-gray-400 text-xs">
                    {Math.round((userData.completedTasks / userData.totalTasks) * 100)}% complete
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - User Responses */}
      <div className="lg:col-span-2 bg-[#111111] rounded-lg border border-[#282828] overflow-hidden">
        {selectedUserData ? (
          <>
            <div className="p-4 border-b border-[#282828]">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white font-semibold">
                    {selectedUserData.user?.username || selectedUserData.user?.wallet_address?.slice(0, 8) + '...' || 'Unknown User'}
                  </h3>
                  <p className="text-gray-400 text-sm">
                    {selectedUserData.completedTasks}/{selectedUserData.totalTasks} tasks completed
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-semibold text-lg flex items-center gap-2">
                    <Trophy className="w-5 h-5" />
                    {selectedUserData.totalXP} XP
                  </div>
                  <div className="text-gray-400 text-sm">
                    {Math.round((selectedUserData.completedTasks / selectedUserData.totalTasks) * 100)}% complete
                  </div>
                </div>
              </div>
            </div>
            <div className="overflow-y-auto h-[calc(600px-80px)] p-4">
              {selectedUserData.submissions.map(renderSubmissionResponse)}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-white font-semibold mb-2">Select a User</h3>
              <p className="text-gray-400">Choose a user from the list to view their responses.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 