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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { X, Plus, Trash2, HelpCircle } from "lucide-react"
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
  const [showDiscordSetup, setShowDiscordSetup] = useState(false)
  const [showTelegramSetup, setShowTelegramSetup] = useState(false)
  
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
        learn_passing_score: task.learn_passing_score,
        // Quiz fields
        quiz_question: task.quiz_question,
        quiz_answer_1: task.quiz_answer_1,
        quiz_answer_2: task.quiz_answer_2,
        quiz_answer_3: task.quiz_answer_3,
        quiz_answer_4: task.quiz_answer_4,
        quiz_correct_answer: task.quiz_correct_answer,
        quiz_is_multi_select: task.quiz_is_multi_select
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
    console.log('DEBUG: TaskForm handleSubmit called with formData:', formData)
    
    // Validate required fields based on task type
    if (formData.type === 'social') {
      if (!formData.social_platform) {
        alert('Please select a social platform')
        return
      }
      if (!formData.social_action) {
        alert('Please select a social action')
        return
      }
      if (!formData.social_url) {
        alert('Please enter a URL')
        return
      }
    }
    
    if (formData.type === 'visit') {
      if (!formData.visit_url) {
        alert('Please enter a visit URL')
        return
      }
    }
    
    if (formData.type === 'download') {
      if (!formData.download_url) {
        alert('Please upload a file or enter a download URL')
        return
      }
    }
    
    if (formData.type === 'learn') {
      if (!formData.quiz_question) {
        alert('Please enter a quiz question')
        return
      }
      if (!formData.quiz_answer_1 || !formData.quiz_answer_2) {
        alert('Please provide at least 2 answer options')
        return
      }
      if (formData.quiz_correct_answer === null || formData.quiz_correct_answer === undefined) {
        alert('Please select the correct answer')
        return
      }
    }
    
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
              {/* Platform-specific actions */}
              {formData.social_platform === 'discord' ? (
                <SelectItem value="join" className="text-white hover:bg-[#1a1a1a]">Join server</SelectItem>
              ) : formData.social_platform === 'telegram' ? (
                <SelectItem value="join" className="text-white hover:bg-[#1a1a1a]">Join channel</SelectItem>
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
        {/* Platform-specific URL labels */}
        <Label htmlFor="social_url" className="text-sm font-medium text-gray-200">
          {formData.social_platform === 'discord' ? 'Discord Invite URL' : 
           formData.social_platform === 'telegram' ? 'Telegram Channel/Group URL' : 'URL'}
        </Label>
        <Input
          id="social_url"
          type="url"
          placeholder={formData.social_platform === 'discord' ? 'https://discord.gg/...' : 
                     formData.social_platform === 'telegram' ? 'https://t.me/...' : 'https://...'}
          value={formData.social_url || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, social_url: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
          required={formData.type === 'social'}
        />
        {formData.social_platform === 'discord' && (
          <p className="text-xs text-gray-400">
            Enter the Discord server invite URL (e.g., https://discord.gg/abc123)
          </p>
        )}
        {formData.social_platform === 'telegram' && (
          <p className="text-xs text-gray-400">
            Enter the Telegram channel or group URL (e.g., https://t.me/channelname)
          </p>
        )}
        {!task && formData.social_platform && formData.social_platform !== 'discord' && formData.social_platform !== 'telegram' && socialAccounts[formData.social_platform as keyof typeof socialAccounts] && (
          <p className="text-xs text-gray-400">
            Pre-filled with your {formData.social_platform} profile URL
          </p>
        )}
      </div>
      <div className="space-y-2">
        {/* Platform-specific username labels */}
        <Label htmlFor="social_username" className="text-sm font-medium text-gray-200">
          {formData.social_platform === 'discord' ? 'Server Name' : 
           formData.social_platform === 'telegram' ? 'Channel/Group Name' : 'Username'}
        </Label>
        <Input
          id="social_username"
          placeholder={formData.social_platform === 'discord' ? 'My Discord Server' : 
                     formData.social_platform === 'telegram' ? 'My Telegram Channel' : '@username'}
          value={formData.social_username || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, social_username: e.target.value }))}
          className="bg-[#111111] border-[#282828] text-white placeholder:text-gray-500 hover:border-[#404040] focus:border-green-500"
        />
        {formData.social_platform === 'discord' && (
          <p className="text-xs text-gray-400">
            Enter a name for your Discord server (optional)
          </p>
        )}
        {formData.social_platform === 'telegram' && (
          <p className="text-xs text-gray-400">
            Enter a name for your Telegram channel or group (optional)
          </p>
        )}
        {!task && formData.social_platform && formData.social_platform !== 'discord' && formData.social_platform !== 'telegram' && socialAccounts[formData.social_platform as keyof typeof socialAccounts] && (
          <p className="text-xs text-gray-400">
            Pre-filled with your {formData.social_platform} username
          </p>
        )}
      </div>

      {/* Discord Setup Instructions Button */}
      {formData.social_platform === 'discord' && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDiscordSetup(true)}
            className="border-[#282828] text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How to setup
          </Button>
        </div>
      )}

      {/* Telegram Setup Instructions Button */}
      {formData.social_platform === 'telegram' && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowTelegramSetup(true)}
            className="border-[#282828] text-gray-300 hover:bg-[#1a1a1a] hover:text-white"
          >
            <HelpCircle className="w-4 h-4 mr-2" />
            How to setup
          </Button>
        </div>
      )}
    </div>
  )

  const renderDiscordSetupInstructions = () => (
    <Dialog open={showDiscordSetup} onOpenChange={setShowDiscordSetup}>
      <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Discord Bot Setup Guide</DialogTitle>
          <DialogDescription className="text-gray-300">
            Follow these steps to set up your Discord server for task verification
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 px-6 pb-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Invite the Bot to Your Server</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Click the button below to invite the BeLink verification bot to your Discord server:
              </p>
              <Button 
                onClick={() => window.open('https://discord.com/api/oauth2/authorize?client_id=1397282925849874492&permissions=8&scope=bot', '_blank')}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                Invite BeLink Bot
              </Button>
              <p className="text-xs text-gray-400">
                The bot needs administrator permissions to verify user memberships
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Configure Bot Permissions</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                After inviting the bot, ensure it has the following permissions:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>View Channels</li>
                <li>Read Message History</li>
                <li>View Server Insights</li>
                <li>Server Members Intent (enabled in Discord Developer Portal)</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                3
              </div>
              <h3 className="text-lg font-semibold text-white">Create an Invite Link</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Create a permanent invite link for your Discord server:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to your Discord server settings</li>
                <li>Navigate to "Invites" in the left sidebar</li>
                <li>Click "Create Invite"</li>
                <li>Set "Expire After" to "Never"</li>
                <li>Copy the invite link (e.g., https://discord.gg/abc123)</li>
                <li>Paste it in the "Discord Invite URL" field above</li>
              </ol>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                4
              </div>
              <h3 className="text-lg font-semibold text-white">Test the Setup</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Once everything is configured, you can test the setup:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Join your Discord server using the invite link</li>
                <li>Create a test quest with the Discord join task</li>
                <li>Try completing the task to verify everything works</li>
              </ul>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                ?
              </div>
              <h3 className="text-lg font-semibold text-white">Troubleshooting</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                If users can't verify their Discord membership:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Ensure the bot is still in your server</li>
                <li>Check that the bot has the required permissions</li>
                <li>Verify the invite link is still valid</li>
                <li>Make sure users are joining with the same Discord account they connected to BeLink</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )

  const renderTelegramSetupInstructions = () => (
    <Dialog open={showTelegramSetup} onOpenChange={setShowTelegramSetup}>
      <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-white">Telegram Bot Setup Guide</DialogTitle>
          <DialogDescription className="text-gray-300">
            Follow these steps to set up your Telegram channel for task verification
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 px-6 pb-6">
          {/* Step 1 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                1
              </div>
              <h3 className="text-lg font-semibold text-white">Add Bot to Your Channel</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Add the BeLink verification bot to your Telegram channel as an admin:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Open your Telegram channel</li>
                <li>Go to channel settings</li>
                <li>Click "Administrators"</li>
                <li>Click "Add Admin"</li>
                <li>Search for: <code className="bg-gray-800 px-2 py-1 rounded">@BeLinkVerifyBot</code></li>
                <li>Grant admin permissions to the bot</li>
              </ol>
            </div>
          </div>

          {/* Step 2 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                2
              </div>
              <h3 className="text-lg font-semibold text-white">Configure Bot Permissions</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Ensure the bot has the following permissions:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Add Members</li>
                <li>Ban Users</li>
                <li>Delete Messages</li>
                <li>Pin Messages</li>
                <li>Manage Voice Chats</li>
                <li>Read Messages</li>
              </ul>
            </div>
          </div>

          {/* Step 3 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                3
              </div>
              <h3 className="text-lg font-semibold text-white">Create Channel Invite Link</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Create a permanent invite link for your Telegram channel:
              </p>
              <ol className="list-decimal list-inside text-gray-300 space-y-1 ml-4">
                <li>Go to your channel settings</li>
                <li>Click "Invite Links"</li>
                <li>Click "Create Link"</li>
                <li>Set "Expire After" to "Never"</li>
                <li>Copy the invite link (e.g., https://t.me/+abc123)</li>
                <li>Paste it in the "Telegram Channel/Group URL" field above</li>
              </ol>
            </div>
          </div>

          {/* Step 4 */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                4
              </div>
              <h3 className="text-lg font-semibold text-white">Test the Setup</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                Once everything is configured, you can test the setup:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Join your Telegram channel using the invite link</li>
                <li>Create a test quest with the Telegram join task</li>
                <li>Try completing the task to verify everything works</li>
              </ul>
            </div>
          </div>

          {/* Troubleshooting */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                ?
              </div>
              <h3 className="text-lg font-semibold text-white">Troubleshooting</h3>
            </div>
            <div className="ml-11 space-y-2">
              <p className="text-gray-300">
                If users can't verify their Telegram membership:
              </p>
              <ul className="list-disc list-inside text-gray-300 space-y-1 ml-4">
                <li>Ensure the bot is still an admin in your channel</li>
                <li>Check that the bot has the required permissions</li>
                <li>Verify the invite link is still valid</li>
                <li>Make sure users are joining with the same Telegram account they connected to BeLink</li>
                <li>Ensure the channel is public or the bot has access to member list</li>
              </ul>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
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

      {/* Discord Setup Instructions Dialog */}
      {renderDiscordSetupInstructions()}

      {/* Telegram Setup Instructions Dialog */}
      {renderTelegramSetupInstructions()}
    </form>
  )
} 