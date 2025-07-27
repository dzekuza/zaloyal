import QuestDetailClient from "./QuestDetailClient"
import { supabaseAdmin } from "@/lib/supabase-admin"


// Server action to update tasks with social URLs
async function updateTasksWithSocialUrls(questId: string, projectOwnerId: string) {
  try {
    // Get social accounts for the project owner
    const { data: socialAccounts, error: socialError } = await supabaseAdmin
      .from('social_accounts')
      .select('username, account_id, platform')
      .eq('user_id', projectOwnerId)

    if (socialError || !socialAccounts) {
      console.error('Error fetching social accounts:', socialError)
      return
    }

    // Create a map of platform to social account
    const socialAccountMap = socialAccounts.reduce((acc, account) => {
      acc[account.platform] = account
      return acc
    }, {} as Record<string, any>)

    // Get tasks that need updating
    const { data: tasks, error: tasksError } = await supabaseAdmin
      .from('tasks')
      .select('id, social_action, social_platform, social_url')
      .eq('quest_id', questId)
      .eq('type', 'social')
      .eq('social_action', 'follow')

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError)
      return
    }

    // Update tasks that need social URLs
    for (const task of tasks) {
      if (!task.social_url && task.social_platform) {
        const socialAccount = socialAccountMap[task.social_platform]
        if (socialAccount && socialAccount.username) {
          let socialUrl = ''
          switch (task.social_platform) {
            case 'x':
              socialUrl = `https://x.com/${socialAccount.username}`
              break
            case 'discord':
              socialUrl = `https://discord.com/users/${socialAccount.account_id}`
              break
            case 'telegram':
              socialUrl = `https://t.me/${socialAccount.username}`
              break
          }

          // Only update if we have a valid URL
          if (socialUrl) {
            // Update the task
            const { error: updateError } = await supabaseAdmin
              .from('tasks')
              .update({ 
                social_url: socialUrl,
                social_username: socialAccount.username 
              })
              .eq('id', task.id)

            if (updateError) {
              console.error('Error updating task:', updateError)
            }
          }
        }
      }
    }
  } catch (error) {
    console.error('Error updating tasks with social URLs:', error)
  }
}

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
  
  // Debug logging
  console.log("Server-side tasks fetch:")
  console.log("Quest ID:", questId)
  console.log("Tasks found:", tasks?.length || 0)
  console.log("Tasks data:", tasks)
  console.log("Tasks error:", tasksError)
  
  // Update tasks with social URLs if needed
  if (quest.projects?.owner_id) {
    await updateTasksWithSocialUrls(questId, quest.projects.owner_id)
  }
  
  // Do NOT fetch user on the server; let the client handle user/session
  return (
    <QuestDetailClient quest={quest} tasks={tasks || []} />
  )
}
