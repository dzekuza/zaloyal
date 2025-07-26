'use client'

import { useEffect, useState } from 'react'
import Link from "next/link"
import { ArrowLeft, Globe, Twitter, Github, Users, Zap, Trophy, Plus } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { DiscordIcon } from '@/components/discord-icon'
import { TelegramIcon } from '@/components/telegram-icon'
import { MediumIcon } from '@/components/medium-icon'
import { YoutubeIcon } from '@/components/youtube-icon'
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import ProjectStatsBar from "@/components/ProjectStatsBar"
import BackgroundWrapper from "@/components/BackgroundWrapper";
import QuestFormWrapper from "@/components/quest-form-wrapper"
import PageContainer from "@/components/PageContainer";
import QuestCard from '@/components/QuestCard';
import { toast } from "sonner"
import AuthRequired from '@/components/auth-required';

interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: string;
  category?: string | null;
  featured?: boolean | null;
  verified?: boolean | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  website_url?: string | null;
  discord_url?: string | null;
  github_url?: string | null;
  telegram_url?: string | null;
  medium_url?: string | null;
  total_xp_distributed?: number;
  quest_count?: number;
  total_participants?: number;
  xpToCollect?: number;
}

interface Quest {
  id: string;
  project_id: string;
  title: string;
  description?: string | null;
  total_xp?: number;
  status?: string;
  created_at?: string;
  task_count?: number;
  participants?: number;
  time_limit_days?: number;
  image_url?: string | null;
}

function isQuestCompleted(quest: Quest) {
  if (quest.status === "completed") return true;
  if (quest.time_limit_days && quest.created_at) {
    const created = new Date(quest.created_at)
    const expires = new Date(created.getTime() + quest.time_limit_days * 24 * 60 * 60 * 1000)
    return new Date() > expires
  }
  return false
}

export default function ProjectDetailClient({ 
  project, 
  quests 
}: { 
  project: Project, 
  quests: Quest[] 
}) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)

  useEffect(() => {
    setMounted(true)
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setCurrentUserId(user.id)
          // Check if user is the project owner
          setIsOwner(project.owner_id === user.id)
        }
      } catch (error) {
        console.error('Error checking auth:', error)
      }
    }
    checkAuth()
  }, [project.owner_id])

  // Calculate total XP
  const xpToCollect = quests.reduce((sum, q) => sum + (q.total_xp || 0), 0)

  if (!mounted) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-white text-xl">Loading...</p>
        </div>
      </BackgroundWrapper>
    )
  }

  if (!currentUserId) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <AuthRequired
            title="Sign In Required"
            message="Please sign in with your email or wallet to view this project."
            onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
          />
        </div>
      </BackgroundWrapper>
    )
  }

  return (
    <BackgroundWrapper>
      {/* Cover Image */}
      <div className="relative h-64 sm:h-80 lg:h-96">
        <img
          src={project.cover_image_url || "/placeholder.jpg"}
          alt={`${project.name} cover`}
          className="w-full h-full object-cover"
          style={{ width: 'auto' }}
        />
        <div className="absolute inset-0 bg-black/50" />
        
        {/* Back button */}
        <div className="absolute top-4 left-4">
          <Link href="/project">
            <Button variant="outline" size="sm" className="bg-black/20 border-white/20 text-white hover:bg-black/40">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Projects
            </Button>
          </Link>
        </div>

        {/* Project info overlay */}
        <div className="absolute bottom-0 left-0 w-full">
          <PageContainer className="w-full max-w-full pb-4 px-2 sm:px-6">
            <div className="flex flex-row items-end gap-6">
              {/* Logo */}
              <div className="flex items-center h-20">
                <img
                  src={project.logo_url || "/placeholder.svg?height=80&width=80"}
                  alt={`${project.name} logo`}
                  className="w-20 h-20 rounded-full border-4 border-white bg-white project-logo-cover"
                  style={{ width: 'auto' }}
                />
              </div>
              {/* Title and description */}
              <div className="flex flex-col justify-center gap-2">
                <div className="flex flex-row items-center gap-2">
                  <h1 className="text-3xl font-bold text-white text-left">{project.name}</h1>
                  {project.verified && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 whitespace-nowrap">✓ Verified</Badge>
                  )}
                </div>
                <p className="text-gray-300 text-base sm:text-lg max-w-full sm:max-w-2xl text-left mt-1">{project.description}</p>
              </div>
            </div>
          </PageContainer>
        </div>
      </div>

      {/* Project Stats Bar (separate, below cover) */}
      <ProjectStatsBar questCount={quests.length} participants={project.total_participants || 0} xpToCollect={xpToCollect} />

      {/* Main Content: Quests and Connect */}
      <PageContainer>
        {/* Featured Quests */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Quests</h2>
          {isOwner && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Quest
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111111] border-[#282828] text-white max-h-[80vh] overflow-y-auto w-full max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quest</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Add a new quest to your project
                  </DialogDescription>
                </DialogHeader>
                <QuestFormWrapper projectId={project.id} onSave={() => {
                  setShowCreateDialog(false)
                  toast.success("Quest created successfully!")
                }} />
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quests.map((quest) => (
            <QuestCard quest={quest} key={quest.id}>
              <div className="flex gap-2">
                <Link href={`/quest/${quest.id}`} tabIndex={0} aria-label={`View quest ${quest.title}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full border-[#282828] text-white hover:bg-[#1a1a1a]">
                    View Quest
                  </Button>
                </Link>
                {isOwner && (
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-[#282828] text-white hover:bg-[#1a1a1a] bg-[#181818] z-10"
                        onClick={e => e.stopPropagation()}
                      >
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Edit Quest</DialogTitle>
                        <DialogDescription className="text-gray-300">
                          Update quest details
                        </DialogDescription>
                      </DialogHeader>
                      <QuestFormWrapper quest={quest} projectId={project.id} />
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </QuestCard>
          ))}
        </div>

        {quests.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-300 mb-2">No Quests Yet</h3>
            <p className="text-gray-400 mb-6">Create your first quest to start engaging with your community</p>
            {isOwner ? (
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Quest
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111111] border-[#282828] text-white max-h-[80vh] overflow-y-auto w-full max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Quest</DialogTitle>
                    <DialogDescription className="text-gray-300">
                      Add a new quest to your project
                    </DialogDescription>
                  </DialogHeader>
                  <QuestFormWrapper projectId={project.id} />
                </DialogContent>
              </Dialog>
            ) : (
              <p className="text-gray-400">Only the project owner can create quests</p>
            )}
          </div>
        )}

        {/* Social Links */}
        {(project.discord_url || project.telegram_url || project.medium_url || project.github_url || project.website_url) && (
          <div className="mt-12">
            <h3 className="text-xl font-semibold text-white mb-4">Connect</h3>
            <div className="flex flex-wrap gap-3">
              {project.website_url && (
                <a href={project.website_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <Globe className="h-4 w-4 mr-2" />
                    Website
                  </Button>
                </a>
              )}
              {project.discord_url && (
                <a href={project.discord_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <DiscordIcon />
                    <span className="ml-2">Discord</span>
                  </Button>
                </a>
              )}
              {project.telegram_url && (
                <a href={project.telegram_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <TelegramIcon />
                    <span className="ml-2">Telegram</span>
                  </Button>
                </a>
              )}
              {project.medium_url && (
                <a href={project.medium_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <MediumIcon />
                    <span className="ml-2">Medium</span>
                  </Button>
                </a>
              )}
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <Github className="h-4 w-4 mr-2" />
                    GitHub
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </PageContainer>
    </BackgroundWrapper>
  )
} 