import QuestDetailClient from "./QuestDetailClient"
import { supabase } from "@/lib/supabase"

export default async function QuestDetail({ params }: { params: { id: string } }) {
  const questId = params.id
  // Fetch quest and related data
  const { data: quest } = await supabase
    .from("quests")
    .select(`*, quest_categories(*), users(*)`)
    .eq("id", questId)
    .single()
  // Fetch tasks for the quest
  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("quest_id", questId)
    .order("order_index")
  // Do NOT fetch user on the server; let the client handle user/session
  return <QuestDetailClient quest={quest} tasks={tasks || []} />
}
