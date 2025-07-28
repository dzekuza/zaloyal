import { cache } from "react"
import { supabase } from "@/lib/supabase"
import ProjectDetailClient from "./ProjectDetailClient"

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
  // Removed image_url as it doesn't exist in the database
}

// Cache the database queries
const getProject = cache(async (projectId: string) => {
  const { data: project, error } = await supabase
    .from("projects")
    .select('id, owner_id, name, description, logo_url, cover_image_url, category, status, featured, verified, website_url, discord_url, github_url, telegram_url, medium_url, total_participants')
    .eq("id", projectId)
    .single()
  
  if (error) throw error
  return project as Project
})

const getQuests = cache(async (projectId: string) => {
  const { data: quests, error } = await supabase
    .from("quests")
    .select('id, project_id, title, description, total_xp, status, created_at, time_limit_days')
    .eq("project_id", projectId)
  
  if (error) throw error
  return (quests || []) as Quest[]
})

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    
    console.log('DEBUG: Loading project details for ID:', projectId)
    
    // Fetch project and quests in parallel
    const [project, quests] = await Promise.all([
      getProject(projectId),
      getQuests(projectId)
    ])

    console.log('DEBUG: Project loaded successfully:', project?.name)
    console.log('DEBUG: Quests loaded successfully:', quests?.length || 0, 'quests')

    return <ProjectDetailClient project={project} quests={quests} />
  } catch (error: any) {
    console.error("Error loading project:", {
      error: error,
      code: error?.code,
      message: error?.message,
      details: error?.details,
      hint: error?.hint
    })
    
    // Provide more specific error messages
    let errorMessage = "The project you're looking for doesn't exist or has been removed."
    if (error?.code === 'PGRST116') {
      errorMessage = "Project not found. Please check the URL and try again."
    } else if (error?.code === '42703') {
      errorMessage = "Database schema issue. Please contact support."
    }
    
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-300 mb-6">{errorMessage}</p>
          <a 
            href="/project" 
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Browse All Projects
          </a>
        </div>
      </div>
    )
  }
}
