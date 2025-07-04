"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Globe, Twitter, MessageSquare, Github, Users, Zap, Trophy, Calendar, Star } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EditProjectForm from "@/components/edit-project-form"
import EditQuestForm from "@/components/edit-quest-form"
import { DiscordIcon } from '@/components/discord-icon'
import { TelegramIcon } from '@/components/telegram-icon'
import { MediumIcon } from '@/components/medium-icon'
import { YoutubeIcon } from '@/components/youtube-icon'

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { Database } from "@/lib/supabase"
import { saveAs } from "file-saver"

type Project = {
  id: string;
  owner_id: string;
  name: string;
  description: string;
  website_url?: string | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  contract_address?: string | null;
  blockchain_network?: string | null;
  twitter_url?: string | null;
  discord_url?: string | null;
  github_url?: string | null;
  category?: string | null;
  verified?: boolean | null;
  created_at: string;
  quest_count?: number;
  total_participants?: number;
  additional_info?: string | null;
  telegram_url?: string | null;
  medium_url?: string | null;
  youtube_url?: string | null;
};

type Quest = {
  id: string;
  project_id: string;
  creator_id: string;
  title: string;
  description: string;
  image_url?: string | null;
  total_xp: number;
  status: string;
  featured?: boolean | null;
  time_limit_days?: number | null;
  created_at: string;
  task_count?: number;
  participants?: number;
};

function isQuestCompleted(quest: any) {
  if (quest.status === "completed") return true;
  if (quest.time_limit_days && quest.created_at) {
    const created = new Date(quest.created_at)
    const expires = new Date(created.getTime() + quest.time_limit_days * 24 * 60 * 60 * 1000)
    return new Date() > expires
  }
  return false
}

async function exportParticipantsCSV(questId: any, questTitle: any) {
  // Fetch participants for the quest
  const { data, error } = await supabase
    .from("user_quest_progress")
    .select("user_id,total_xp_earned,users(id,email,wallet_address)")
    .eq("quest_id", questId)
  if (error) {
    alert("Failed to fetch participants")
    return
  }
  const rows = (data as any[]).map((row: any) => ({
    id: row.users?.id || row.user_id,
    email: row.users?.email || "",
    xp_earned: row.total_xp_earned,
    wallet_address: row.users?.wallet_address || ""
  }))
  const csv = [
    ["id", "email", "xp_earned", "wallet_address"],
    ...rows.map((r: any) => [r.id, r.email, r.xp_earned, r.wallet_address])
  ].map(e => e.join(",")).join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  saveAs(blob, `${questTitle.replace(/[^a-z0-9]/gi, '_')}_participants.csv`)
}

export default function ProjectDetailPage() {
  const params = useParams()
  const projectId = params.id as string
  const [project, setProject] = useState<any>(null)
  const [quests, setQuests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingQuest, setEditingQuest] = useState<any | null>(null)

  useEffect(() => {
    const fetchProjectAndUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null)
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()
      if (error || !data) {
        setError("Project not found")
        setLoading(false)
        return
      }
      setProject(data)
      // Fetch quests for this project
      const { data: questsData } = await supabase
        .from("quests")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
      setQuests(questsData || [])
      setLoading(false)
    }
    fetchProjectAndUser()
  }, [projectId])

  const isOwner = currentUserId && project && project.owner_id === currentUserId

  if (loading) return <div className="min-h-screen flex items-center justify-center text-white text-xl">Loading...</div>
  if (error || !project) return <div className="min-h-screen flex items-center justify-center text-white text-xl">{error || "Project not found"}</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
      {/* Cover Image */}
      <div className="relative h-64 w-full bg-cover bg-center" style={{ backgroundImage: `url(${project.cover_image_url || "/placeholder.svg?height=256&width=1200"})` }}>
        <div className="absolute inset-0 bg-black/50" />
        {/* Top right: category and edit button */}
        <div className="absolute top-4 right-6 flex flex-row items-center gap-3 z-10">
          {project.category && (
            <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 whitespace-nowrap w-auto px-3 py-1 text-sm">{project.category}</Badge>
          )}
          {isOwner && (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">Edit Project</Button>
              </DialogTrigger>
              <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
                <DialogHeader>
                  <DialogTitle>Edit Project</DialogTitle>
                </DialogHeader>
                <EditProjectForm project={project} onSave={() => {}} />
              </DialogContent>
            </Dialog>
          )}
        </div>
        {/* Bottom left: logo, title, description */}
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
      <div className="bg-black/20 border-b border-white/10">
        <div className="container mx-auto w-full max-w-full px-2 sm:px-6 py-4 flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-8">
          <div className="flex flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-8 flex-1 w-full">
            <div className="flex items-center gap-2 text-yellow-400">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">{quests.length}</span>
              <span className="text-gray-400 hidden sm:inline">Quests</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{project.total_participants || 0}</span>
              <span className="text-gray-400 hidden sm:inline">Participants</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">{project.total_xp_distributed || 0}</span>
              <span className="text-gray-400 hidden sm:inline">XP Distributed</span>
            </div>
          </div>
          <div className="flex flex-row justify-between items-center w-full sm:w-auto gap-2">
            <div className="flex flex-row gap-2">
              {project.website_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.website_url.match(/^https?:\/\//i) ? project.website_url : `https://${project.website_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Globe className="w-4 h-4" />
                </Button>
              )}
              {project.twitter_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.twitter_url.match(/^https?:\/\//i) ? project.twitter_url : `https://${project.twitter_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Twitter className="w-4 h-4" />
                </Button>
              )}
              {project.discord_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.discord_url.match(/^https?:\/\//i) ? project.discord_url : `https://${project.discord_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <DiscordIcon />
                </Button>
              )}
              {project.github_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.github_url.match(/^https?:\/\//i) ? project.github_url : `https://${project.github_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <Github className="w-4 h-4" />
                </Button>
              )}
              {project.telegram_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.telegram_url.match(/^https?:\/\//i) ? project.telegram_url : `https://${project.telegram_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <TelegramIcon />
                </Button>
              )}
              {project.medium_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.medium_url.match(/^https?:\/\//i) ? project.medium_url : `https://${project.medium_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <MediumIcon />
                </Button>
              )}
              {project.youtube_url && (
                <Button size="sm" variant="outline" onClick={() => {
                  const url = project.youtube_url.match(/^https?:\/\//i) ? project.youtube_url : `https://${project.youtube_url}`;
                  window.open(url, "_blank");
                }} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <YoutubeIcon />
                </Button>
              )}
            </div>
            {isOwner && (
              <Link href={`/create?projectId=${projectId}`} className="ml-0 sm:ml-2">
                <Button size="sm" className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 w-full sm:w-auto">
                  + Create Quest
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Featured Quests */}
      <div className="container mx-auto w-full max-w-full py-8 px-2 sm:px-6">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Star className="w-6 h-6 text-yellow-400" />
          Featured Quests
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {quests.length > 0 ? (
            quests.map((quest) => (
              <Card key={quest.id} className="group bg-[#0b4b34c4] border-white/20 transition overflow-hidden">
                <div className="relative overflow-hidden">
                  <img
                    src={quest.image_url || "/placeholder.svg?height=160&width=240"}
                    alt={quest.title}
                    className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {isOwner && (
                    <button
                      className="absolute top-2 right-2 px-3 py-1 rounded bg-green-700 text-white text-xs font-semibold disabled:opacity-50"
                      disabled={!isQuestCompleted(quest)}
                      title={isQuestCompleted(quest) ? "Export participants" : "Available after quest completes"}
                      onClick={() => exportParticipantsCSV(quest.id, quest.title)}
                    >
                      Export Participants
                    </button>
                  )}
                </div>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">{quest.title}</CardTitle>
                  <CardDescription className="text-gray-300 text-sm line-clamp-2">{quest.description}</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="mb-3 flex justify-between items-center text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-yellow-400" />
                      {quest.total_xp} XP
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {/* You can add participants count if available */}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2">
                    {!isOwner && (
                      <Link href={`/quest/${quest.id}`} className="w-full">
                        <Button size="sm" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                          Start Quest
                        </Button>
                      </Link>
                    )}
                    {isOwner && (
                      <>
                        <Dialog open={editingQuest?.id === quest.id} onOpenChange={open => setEditingQuest(open ? quest : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">Edit Quest</Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
                            <DialogHeader>
                              <DialogTitle>Edit Quest</DialogTitle>
                            </DialogHeader>
                            <CardContent className="p-0">
                              <EditQuestForm quest={quest} onSave={() => setEditingQuest(null)} />
                            </CardContent>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 col-span-3">
              <div className="text-gray-400 text-lg mb-4">No quests available</div>
              <p className="text-gray-500">This project hasn't created any quests yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
