import QuestDetailClient from "./QuestDetailClient"
import { supabase } from "@/lib/supabase"
import BackgroundWrapper from "@/components/BackgroundWrapper";

export default async function QuestDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams?: Promise<any>
}) {
  const { id: questId } = await params
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
  return (
    <BackgroundWrapper>
      <QuestDetailClient quest={quest} tasks={tasks || []} />
    </BackgroundWrapper>
  )
}
