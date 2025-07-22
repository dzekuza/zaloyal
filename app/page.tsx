import { supabase } from "@/lib/supabase"
import ProjectDiscoveryClient from "@/components/ProjectDiscoveryClient";
import { cache } from "react"
import PageContainer from "@/components/PageContainer";

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

// Cache the database queries
const getProjects = cache(async () => {
  const { data: projects, error } = await supabase
    .from("projects")
    .select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, total_participants')
    .eq("status", "approved")
    .order("created_at", { ascending: false })
  
  if (error) throw error
  return projects
})

const getQuests = cache(async (projectIds: string[]) => {
  if (projectIds.length === 0) return {}
  
  const { data: quests, error } = await supabase
    .from("quests")
    .select("id, project_id, total_xp")
    .in("project_id", projectIds)
    .eq("status", "active")
  
  if (error) throw error
  
  return (quests || []).reduce((acc, q) => {
    acc[q.project_id] = acc[q.project_id] || []
    acc[q.project_id].push(q)
    return acc
  }, {} as Record<string, { total_xp: number }[]>)
})

// Server component
export default async function ProjectDiscovery() {
  try {
    // Fetch projects with basic info
    const projects = await getProjects()

    // Fetch quests for all projects in one query
    const projectIds = (projects || []).map(p => p.id)
    const questsByProject = await getQuests(projectIds)

    // Process the data to calculate stats
    const processedProjects: Project[] = (projects || []).map(project => {
      const quests = questsByProject[project.id] || []
      const xpToCollect = quests.reduce((sum: number, q: { total_xp: number }) => sum + (q.total_xp || 0), 0)

      return {
        id: project.id,
        owner_id: project.owner_id,
        name: project.name,
        logo_url: project.logo_url,
        cover_image_url: project.cover_image_url,
        category: project.category,
        status: project.status,
        featured: project.featured,
        total_participants: project.total_participants || 0,
        xpToCollect,
        quest_count: quests.length,
      }
    })

    console.log("projectsWithStats:", processedProjects)

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

    return (
      <>
        {/* Header - no padding */}
        <header className="relative overflow-hidden">
          {/* ... header content here if any ... */}
        </header>
        {/* Main content with padding */}
        <PageContainer className="px-4 py-8">
          <ProjectDiscoveryClient projects={processedProjects} categories={categories} />
        </PageContainer>
      </>
    )
  } catch (error) {
    console.error("Error fetching projects:", error);
    return <PageContainer>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900"><p className="text-white text-xl">Error loading projects.</p></div>
    </PageContainer>
  }
}

/* ------------------------------------------------------------------ */
/*  utility                                                            */
/* ------------------------------------------------------------------ */
function getAbsoluteUrl(url: string) {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}
