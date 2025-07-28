import { supabase } from "@/lib/supabase"
import ProjectDiscoveryClient from "@/components/ProjectDiscoveryClient";
import PageContainer from "@/components/PageContainer";
import ErrorBoundary from "@/components/ErrorBoundary";
import { cache } from "react"

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

// Cache the database queries with cache busting
const getProjects = cache(async () => {
  console.log("🔍 Fetching projects from database...");
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, total_participants')
      .eq("status", "approved")
      .order("created_at", { ascending: false })
    
    if (error) {
      console.error("❌ Error fetching projects:", error);
      throw error;
    }
    
    console.log(`✅ Found ${projects?.length || 0} approved projects`);
    return projects || [];
  } catch (error) {
    console.error("❌ Error in getProjects:", error);
    return [];
  }
})

const getQuests = cache(async (projectIds: string[]) => {
  if (projectIds.length === 0) {
    console.log("📋 No project IDs provided for quests query");
    return {};
  }
  
  console.log(`🔍 Fetching quests for ${projectIds.length} projects...`);
  try {
    const { data: quests, error } = await supabase
      .from("quests")
      .select("id, project_id, total_xp")
      .in("project_id", projectIds)
      .eq("status", "active")
    
    if (error) {
      console.error("❌ Error fetching quests:", error);
      throw error;
    }
    
    console.log(`✅ Found ${quests?.length || 0} active quests`);
    
    const result = (quests || []).reduce((acc: Record<string, any[]>, q) => {
      acc[q.project_id] = acc[q.project_id] || []
      acc[q.project_id].push(q)
      return acc
    }, {} as Record<string, any[]>)
    
    return result;
  } catch (error) {
    console.error("❌ Error in getQuests:", error);
    return {};
  }
})

// Server component
export default async function ProjectDiscovery() {
  try {
    console.log("🚀 Starting ProjectDiscovery component...");
    
    // Fetch projects with basic info
    const projects = await getProjects()

    // Fetch quests for all projects in one query
    const projectIds = (projects || []).map(p => p.id)
    console.log(`📋 Project IDs for quests query:`, projectIds);
    const questsByProject = await getQuests(projectIds)

    // Process the data to calculate stats
    const processedProjects: Project[] = (projects || []).map(project => {
      const quests = (questsByProject as Record<string, any[]>)[project.id] || []
      const xpToCollect = quests.reduce((sum: number, q: { total_xp: number }) => sum + (q.total_xp || 0), 0)

      const processedProject = {
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
      
      console.log(`📊 Processed project: ${processedProject.name} (${quests.length} quests, ${xpToCollect} XP)`);
      return processedProject;
    })

    console.log("📋 Final processed projects:", processedProjects);

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
      <PageContainer>
        <ErrorBoundary>
          <ProjectDiscoveryClient projects={processedProjects} categories={categories} />
        </ErrorBoundary>
      </PageContainer>
    )
  } catch (error) {
    console.error("❌ Error in ProjectDiscovery:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <p className="text-white text-xl">Error loading projects.</p>
      </div>
    )
  }
}

/* ------------------------------------------------------------------ */
/*  utility                                                            */
/* ------------------------------------------------------------------ */
function getAbsoluteUrl(url: string) {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}
