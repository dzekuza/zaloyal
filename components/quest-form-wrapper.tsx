"use client"

import EditQuestForm from "@/components/edit-quest-form"

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
  image_url?: string | null;
}

interface QuestFormWrapperProps {
  quest?: Quest;
  projectId: string;
}

export default function QuestFormWrapper({ quest, projectId }: QuestFormWrapperProps) {
  if (!quest) {
    // Create new quest
    const newQuest = {
      id: 'new',
      project_id: projectId,
      title: '',
      description: '',
      total_xp: 0,
      status: 'active',
      image_url: ''
    }
    return <EditQuestForm quest={newQuest} />
  }
  
  return <EditQuestForm quest={quest} />
} 