import { cache } from "react"
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
  twitter_url?: string | null;
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

// Cache the database queries
const getProject = cache(async (projectId: string) => {
  const { data: project, error } = await supabase
    .from("projects")
    .select('id, owner_id, name, description, logo_url, cover_image_url, category, status, featured, verified, website_url, twitter_url, discord_url, github_url, telegram_url, medium_url, total_participants')
    .eq("id", projectId)
    .single()
  
  if (error) throw error
  return project as Project
})

const getQuests = cache(async (projectId: string) => {
  const { data: quests, error } = await supabase
    .from("quests")
    .select('id, project_id, title, description, total_xp, status, created_at, time_limit_days, image_url')
    .eq("project_id", projectId)
  
  if (error) throw error
  return (quests || []) as Quest[]
})

function isQuestCompleted(quest: Quest) {
  if (quest.status === "completed") return true;
  if (quest.time_limit_days && quest.created_at) {
    const created = new Date(quest.created_at)
    const expires = new Date(created.getTime() + quest.time_limit_days * 24 * 60 * 60 * 1000)
    return new Date() > expires
  }
  return false
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    
    // Fetch project and quests in parallel
    const [project, quests] = await Promise.all([
      getProject(projectId),
      getQuests(projectId)
    ])

    // Calculate total XP
    const xpToCollect = quests.reduce((sum, q) => sum + (q.total_xp || 0), 0)

    return (
      <BackgroundWrapper>
        {/* Cover Image */}
        <div className="relative h-64 sm:h-80 lg:h-96">
          <img
            src={project.cover_image_url || "/placeholder.jpg"}
            alt={`${project.name} cover`}
            className="w-full h-full object-cover"
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
            <div className="container mx-auto w-full max-w-full px-2 sm:px-6 pb-4">
              <div className="flex flex-row items-end gap-6">
                {/* Logo */}
                <div className="flex items-center h-20">
                  <img
                    src={project.logo_url || "/placeholder.svg?height=80&width=80"}
                    alt={`${project.name} logo`}
                    className="w-20 h-20 rounded-full border-4 border-white bg-white object-cover"
                    style={{ objectFit: 'cover' }}
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
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <ProjectStatsBar questCount={quests.length} participants={project.total_participants || 0} xpToCollect={xpToCollect} />

        {/* Featured Quests */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">Quests</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Quest
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New Quest</DialogTitle>
                  <DialogDescription className="text-gray-300">
                    Add a new quest to your project
                  </DialogDescription>
                </DialogHeader>
                <QuestFormWrapper projectId={projectId} />
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quests.map((quest) => (
              <Card key={quest.id} className="bg-[#111111] border-[#282828] text-white hover:bg-[#1a1a1a] transition-colors">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{quest.title}</CardTitle>
                      <CardDescription className="text-gray-300 mt-2">
                        {quest.description}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={isQuestCompleted(quest) ? "secondary" : "default"}
                      className={isQuestCompleted(quest) ? "bg-gray-600 text-gray-300" : "bg-green-600 text-white"}
                    >
                      {isQuestCompleted(quest) ? "Completed" : "Active"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-gray-300 mb-4">
                    <div className="flex items-center gap-1">
                      <Zap className="h-4 w-4" />
                      <span>{quest.total_xp || 0} XP</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{quest.participants || 0} participants</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/quest/${quest.id}`}>
                      <Button variant="outline" size="sm" className="flex-1 border-[#282828] text-white hover:bg-[#1a1a1a]">
                        View Quest
                      </Button>
                    </Link>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Quest</DialogTitle>
                          <DialogDescription className="text-gray-300">
                            Update quest details
                          </DialogDescription>
                        </DialogHeader>
                        <QuestFormWrapper quest={quest} projectId={projectId} />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {quests.length === 0 && (
            <div className="text-center py-12">
              <Trophy className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-300 mb-2">No Quests Yet</h3>
              <p className="text-gray-400 mb-6">Create your first quest to start engaging with your community</p>
              <Dialog>
                <DialogTrigger asChild>
                  <Button className="bg-green-600 hover:bg-green-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Quest
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#111111] border-[#282828] text-white max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Quest</DialogTitle>
                    <DialogDescription className="text-gray-300">
                      Add a new quest to your project
                    </DialogDescription>
                  </DialogHeader>
                  <QuestFormWrapper projectId={projectId} />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Social Links */}
        {(project.twitter_url || project.discord_url || project.telegram_url || project.medium_url || project.github_url || project.website_url) && (
          <div className="container mx-auto px-4 py-8">
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
              {project.twitter_url && (
                <a href={project.twitter_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="border-[#282828] text-white hover:bg-[#1a1a1a]">
                    <Twitter className="h-4 w-4 mr-2" />
                    Twitter
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
      </BackgroundWrapper>
    )
  } catch (error) {
    console.error("Error loading project:", error)
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
            <p className="text-gray-300 mb-6">The project you're looking for doesn't exist or has been removed.</p>
            <Link href="/project">
              <Button className="bg-green-600 hover:bg-green-700">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Projects
              </Button>
            </Link>
          </div>
        </div>
      </BackgroundWrapper>
    )
  }
}
