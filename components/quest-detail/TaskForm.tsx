"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { X, Plus, Trash2 } from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { Task } from "./types"
import { supabase } from "@/lib/supabase"

interface TaskFormProps {
  task?: Task | null
  onSubmit: (data: Partial<Task>) => void
  onCancel: () => void
}

// 🔥 BEST PRACTICE: Hook to fetch user's social account data from Auth ONLY
const useUserSocialAccounts = () => {
  const [socialAccounts, setSocialAccounts] = useState<{
    twitter?: { username: string; profile_url?: string }
    discord?: { username: string; profile_url?: string }
    telegram?: { username: string; profile_url?: string }
    wallet?: { address: string; display_name: string }
  }>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSocialAccounts = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setLoading(false)
          return
        }

        const accountsData: any = {}
        
        // 🔥 BEST PRACTICE: Get user identities from Supabase Auth ONLY
        let identities: any[] = []
        try {
          const { data: identitiesData } = await supabase.auth.getUserIdentities()
          identities = identitiesData?.identities || []
        } catch (identityError) {
          console.log('getUserIdentities not available:', identityError)
          // Fallback: try to get user metadata
          if (user.user_metadata) {
            // Check if user has social accounts in metadata
            if (user.user_metadata.provider === 'twitter') {
              const username = user.user_metadata.username || user.user_metadata.name
              if (username) {
                accountsData.twitter = {
                  username: username,
                  profile_url: `https://x.com/${username}`
                }
              }
            } else if (user.user_metadata.provider === 'discord') {
              const username = user.user_metadata.username || user.user_metadata.name
              if (username) {
                accountsData.discord = {
                  username: username,
                  profile_url: `https://discord.com/users/${username}`
                }
              }
            }
          }
        }
        
        // 🔥 BEST PRACTICE: Process each identity from Auth
        identities.forEach((identity: any) => {
          if (identity.provider === 'twitter') {
            const username = identity.identity_data?.user_name || identity.identity_data?.screen_name
            if (username) {
              accountsData.twitter = {
                username: username,
                profile_url: `https://x.com/${username}`
              }
            }
          } else if (identity.provider === 'discord') {
            const username = identity.identity_data?.username || identity.identity_data?.name
            if (username) {
              accountsData.discord = {
                username: username,
                profile_url: `https://discord.com/users/${username}`
              }
            }
          }
        })

        // 🔥 BEST PRACTICE: Only use social_accounts for wallet data (not for X/Discord)
        try {
          const { data: accounts, error } = await supabase
            .from('social_accounts')
            .select('platform, wallet_address')
            .eq('user_id', user.id)

          if (!error && accounts) {
            accounts.forEach(account => {
              if (account.platform === 'solana' && account.wallet_address) {
                accountsData.wallet = {
                  address: account.wallet_address,
                  display_name: `${account.wallet_address.substring(0, 8)}...${account.wallet_address.substring(-6)}`
                }
              }
            })
          }
        } catch (socialError) {
          console.log('No social_accounts table or error:', socialError)
          // Continue without social_accounts data
        }

        setSocialAccounts(accountsData)
      } catch (error) {
        console.error('Error fetching user social accounts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSocialAccounts()
  }, [])

  return { socialAccounts, loading }
}

export default function TaskForm({ task, onSubmit, onCancel }: TaskFormProps) {
  const { socialAccounts, loading } = useUserSocialAccounts()
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<Partial<Task>>({
    type: 'social',
    title: '',
    description: '',
    xp_reward: 100,
    social_platform: null,
    social_action: null,
    social_url: null,
    social_username: null,
    social_post_id: null,
    download_url: null,
    download_title: null,
    download_description: null,
            // form_url: null, // Removed - column doesn't exist in database
    form_title: null,
    form_description: null,
    visit_url: null,
    visit_title: null,
    visit_description: null,
    visit_duration_seconds: null,
    learn_content: null,
    learn_questions: null,
    learn_passing_score: 80,
    // New quiz fields
    quiz_question: null,
    quiz_answer_1: null,
    quiz_answer_2: null,
    quiz_answer_3: null,
    quiz_answer_4: null,
    quiz_correct_answer: null,
    quiz_is_multi_select: false
  })

  useEffect(() => {
    if (task) {
      setFormData({
        type: task.type,
        title: task.title,
        description: task.description,
        xp_reward: task.xp_reward,
        social_platform: task.social_platform,
        social_action: task.social_action,
        social_url: task.social_url,
        social_username: task.social_username,
        social_post_id: task.social_post_id,
        download_url: task.download_url,
        download_title: task.download_title,
        download_description: task.download_description,
        // form_url: task.form_url, // Removed - column doesn't exist in database
        form_title: task.form_title,
        form_description: task.form_description,
        visit_url: task.visit_url,
        visit_title: task.visit_title,
        visit_description: task.visit_description,
        visit_duration_seconds: task.visit_duration_seconds,
        learn_content: task.learn_content,
        learn_questions: task.learn_questions,
        learn_passing_score: task.learn_passing_score
      })
    } else if (!loading && socialAccounts) {
      // Pre-populate with user's social account data for new tasks
      const prePopulateSocialData = () => {
        const platform = formData.social_platform
        if (platform === 'twitter' && socialAccounts.twitter) {
          setFormData(prev => ({
            ...prev,
            social_username: socialAccounts.twitter?.username || '',
            social_url: socialAccounts.twitter?.profile_url || ''
          }))
        } else if (platform === 'discord' && socialAccounts.discord) {
          setFormData(prev => ({
            ...prev,
            social_username: socialAccounts.discord?.username || '',
            social_url: socialAccounts.discord?.profile_url || ''
          }))
        } else if (platform === 'telegram' && socialAccounts.telegram) {
          setFormData(prev => ({
            ...prev,
            social_username: socialAccounts.telegram?.username || '',
            social_url: socialAccounts.telegram?.profile_url || ''
          }))
        }
      }

      // Pre-populate when platform changes
      if (formData.social_platform) {
        prePopulateSocialData()
      }
    }
  }, [task, loading, socialAccounts, formData.social_platform])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit(formData)
  }

  const handleFileUpload = async (file: File) => {
    setUploadedFile(file)
    
    // Upload file to Supabase Storage
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}.${fileExt}`
      const filePath = `downloads/${fileName}`
      
      const { data, error } = await supabase.storage
        .from('task-files')
        .upload(filePath, file)
      
      if (error) {
        console.error('Error uploading file:', error)
        return
      }
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('task-files')
        .getPublicUrl(filePath)
      
      setUploadedFileUrl(publicUrl)
      setFormData(prev => ({ ...prev, download_url: publicUrl }))
    } catch (error) {
      console.error('Error uploading file:', error)
    }
  }

  const handleFileRemove = () => {
    setUploadedFile(null)
    setUploadedFileUrl(null)
    setFormData(prev => ({ ...prev, download_url: null }))
  }

  const renderSocialFields = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="social_platform" className="text-sm font-medium text-gray-200">Platform</Label>
          <Select 
            value={formData.social_platform || ''} 
            onValueChange={(value) => {
              setFormData(prev => ({ ...prev, social_platform: value }))
              
              // Pre-populate with user's data when platform changes
              if (!task && !loading) {
                if (value === 'twitter' && socialAccounts.twitter) {
                  setFormData(prev => ({
                    ...prev,
                    social_platform: value,
                    social_username: socialAccounts.twitter?.username || '',
                    social_url: socialAccounts.twitter?.profile_url || ''
                  }))
                } else if (value === 'discord' && socialAccounts.discord) {
                  setFormData(prev => ({
                    ...prev,
                    social_platform: value,
                    social_username: socialAccounts.discord?.username || '',
                    social_url: socialAccounts.discord?.profile_url || ''
                  }))
                } else if (value === 'telegram' && socialAccounts.telegram) {
                  setFormData(prev => ({
                    ...prev,
                    social_platform: value,
                    social_username: socialAccounts.telegram?.username || '',
                    social_url: socialAccounts.telegram?.profile_url || ''
                  }))
                } else {
                  setFormData(prev => ({
                    ...prev,
                    social_platform: value,
                    social_username: '',
                    social_url: ''
                  }))
                }
              }
            }}
          >
            <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500">
              <SelectValue placeholder="Select platform" className="text-gray-400" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#282828]">
              <SelectItem value="twitter" className="text-white hover:bg-[#1a1a1a]">Twitter/X</SelectItem>
              <SelectItem value="discord" className="text-white hover:bg-[#1a1a1a]">Discord</SelectItem>
              <SelectItem value="telegram" className="text-white hover:bg-[#1a1a1a]">Telegram</SelectItem>
              <SelectItem value="instagram" className="text-white hover:bg-[#1a1a1a]">Instagram</SelectItem>
              <SelectItem value="youtube" className="text-white hover:bg-[#1a1a1a]">YouTube</SelectItem>
              <SelectItem value="tiktok" className="text-white hover:bg-[#1a1a1a]">TikTok</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="social_action" className="text-sm font-medium text-gray-200">Action</Label>
          <Select 
            value={formData.social_action || ''} 
            onValueChange={(value) => setFormData(prev => ({ ...prev, social_action: value }))}
          >
            <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500">
              <SelectValue placeholder="Select action" className="text-gray-400" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#282828]">
              {formData.social_platform === 'discord' ? (
                <SelectItem value="join" className="text-white hover:bg-[#1a1a1a]">Join server</SelectItem>
              ) : (
                <>
                  <SelectItem value="follow" className="text-white hover:bg-[#1a1a1a]">Follow</SelectItem>
                  <SelectItem value="like" className="text-white hover:bg-[#1a1a1a]">Like</SelectItem>
                  <SelectItem value="share" className="text-white hover:bg-[#1a1a1a]">Share</SelectItem>
                  <SelectItem value="comment" className="text-white hover:bg-[#1a1a1a]">Comment</SelectItem>
                  <SelectItem value="join" className="text-white hover:bg-[#1a1a1a]">Join</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="social_url" className="text-sm font-medium text-gray-200">
          {formData.social_platform === 'discord' ? 'Discord Invite URL' : 'URL'}
        </Label>
        <Input
          id="social_url"
          type="url"
          placeholder={formData.social_platform === 'discord' ? 'https://discord.gg/...' : 'https://...'}
          value={formData.social_url || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, social_url: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
        {formData.social_platform === 'discord' && (
          <p className="text-xs text-gray-400">
            Enter the Discord server invite URL (e.g., https://discord.gg/abc123)
          </p>
        )}
        {!task && formData.social_platform && formData.social_platform !== 'discord' && socialAccounts[formData.social_platform as keyof typeof socialAccounts] && (
          <p className="text-xs text-gray-400">
            Pre-filled with your {formData.social_platform} profile URL
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="social_username" className="text-sm font-medium text-gray-200">
          {formData.social_platform === 'discord' ? 'Server Name' : 'Username'}
        </Label>
        <Input
          id="social_username"
          placeholder={formData.social_platform === 'discord' ? 'My Discord Server' : '@username'}
          value={formData.social_username || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, social_username: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
        {formData.social_platform === 'discord' && (
          <p className="text-xs text-gray-400">
            Enter a name for your Discord server (optional)
          </p>
        )}
        {!task && formData.social_platform && formData.social_platform !== 'discord' && socialAccounts[formData.social_platform as keyof typeof socialAccounts] && (
          <p className="text-xs text-gray-400">
            Pre-filled with your {formData.social_platform} username
          </p>
        )}
      </div>
    </div>
  )

  const renderVisitFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="visit_url" className="text-sm font-medium text-gray-200">URL</Label>
        <Input
          id="visit_url"
          type="url"
          placeholder="https://..."
          value={formData.visit_url || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, visit_url: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="visit_duration_seconds" className="text-sm font-medium text-gray-200">Duration (seconds)</Label>
        <Input
          id="visit_duration_seconds"
          type="number"
          placeholder="30"
          value={formData.visit_duration_seconds || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, visit_duration_seconds: parseInt(e.target.value) || null }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
      </div>
    </div>
  )

  const renderFormFields = () => (
    <div className="space-y-4">
                  {/* Form URL field removed - column doesn't exist in database */}
      {/* Removed form_title and form_description fields as they don't exist in the database */}
    </div>
  )

  const renderDownloadFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-200">Upload File</Label>
        <FileUpload
          onFileUpload={handleFileUpload}
          onFileRemove={handleFileRemove}
          uploadedFile={uploadedFile}
          uploadedFileUrl={uploadedFileUrl || formData.download_url}
          accept="*/*"
          maxSize={50 * 1024 * 1024} // 50MB
        />
      </div>
      {/* Removed download_title and download_description fields as they don't exist in the database */}
    </div>
  )

  const renderLearnFields = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="quiz_question" className="text-sm font-medium text-gray-200">Question</Label>
        <Textarea
          id="quiz_question"
          placeholder="Enter your question here..."
          value={formData.quiz_question || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, quiz_question: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500 min-h-[80px]"
        />
      </div>
      
      <div className="space-y-2">
        <Label className="text-sm font-medium text-gray-200">Answer Options</Label>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex items-center gap-2">
              <Input
                placeholder={`Answer ${num}`}
                value={formData[`quiz_answer_${num}` as keyof typeof formData] as string || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  [`quiz_answer_${num}`]: e.target.value 
                }))}
                className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
              />
              <input
                type="radio"
                name="correct_answer"
                checked={formData.quiz_correct_answer === num - 1}
                onChange={() => setFormData(prev => ({ ...prev, quiz_correct_answer: num - 1 }))}
                className="w-4 h-4 text-green-600 bg-[#111111] border-[#282828] focus:ring-green-500"
              />
              <Label className="text-sm text-gray-300">Correct</Label>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="quiz_is_multi_select"
            checked={formData.quiz_is_multi_select || false}
            onChange={(e) => setFormData(prev => ({ ...prev, quiz_is_multi_select: e.target.checked }))}
            className="w-4 h-4 text-green-600 bg-[#111111] border-[#282828] focus:ring-green-500"
          />
          <Label htmlFor="quiz_is_multi_select" className="text-sm font-medium text-gray-200">
            Multi-select (allow multiple correct answers)
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="learn_passing_score" className="text-sm font-medium text-gray-200">Passing Score (%)</Label>
        <Input
          id="learn_passing_score"
          type="number"
          min="0"
          max="100"
          placeholder="80"
          value={formData.learn_passing_score || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, learn_passing_score: parseInt(e.target.value) || 80 }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
      </div>
    </div>
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm font-medium text-gray-200">Task Type</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value: 'social' | 'visit' | 'form' | 'download' | 'learn') => 
              setFormData(prev => ({ ...prev, type: value }))
            }
          >
            <SelectTrigger className="bg-[#111111] border-[#282828] text-white hover:border-[#404040] focus:border-green-500">
              <SelectValue className="text-white" />
            </SelectTrigger>
            <SelectContent className="bg-[#111111] border-[#282828]">
              <SelectItem value="social" className="text-white hover:bg-[#1a1a1a]">Social Media</SelectItem>
              <SelectItem value="visit" className="text-white hover:bg-[#1a1a1a]">Visit Website</SelectItem>
              <SelectItem value="form" className="text-white hover:bg-[#1a1a1a]">Fill Form</SelectItem>
              <SelectItem value="download" className="text-white hover:bg-[#1a1a1a]">Download</SelectItem>
              <SelectItem value="learn" className="text-white hover:bg-[#1a1a1a]">Learn & Quiz</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="xp_reward" className="text-sm font-medium text-gray-200">XP Reward</Label>
          <Input
            id="xp_reward"
            type="number"
            min="1"
            placeholder="100"
            value={formData.xp_reward || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, xp_reward: parseInt(e.target.value) || 100 }))}
            className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm font-medium text-gray-200">Title</Label>
        <Input
          id="title"
          placeholder="Task title"
          value={formData.title || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
          required
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-sm font-medium text-gray-200">Description</Label>
        <Textarea
          id="description"
          placeholder="Task description"
          value={formData.description || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          required
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500 min-h-[80px]"
        />
      </div>

      <Separator className="bg-[#282828]" />

      {/* Type-specific fields */}
      {formData.type === 'social' && renderSocialFields()}
      {formData.type === 'visit' && renderVisitFields()}
      {formData.type === 'form' && renderFormFields()}
      {formData.type === 'download' && renderDownloadFields()}
      {formData.type === 'learn' && renderLearnFields()}

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel} className="border-[#282828] text-gray-300 hover:bg-[#1a1a1a] hover:text-white">
          Cancel
        </Button>
        <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
          {task ? 'Update Task' : 'Add Task'}
        </Button>
      </div>
    </form>
  )
} 