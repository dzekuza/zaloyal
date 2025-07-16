"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Globe, Twitter, MessageSquare, Github, Users, Zap, Trophy, Star, Plus } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
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
import { saveAs } from "file-saver"
import ProjectStatsBar from "@/components/ProjectStatsBar"
import ImageUpload from "@/components/image-upload"

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
  youtube_url?: string | null;
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

interface User {
  id: string;
  email: string;
  wallet_address?: string | null;
}

interface UserQuestProgress {
  user_id: string;
  total_xp_earned: number;
  user?: User;
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

async function exportParticipantsCSV(questId: string, questTitle: string) {
  // Fetch participants for the quest
  const { data, error } = await supabase
    .from("user_quest_progress")
    .select("user_id,total_xp_earned,users(id,email,wallet_address)")
    .eq("quest_id", questId)
  if (error) {
    alert("Failed to fetch participants")
    return
  }
  const rows = (data as UserQuestProgress[]).map((row: UserQuestProgress) => ({
    id: row.user?.id || row.user_id,
    email: row.user?.email || "",
    xp_earned: row.total_xp_earned,
    wallet_address: row.user?.wallet_address || ""
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
  const router = useRouter()
  const [project, setProject] = useState<Project | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingQuest, setEditingQuest] = useState<Quest | null>(null)
  const [xpToCollect, setXpToCollect] = useState(0)
  const [showCreateQuest, setShowCreateQuest] = useState(false)
  const [creatingQuest, setCreatingQuest] = useState(false)
  const [createQuestError, setCreateQuestError] = useState("")
  const [newQuest, setNewQuest] = useState({
    title: "",
    description: "",
    image_url: "",
    total_xp: 0,
    status: "active"
  })

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setError("You are not authenticated. Please log in again.");
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      // Parallel fetches
      const [projectRes, questsRes] = await Promise.all([
        supabase.from("projects").select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, verified, website_url, twitter_url, discord_url, github_url, telegram_url, medium_url').eq("id", projectId).single(),
        supabase.from("quests").select('id, project_id, title, description, total_xp, status, created_at, time_limit_days, image_url').eq("project_id", projectId)
      ]);
      const { data: project, error: projectError } = projectRes;
      const { data: questsData, error: questsError } = questsRes;
      if (projectError || !project) {
        setError("Project not found");
        setLoading(false);
        return;
      }
      setProject(project as Project);
      setQuests((questsData || []) as Quest[]);
      // Sum quest.total_xp for all quests
      if (questsData && questsData.length > 0) {
        const totalXP = (questsData as Quest[]).reduce((sum, q) => sum + (q.total_xp || 0), 0);
        setXpToCollect(totalXP);
      } else {
        setXpToCollect(0);
      }
      setLoading(false);
    };
    checkSessionAndFetch();
  }, [projectId]);

  const isOwner = currentUserId && project && project.owner_id === currentUserId

  const handleCreateQuest = async () => {
    setCreatingQuest(true)
    setCreateQuestError("")
    try {
      const { error } = await supabase.from("quests").insert({
        title: newQuest.title,
        description: newQuest.description,
        image_url: newQuest.image_url,
        total_xp: newQuest.total_xp,
        status: newQuest.status,
        project_id: projectId,
        creator_id: currentUserId
      })
      if (error) throw error
      setShowCreateQuest(false)
      setNewQuest({ title: "", description: "", image_url: "", total_xp: 0, status: "active" })
      // Refresh quests
      const { data: questsData } = await supabase.from("quests").select('id, project_id, title, description, total_xp, status, created_at, time_limit_days, image_url').eq("project_id", projectId)
      setQuests((questsData || []) as Quest[])
    } catch (e: any) {
      setCreateQuestError(e.message || "Failed to create quest")
    } finally {
      setCreatingQuest(false)
    }
  }

  if (loading) return <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center text-white text-xl">Loading...</div>
  if (error || !project) return <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900 flex items-center justify-center text-white text-xl">{error || "Project not found"}</div>

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
      <ProjectStatsBar questCount={quests.length} participants={project.total_participants || 0} xpToCollect={xpToCollect} />
      {/* Featured Quests */}
      <div className="container mx-auto w-full max-w-full py-8 px-2 sm:px-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Star className="w-6 h-6 text-yellow-400" />
            Featured Quests
          </h2>
          {isOwner && (
            <Button onClick={() => setShowCreateQuest(true)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Quest
            </Button>
          )}
        </div>
        {/* Create Quest Dialog */}
        <Dialog open={showCreateQuest} onOpenChange={setShowCreateQuest}>
          <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
            <DialogHeader>
              <DialogTitle>Create New Quest</DialogTitle>
            </DialogHeader>
            <form className="space-y-4" onSubmit={e => { e.preventDefault(); handleCreateQuest(); }}>
              {createQuestError && <div className="p-2 bg-red-500/20 border border-red-500/30 rounded text-red-400 text-sm">{createQuestError}</div>}
              <div>
                <label className="text-white block mb-1">Title</label>
                <input type="text" value={newQuest.title} onChange={e => setNewQuest(q => ({ ...q, title: e.target.value }))} className="w-full bg-white/10 border-white/20 text-white rounded px-3 py-2" required />
              </div>
              <div>
                <label className="text-white block mb-1">Description</label>
                <textarea value={newQuest.description} onChange={e => setNewQuest(q => ({ ...q, description: e.target.value }))} className="w-full bg-white/10 border-white/20 text-white rounded px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="text-white block mb-1">Quest Image</label>
                <ImageUpload
                  onImageUploaded={url => setNewQuest(q => ({ ...q, image_url: url }))}
                  onImageRemoved={() => setNewQuest(q => ({ ...q, image_url: "" }))}
                  currentImage={newQuest.image_url}
                  label="Upload Quest Image"
                />
              </div>
              <div>
                <label className="text-white block mb-1">Total XP</label>
                <input type="number" value={newQuest.total_xp} onChange={e => setNewQuest(q => ({ ...q, total_xp: Number(e.target.value) }))} className="w-full bg-white/10 border-white/20 text-white rounded px-3 py-2" min={0} required />
              </div>
              <div>
                <label className="text-white block mb-1">Status</label>
                <select value={newQuest.status} onChange={e => setNewQuest(q => ({ ...q, status: e.target.value }))} className="w-full bg-white/10 border-white/20 text-white rounded px-3 py-2">
                  <option value="active">Active</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateQuest(false)} className="bg-white/10 border-white/20 text-white">Cancel</Button>
                <Button type="submit" disabled={creatingQuest} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">{creatingQuest ? "Creating..." : "Create Quest"}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
          {quests.length > 0 ? (
            quests.map((quest) => (
              <Link key={quest.id} href={`/quest/${quest.id}`} className="block group">
                <Card className="group bg-[#0b4b34c4] border-white/20 transition overflow-hidden cursor-pointer hover:border-green-400">
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
                        onClick={e => { e.preventDefault(); exportParticipantsCSV(quest.id, quest.title); }}
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
                      {isOwner && (
                        <Dialog open={editingQuest?.id === quest.id} onOpenChange={open => setEditingQuest(open ? quest : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0" onClick={e => e.preventDefault()}>Edit Quest</Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
                            <DialogHeader>
                              <DialogTitle>Edit Quest</DialogTitle>
                              <DialogDescription>
                                Update the quest details and image below, then save your changes.
                              </DialogDescription>
                            </DialogHeader>
                            <EditQuestForm quest={quest} onSave={() => { setEditingQuest(null); router.push(`/project/${projectId}`); }} />
                          </DialogContent>
                        </Dialog>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
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
