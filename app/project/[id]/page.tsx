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
  participant_count?: number;
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
  
  // Calculate participant count for each quest
  const questsWithParticipants = await Promise.all(
    (quests || []).map(async (quest) => {
      try {
        const { data: submissions, error: submissionsError } = await supabase
          .from("user_task_submissions")
          .select("user_id")
          .eq("quest_id", quest.id)
          .eq("status", "verified")
        
        if (submissionsError || !submissions) {
          return { ...quest, participants: 0, participant_count: 0 }
        }
        
        // Count unique users
        const uniqueUsers = new Set(submissions.map(s => s.user_id))
        const participantCount = uniqueUsers.size
        
        return { 
          ...quest, 
          participants: participantCount,
          participant_count: participantCount 
        }
      } catch (error) {
        console.error("Error calculating quest participants:", error)
        return { ...quest, participants: 0, participant_count: 0 }
      }
    })
  )
  
  return questsWithParticipants as Quest[]
})

const getProjectParticipants = cache(async (projectId: string) => {
  try {
    // Get all quest IDs for this project
    const { data: quests, error: questsError } = await supabase
      .from("quests")
      .select('id')
      .eq("project_id", projectId)
    
    if (questsError || !quests) return 0
    
    const questIds = quests.map(q => q.id)
    if (questIds.length === 0) return 0
    
    // Count unique users who have submitted tasks for any quest in this project
    const { data: submissions, error: submissionsError } = await supabase
      .from("user_task_submissions")
      .select("user_id")
      .in("quest_id", questIds)
      .eq("status", "verified")
    
    if (submissionsError || !submissions) return 0
    
    // Count unique users
    const uniqueUsers = new Set(submissions.map(s => s.user_id))
    return uniqueUsers.size
  } catch (error) {
    console.error("Error calculating project participants:", error)
    return 0
  }
})

const getUserProjectXp = cache(async (projectId: string, userId?: string) => {
  if (!userId) return 0
  
  try {
    // Get all quest IDs for this project
    const { data: quests, error: questsError } = await supabase
      .from("quests")
      .select('id')
      .eq("project_id", projectId)
    
    if (questsError || !quests) return 0
    
    const questIds = quests.map(q => q.id)
    if (questIds.length === 0) return 0
    
    // Get user's verified submissions for this project's quests
    const { data: submissions, error: submissionsError } = await supabase
      .from("user_task_submissions")
      .select("xp_earned")
      .in("quest_id", questIds)
      .eq("user_id", userId)
      .eq("status", "verified")
    
    if (submissionsError || !submissions) return 0
    
    // Sum up all XP earned
    const totalXp = submissions.reduce((sum, submission) => sum + (submission.xp_earned || 0), 0)
    return totalXp
  } catch (error) {
    console.error("Error calculating user project XP:", error)
    return 0
  }
})

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: projectId } = await params
    
    console.log('DEBUG: Loading project details for ID:', projectId)
    
    // Fetch project, quests, and participant count in parallel
    const [project, quests, participantCount] = await Promise.all([
      getProject(projectId),
      getQuests(projectId),
      getProjectParticipants(projectId)
    ])

    // Add participant count to project data
    const projectWithParticipants = {
      ...project,
      total_participants: participantCount
    }

    console.log('DEBUG: Project loaded successfully:', project?.name)
    console.log('DEBUG: Quests loaded successfully:', quests?.length || 0, 'quests')
    console.log('DEBUG: Participant count:', participantCount)

    return <ProjectDetailClient project={projectWithParticipants} quests={quests} />
  } catch (error) {
    console.error('Error loading project details:', error)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Project Not Found</h1>
          <p className="text-gray-300 mb-6">The project you're looking for doesn't exist or has been removed.</p>
          <a 
            href="/" 
            className="inline-block bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Go Back Home
          </a>
        </div>
      </div>
    )
  }
}
