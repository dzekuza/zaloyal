import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          wallet_address: string
          username: string | null
          email: string | null
          avatar_url: string | null
          role: "participant" | "creator" | "admin"
          total_xp: number
          level: number
          rank: number | null
          completed_quests: number
          bio: string | null
          social_links: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          wallet_address: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: "participant" | "creator" | "admin"
          total_xp?: number
          level?: number
          rank?: number | null
          completed_quests?: number
          bio?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          wallet_address?: string
          username?: string | null
          email?: string | null
          avatar_url?: string | null
          role?: "participant" | "creator" | "admin"
          total_xp?: number
          level?: number
          rank?: number | null
          completed_quests?: number
          bio?: string | null
          social_links?: any
          created_at?: string
          updated_at?: string
        }
      }
      quests: {
        Row: {
          id: string
          title: string
          description: string
          creator_id: string
          category_id: string | null
          image_url: string | null
          total_xp: number
          participant_count: number
          status: "draft" | "active" | "completed" | "paused"
          featured: boolean
          trending: boolean
          time_limit_days: number | null
          start_date: string | null
          end_date: string | null
          requirements: any
          rewards: any
          metadata: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description: string
          creator_id: string
          category_id?: string | null
          image_url?: string | null
          total_xp?: number
          participant_count?: number
          status?: "draft" | "active" | "completed" | "paused"
          featured?: boolean
          trending?: boolean
          time_limit_days?: number | null
          start_date?: string | null
          end_date?: string | null
          requirements?: any
          rewards?: any
          metadata?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string
          creator_id?: string
          category_id?: string | null
          image_url?: string | null
          total_xp?: number
          participant_count?: number
          status?: "draft" | "active" | "completed" | "paused"
          featured?: boolean
          trending?: boolean
          time_limit_days?: number | null
          start_date?: string | null
          end_date?: string | null
          requirements?: any
          rewards?: any
          metadata?: any
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          quest_id: string
          title: string
          description: string
          task_type: "social" | "download" | "form" | "visit" | "learn"
          xp_reward: number
          order_index: number
          required: boolean
          social_action: "follow" | "join" | "like" | "retweet" | "subscribe" | null
          social_platform: string | null
          social_url: string | null
          social_username: string | null
          social_post_id: string | null
          download_url: string | null
          download_title: string | null
          download_description: string | null
          form_url: string | null
          form_title: string | null
          form_description: string | null
          visit_url: string | null
          visit_title: string | null
          visit_description: string | null
          visit_duration_seconds: number | null
          learn_content: string | null
          learn_questions: any | null
          learn_passing_score: number | null
          auto_verify: boolean
          verification_method: string | null
          verification_params: any
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quest_id: string
          title: string
          description: string
          task_type: "social" | "download" | "form" | "visit" | "learn"
          xp_reward?: number
          order_index?: number
          required?: boolean
          social_action?: "follow" | "join" | "like" | "retweet" | "subscribe" | null
          social_platform?: string | null
          social_url?: string | null
          social_username?: string | null
          social_post_id?: string | null
          download_url?: string | null
          download_title?: string | null
          download_description?: string | null
          form_url?: string | null
          form_title?: string | null
          form_description?: string | null
          visit_url?: string | null
          visit_title?: string | null
          visit_description?: string | null
          visit_duration_seconds?: number | null
          learn_content?: string | null
          learn_questions?: any | null
          learn_passing_score?: number | null
          auto_verify?: boolean
          verification_method?: string | null
          verification_params?: any
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quest_id?: string
          title?: string
          description?: string
          task_type?: "social" | "download" | "form" | "visit" | "learn"
          xp_reward?: number
          order_index?: number
          required?: boolean
          social_action?: "follow" | "join" | "like" | "retweet" | "subscribe" | null
          social_platform?: string | null
          social_url?: string | null
          social_username?: string | null
          social_post_id?: string | null
          download_url?: string | null
          download_title?: string | null
          download_description?: string | null
          form_url?: string | null
          form_title?: string | null
          form_description?: string | null
          visit_url?: string | null
          visit_title?: string | null
          visit_description?: string | null
          visit_duration_seconds?: number | null
          learn_content?: string | null
          learn_questions?: any | null
          learn_passing_score?: number | null
          auto_verify?: boolean
          verification_method?: string | null
          verification_params?: any
          created_at?: string
          updated_at?: string
        }
      }
      quest_categories: {
        Row: {
          id: string
          name: string
          description: string | null
          icon: string | null
          color: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
        }
      }
      user_task_submissions: {
        Row: {
          id: string
          user_id: string
          task_id: string
          quest_id: string
          status: "pending" | "completed" | "verified" | "rejected"
          submission_data: any
          verification_data: any
          xp_earned: number
          submitted_at: string
          verified_at: string | null
          verifier_notes: string | null
          verified: boolean
          social_username: string | null
          social_post_url: string | null
          quiz_answers: any | null
          manual_verification_note: string | null
          xp_removed: boolean
          xp_removal_reason: string | null
          xp_removed_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          quest_id: string
          status?: "pending" | "completed" | "verified" | "rejected"
          submission_data?: any
          verification_data?: any
          xp_earned?: number
          submitted_at?: string
          verified_at?: string | null
          verifier_notes?: string | null
          verified?: boolean
          social_username?: string | null
          social_post_url?: string | null
          quiz_answers?: any | null
          manual_verification_note?: string | null
          xp_removed?: boolean
          xp_removal_reason?: string | null
          xp_removed_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          quest_id?: string
          status?: "pending" | "completed" | "verified" | "rejected"
          submission_data?: any
          verification_data?: any
          xp_earned?: number
          submitted_at?: string
          verified_at?: string | null
          verifier_notes?: string | null
          verified?: boolean
          social_username?: string | null
          social_post_url?: string | null
          quiz_answers?: any | null
          manual_verification_note?: string | null
          xp_removed?: boolean
          xp_removal_reason?: string | null
          xp_removed_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
