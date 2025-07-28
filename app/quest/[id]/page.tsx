import QuestDetailClient from "./QuestDetailClient"
import { supabaseAdmin } from "@/lib/supabase-admin"

export default async function QuestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<any>
}) {
  const { id: questId } = await params
  
  // Fetch quest and related data
  const { data: quest, error: questError } = await supabaseAdmin
    .from("quests")
    .select(`*, projects(owner_id, name, logo_url)`)
    .eq("id", questId)
    .single()
  
  // Handle quest not found
  if (questError || !quest) {
    console.error("Quest not found or error:", questError)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Quest Not Found</h1>
          <p className="text-gray-300 mb-6">The quest you're looking for doesn't exist or has been removed.</p>
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
  
  // Fetch tasks for the quest
  const { data: tasks, error: tasksError } = await supabaseAdmin
    .from("tasks")
    .select("*")
    .eq("quest_id", questId)
    .order("created_at", { ascending: true })
  
  if (tasksError) {
    console.error("Error fetching tasks:", tasksError)
  }
  
  // Calculate participant count by counting unique users who have submitted tasks
  let participantCount = 0
  try {
    const { data: submissions, error: submissionsError } = await supabaseAdmin
      .from("user_task_submissions")
      .select("user_id")
      .eq("quest_id", questId)
      .eq("status", "verified")
    
    if (!submissionsError && submissions) {
      // Count unique users
      const uniqueUsers = new Set(submissions.map(s => s.user_id))
      participantCount = uniqueUsers.size
    }
  } catch (error) {
    console.error("Error calculating participant count:", error)
  }
  
  // Add participant count to quest data
  const questWithParticipants = {
    ...quest,
    participant_count: participantCount
  }
  
  // Debug logging
  console.log("Server-side tasks fetch:")
  console.log("Quest ID:", questId)
  console.log("Tasks found:", tasks?.length || 0)
  console.log("Tasks data:", tasks)
  console.log("Tasks error:", tasksError)
  console.log("Participant count:", participantCount)
  
  // Do NOT fetch user on the server; let the client handle user/session
  return (
    <QuestDetailClient quest={questWithParticipants} tasks={tasks || []} />
  )
}
