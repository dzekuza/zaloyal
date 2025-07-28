import { cache } from 'react'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'
import ProjectDiscoveryClient from '@/components/ProjectDiscoveryClient'
import PageContainer from '@/components/PageContainer'
import ErrorBoundary from '@/components/ErrorBoundary'

// Create admin client for server-side operations
const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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

const getProjects = cache(async () => {
  console.log("🔍 Fetching projects from database...");
  try {
    const { data: projects, error } = await supabase
      .from("projects")
      .select("*")
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

const getProjectParticipants = cache(async (projectIds: string[]) => {
  if (projectIds.length === 0) {
    console.log("📋 No project IDs provided for participants query");
    return {};
  }
  
  console.log(`🔍 Fetching participants for ${projectIds.length} projects...`);
  try {
    // Get all quest IDs for these projects
    const { data: quests, error: questsError } = await supabase
      .from("quests")
      .select("id, project_id")
      .in("project_id", projectIds)
    
    if (questsError) {
      console.error("❌ Error fetching quests for participants:", questsError);
      return {};
    }
    
    console.log(`📋 Found ${quests?.length || 0} quests for participants calculation`);
    
    const questIds = quests?.map(q => q.id) || []
    if (questIds.length === 0) {
      console.log("📋 No quests found for participants calculation");
      return {};
    }
    
    console.log(`📋 Quest IDs for participants:`, questIds);
    
    // Count unique users per project using admin client
    const { data: submissions, error: submissionsError } = await adminClient
      .from("user_task_submissions")
      .select("user_id, quest_id")
      .in("quest_id", questIds)
      .eq("status", "verified")
    
    if (submissionsError) {
      console.error("❌ Error fetching submissions for participants:", submissionsError);
      return {};
    }
    
    console.log(`📋 Found ${submissions?.length || 0} verified submissions for participants`);
    
    // Create a map of quest_id to project_id
    const questToProject = new Map(quests?.map(q => [q.id, q.project_id]) || [])
    
    // Count unique users per project
    const projectParticipants: Record<string, Set<string>> = {}
    submissions?.forEach(submission => {
      const projectId = questToProject.get(submission.quest_id)
      if (projectId) {
        if (!projectParticipants[projectId]) {
          projectParticipants[projectId] = new Set()
        }
        projectParticipants[projectId].add(submission.user_id)
      }
    })
    
    // Convert Sets to counts
    const result: Record<string, number> = {}
    Object.entries(projectParticipants).forEach(([projectId, users]) => {
      result[projectId] = users.size
    })
    
    console.log(`✅ Calculated participants for ${Object.keys(result).length} projects`);
    return result;
  } catch (error) {
    console.error("❌ Error in getProjectParticipants:", error);
    return {};
  }
})

const getUserProjectXp = cache(async (projectIds: string[], userId?: string) => {
  if (!userId || projectIds.length === 0) {
    return {};
  }
  
  console.log(`🔍 Fetching user XP for ${projectIds.length} projects...`);
  try {
    // Get all quest IDs for these projects
    const { data: quests, error: questsError } = await supabase
      .from("quests")
      .select("id, project_id")
      .in("project_id", projectIds)
    
    if (questsError) {
      console.error("❌ Error fetching quests for user XP:", questsError);
      return {};
    }
    
    const questIds = quests?.map(q => q.id) || []
    if (questIds.length === 0) {
      return {};
    }
    
    // Get user's verified submissions for these projects' quests
    const { data: submissions, error: submissionsError } = await supabase
      .from("user_task_submissions")
      .select("xp_earned, quest_id")
      .in("quest_id", questIds)
      .eq("user_id", userId)
      .eq("status", "verified")
    
    if (submissionsError) {
      console.error("❌ Error fetching submissions for user XP:", submissionsError);
      return {};
    }
    
    // Create a map of quest_id to project_id
    const questToProject = new Map(quests?.map(q => [q.id, q.project_id]) || [])
    
    // Sum XP per project
    const projectXp: Record<string, number> = {}
    submissions?.forEach(submission => {
      const projectId = questToProject.get(submission.quest_id)
      if (projectId) {
        projectXp[projectId] = (projectXp[projectId] || 0) + (submission.xp_earned || 0)
      }
    })
    
    console.log(`✅ Calculated user XP for ${Object.keys(projectXp).length} projects`);
    return projectXp;
  } catch (error) {
    console.error("❌ Error in getUserProjectXp:", error);
    return {};
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
      .select("id, project_id, title, description, total_xp")
      .in("project_id", projectIds)
      .eq("status", "active")
    
    if (error) {
      console.error("❌ Error fetching quests:", error);
      throw error;
    }
    
    console.log(`✅ Found ${quests?.length || 0} active quests`);
    console.log(`📋 Quest details:`, quests?.map(q => ({ id: q.id, project_id: q.project_id, title: q.title })));
    
    const result = (quests || []).reduce((acc: Record<string, any[]>, q) => {
      acc[q.project_id] = acc[q.project_id] || []
      acc[q.project_id].push(q)
      return acc
    }, {} as Record<string, any[]>)
    
    console.log(`📊 Quests grouped by project:`, Object.keys(result).map(projectId => ({
      projectId,
      questCount: result[projectId].length
    })));
    
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

    // Fetch participant counts for all projects
    const participantCounts = await getProjectParticipants(projectIds)

    // Process the data to calculate stats
    const processedProjects: Project[] = (projects || []).map(project => {
      const quests = (questsByProject as Record<string, any[]>)[project.id] || []
      const xpToCollect = quests.reduce((sum: number, q: { total_xp: number }) => sum + (q.total_xp || 0), 0)
      const totalParticipants = participantCounts[project.id] || 0;

      const processedProject = {
        id: project.id,
        owner_id: project.owner_id,
        name: project.name,
        logo_url: project.logo_url,
        cover_image_url: project.cover_image_url,
        category: project.category,
        status: project.status,
        featured: project.featured,
        total_participants: totalParticipants,
        xpToCollect,
        quest_count: quests.length,
      }
      
      console.log(`📊 Processed project: ${processedProject.name} (${quests.length} quests, ${xpToCollect} XP, ${totalParticipants} participants)`);
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
