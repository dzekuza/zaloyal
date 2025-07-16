import Link from "next/link"
import { Search, Filter, Users, Zap, Trophy, Star } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import ProjectCard from "@/components/ProjectCard"
import ProjectDiscoveryClient from "@/components/ProjectDiscoveryClient";

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
  total_xp_distributed?: number;
  quest_count?: number;
  total_participants?: number;
  xpToCollect?: number;
}

// Remove all useEffect/useState for fetching projects, loading, and currentUserId
// Move search/filter state to a client subcomponent

// Server component
export default async function ProjectDiscovery() {
  // Fetch all projects
  const { data: projects, error } = await supabase
    .from("projects")
    .select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, total_participants')
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching projects:", error, JSON.stringify(error, null, 2) || "<empty error object>");
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900"><p className="text-white text-xl">Error loading projects.</p></div>
  }
  console.log("Fetched projects:", projects)

  // Batch fetch all quests for all projects
  const projectIds = (projects || []).map(p => p.id)
  let questsByProject: Record<string, { total_xp: number }[]> = {}
  if (projectIds.length > 0) {
    const { data: quests, error: questsError } = await supabase
      .from("quests")
      .select("id, project_id, total_xp")
      .in("project_id", projectIds)
      .eq("status", "active")
    if (questsError) {
      console.error("Error fetching quests for projects:", questsError)
    }
    questsByProject = (quests || []).reduce((acc, q) => {
      acc[q.project_id] = acc[q.project_id] || []
      acc[q.project_id].push(q)
      return acc
    }, {} as Record<string, { total_xp: number }[]>)
  }

  // Batch fetch participants for all projects (optional: can be optimized further)
  let participantsByProject: Record<string, number> = {}
  if (projectIds.length > 0) {
    const { data: questIdsRaw, error: questIdsError } = await supabase
      .from("quests")
      .select("id, project_id")
      .in("project_id", projectIds)
      .eq("status", "active")
    if (questIdsError) {
      console.error("Error fetching quest ids for participants:", questIdsError)
    }
    const questIds: Array<{ id: string; project_id: string }> = questIdsRaw || []
    const allQuestIds = questIds.map(q => q.id)
    if (allQuestIds.length > 0) {
      const { data: userQuestProgressRaw, error: userQuestProgressError } = await supabase
        .from("user_quest_progress")
        .select("quest_id, user_id")
        .in("quest_id", allQuestIds)
      if (userQuestProgressError) {
        console.error("Error fetching user quest progress:", userQuestProgressError)
      }
      const userQuestProgress: Array<{ quest_id: string; user_id: string }> = userQuestProgressRaw || []
      // Count unique users per project
      const usersByProject: Record<string, Set<string>> = {}
      userQuestProgress.forEach((uqp: { quest_id: string; user_id: string }) => {
        const projectId = questIds.find((q) => q.id === uqp.quest_id)?.project_id
        if (projectId) {
          usersByProject[projectId] = usersByProject[projectId] || new Set()
          usersByProject[projectId].add(uqp.user_id)
        }
      })
      participantsByProject = Object.fromEntries(
        Object.entries(usersByProject).map(([pid, set]) => [pid, set.size])
      )
    }
  }

  // Compose final project list with stats as 'projectsWithStats'
  const projectsWithStats: Project[] = (projects || []).map(project => {
    const quests = questsByProject[project.id] || []
    const xpToCollect = quests.reduce((sum: number, q: { total_xp: number }) => sum + (q.total_xp || 0), 0)
    const total_participants = participantsByProject[project.id] || 0
    return {
      ...project,
      xpToCollect,
      quest_count: quests.length,
      total_participants,
    }
  })
  console.log("projectsWithStats:", projectsWithStats)

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

  return <ProjectDiscoveryClient projects={projectsWithStats} categories={categories} />
}

/* ------------------------------------------------------------------ */
/*  utility                                                            */
/* ------------------------------------------------------------------ */
function getAbsoluteUrl(url: string) {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}
