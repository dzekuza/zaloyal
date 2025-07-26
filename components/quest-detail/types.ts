export type Task = {
  id: string;
  quest_id?: string;
  title: string;
  description?: string | null;
  type: string; // Changed from task_type to type
  social_platform?: string | null;
  social_action?: string | null;
  social_url?: string | null;
  social_username?: string | null;
  social_post_id?: string | null;
  download_url?: string | null;
  download_title?: string | null;
  download_description?: string | null;
  form_url?: string | null;
  form_title?: string | null;
  form_description?: string | null;
  visit_url?: string | null;
  visit_title?: string | null;
  visit_description?: string | null;
  visit_duration_seconds?: number | null;
  learn_content?: string | null;
  learn_questions?: any;
  learn_passing_score?: number | null;
  user_task_submissions?: any;
  xp_reward?: number | null;
  order_index?: number | null;
  required?: boolean | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any; // allow extra fields for forward compatibility
}; 