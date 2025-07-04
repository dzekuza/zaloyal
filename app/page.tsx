"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Search, Filter, Users, Zap, Trophy, Star, Globe, Twitter, MessageSquare } from "lucide-react"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import EditProjectForm from "@/components/edit-project-form"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

import type { Database } from "@/lib/supabase"

type Project = {
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
  total_xp_distributed?: number;
  quest_count?: number;
  total_participants?: number;
  // ...add any other fields you use from the projects table
}

export default function ProjectDiscovery() {
  /* ------------------------------------------------------------------ */
  /*  state                                                             */
  /* ------------------------------------------------------------------ */
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)

  const categories = [
    "DeFi",
    "NFT",
    "Gaming",
    "Infrastructure",
    "Social",
    "Education",
    "DAO",
    "Metaverse",
    "Trading",
    "Staking",
  ]

  /* ------------------------------------------------------------------ */
  /*  effects                                                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    fetchProjects()
  }, [])

  useEffect(() => {
    let filtered = projects

    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchTerm.toLowerCase()),
      )
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category?.toLowerCase() === selectedCategory.toLowerCase())
    }

    setFilteredProjects(filtered)
  }, [searchTerm, selectedCategory, projects])

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    }
    fetchUser();
  }, [])

  /* ------------------------------------------------------------------ */
  /*  helpers                                                           */
  /* ------------------------------------------------------------------ */
  const fetchProjects = async () => {
    // ──────────────────────────────────────────────────────────────────────────────
    // 1. Try the real `projects` table first
    // ──────────────────────────────────────────────────────────────────────────────
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("status", "approved")
        .order("created_at", { ascending: false })

      if (error) throw error

      const withStats = await Promise.all(
        (data || []).map(async (project) => {
          const { count: questCount } = await supabase
            .from("quests")
            .select("*", { count: "exact", head: true })
            .eq("project_id", project.id)
            .eq("status", "active")

          const { data: questIds } = await supabase
            .from("quests")
            .select("id")
            .eq("project_id", project.id)
            .eq("status", "active")

          let totalParticipants = 0
          if (questIds?.length) {
            const { count } = await supabase
              .from("user_quest_progress")
              .select("user_id", { count: "exact", head: true })
              .in(
                "quest_id",
                questIds.map((q) => q.id),
              )
            totalParticipants = count || 0
          }

          return {
            ...project,
            quest_count: questCount || 0,
            total_participants: totalParticipants,
          }
        }),
      )

      setProjects(withStats)
      setLoading(false)
    } catch (err: any) {
      // ──────────────────────────────────────────────────────────────────────────
      // 2. If the projects table doesn't exist yet, fall back to quests
      // ──────────────────────────────────────────────────────────────────────────
      if (err?.message?.includes("projects") && err.message.includes("does not exist")) {
        console.warn("`projects` table not found – falling back to quests.")
        const { data: quests } = await supabase.from("quests").select("*").eq("status", "active")
        const safeQuests = quests || []

        // Group quests by creator to mimic a "project" card
        const grouped = Object.values(
          safeQuests.reduce<Record<string, Project>>((acc, q) => {
            acc[q.creator_id] ??= {
              id: q.creator_id,
              name: "Creator " + q.creator_id.slice(0, 6),
              description: "Quests by this creator",
              created_at: q.created_at,
              updated_at: q.updated_at,
              status: "approved",
              quest_count: 0,
              total_participants: 0,
            } as Project
            acc[q.creator_id].quest_count! += 1
            return acc
          }, {}),
        )

        setProjects(grouped)
        setLoading(false)
      } else {
        console.error(
          "Error fetching projects:",
          err,
          typeof err,
          err && (err.message || JSON.stringify(err) || err)
        )
        setLoading(false)
      }
    }
  }

  // Add a helper to sum XP distributed
  const totalXPDistributed = projects.reduce((sum, p) => sum + (p.total_xp_distributed || 0), 0)

  /* ------------------------------------------------------------------ */
  /*  render                                                            */
  /* ------------------------------------------------------------------ */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <p className="text-white text-xl">Loading projects...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Hero */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-3xl" />
        <div className="relative container mx-auto px-4 py-16 text-center space-y-6">
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Web3 Projects
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover amazing Web3 projects and complete their quests to earn rewards
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {projects.length} Verified Projects
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {projects.reduce((sum, p) => sum + (p.quest_count || 0), 0)} Active Quests
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {totalXPDistributed.toLocaleString()} XP Distributed
            </span>
          </div>
        </div>
      </header>

      {/* Search / Filter */}
      <section className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-gray-400 backdrop-blur-sm"
            />
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">
                All Categories
              </SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c.toLowerCase()} className="text-white hover:bg-slate-700">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Featured Projects */}
        <h2 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
          <Star className="h-5 w-5 text-yellow-400" />
          Featured Projects
        </h2>

        <ProjectGrid
          projects={filteredProjects.filter((p) => p.featured)}
          currentUserId={currentUserId}
          editingProject={editingProject}
          setEditingProject={setEditingProject}
          onProjectDeleted={() => {
            // Optionally refetch projects or update state
            window.location.reload()
          }}
        />

        {/* All Projects */}
        <h2 className="text-2xl font-bold text-white my-6">All Projects</h2>
        <ProjectGrid
          projects={filteredProjects}
          currentUserId={currentUserId}
          editingProject={editingProject}
          setEditingProject={setEditingProject}
          onProjectDeleted={() => {
            // Optionally refetch projects or update state
            window.location.reload()
          }}
        />

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-2">No projects found</p>
            <p className="text-gray-500">Try different search or filters</p>
          </div>
        )}
      </section>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  sub-component                                                      */
/* ------------------------------------------------------------------ */
function ProjectGrid({ projects, currentUserId, editingProject, setEditingProject, onProjectDeleted }: {
  projects: Project[],
  currentUserId: string | null,
  editingProject: Project | null,
  setEditingProject: (p: Project | null) => void,
  onProjectDeleted: () => void
}) {
  if (!projects.length) return null

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    const { error } = await supabase.from("projects").delete().eq("id", projectId)
    if (error) {
      alert("Failed to delete project: " + error.message)
    } else {
      onProjectDeleted()
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
      {projects.map((project) => (
        <Card
          key={project.id}
          className="group bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition overflow-hidden"
        >
          {/* Cover */}
          <div className="relative overflow-hidden">
            <img
              src={project.cover_image_url || "/placeholder.svg?height=160&width=240"}
              alt={project.name}
              className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-3 left-3 flex gap-2">
              {project.category && (
                <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs">
                  {project.category}
                </Badge>
              )}
              {project.verified && (
                <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">✓</Badge>
              )}
            </div>
            <div className="absolute top-3 right-3">
              <img
                src={project.logo_url || "/placeholder.svg?height=24&width=24"}
                alt={`${project.name} logo`}
                className="h-6 w-6 rounded-full border border-white/30"
              />
            </div>
          </div>

          {/* Body */}
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
              {project.name}
            </CardTitle>
            <CardDescription className="text-gray-300 text-sm line-clamp-2">{project.description}</CardDescription>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="mb-3 flex justify-between items-center text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Trophy className="h-3 w-3 text-yellow-400" />
                {project.quest_count} Quests
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {project.total_participants}
              </span>
              <span className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-yellow-400" />
                {project.total_xp_distributed} XP
              </span>
            </div>

            <div className="mb-3 flex items-center gap-2">
              {project.website_url && <IconLink href={project.website_url} icon={Globe} />}
              {project.twitter_url && <IconLink href={project.twitter_url} icon={Twitter} />}
              {project.discord_url && <IconLink href={project.discord_url} icon={MessageSquare} />}
            </div>

            {currentUserId && project.owner_id === currentUserId && (
              <div className="flex gap-2 mb-2">
                <Dialog open={editingProject?.id === project.id} onOpenChange={open => setEditingProject(open ? project : null)}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="min-w-[96px]" onClick={() => setEditingProject(project)}>
                      Edit
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Edit Project</DialogTitle>
                    </DialogHeader>
                    {editingProject && editingProject.id === project.id && (
                      <EditProjectForm
                        project={editingProject}
                        onSave={() => setEditingProject(null)}
                      />
                    )}
                  </DialogContent>
                </Dialog>
                <Button
                  size="sm"
                  variant="destructive"
                  className="min-w-[96px] border border-[#6c0a0a]"
                  onClick={() => handleDeleteProject(project.id)}
                >
                  Delete
                </Button>
              </div>
            )}

            <Link href={`/project/${project.id}`}>
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
              >
                {currentUserId && project.owner_id === currentUserId ? "View My Project" : "Explore Project"}
              </Button>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  utility                                                            */
/* ------------------------------------------------------------------ */
function getAbsoluteUrl(url: string) {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}

function IconLink({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => window.open(getAbsoluteUrl(href), "_blank")}
      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
    >
      <Icon className="h-3 w-3" />
    </Button>
  );
}
