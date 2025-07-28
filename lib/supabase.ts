import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Validate environment variables
if (!supabaseUrl) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
}

if (!supabaseAnonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,         // 🔑 critical
    autoRefreshToken: true,       // 🌀 for refresh
    detectSessionInUrl: true,     // ✅ for OAuth flows
    storage: typeof localStorage !== 'undefined' ? localStorage : undefined  }
});

// Discord OAuth configuration
export const discordAuthConfig = {
  clientId: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || '1397282925849874492',
  redirectTo: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/callback`,
  scopes: 'identify email'
}

// Database types - Updated to remove old social media fields from users table
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          username: string | null
          avatar_url: string | null
          total_xp: number
          level: number
          bio: string | null
          social_links: any | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          total_xp?: number
          level?: number
          bio?: string | null
          social_links?: any | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          total_xp?: number
          level?: number
          bio?: string | null
          social_links?: any | null
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          category: string | null
          website_url: string | null
          contract_address: string | null
          blockchain_network: string | null
          twitter_url: string | null
          discord_url: string | null
          telegram_url: string | null
          github_url: string | null
          medium_url: string | null
          logo_url: string | null
          cover_image_url: string | null
          additional_info: string | null
          owner_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          category?: string | null
          website_url?: string | null
          contract_address?: string | null
          blockchain_network?: string | null
          twitter_url?: string | null
          discord_url?: string | null
          telegram_url?: string | null
          github_url?: string | null
          medium_url?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          additional_info?: string | null
          owner_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          category?: string | null
          website_url?: string | null
          contract_address?: string | null
          blockchain_network?: string | null
          twitter_url?: string | null
          discord_url?: string | null
          telegram_url?: string | null
          github_url?: string | null
          medium_url?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          additional_info?: string | null
          owner_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      quests: {
        Row: {
          id: string
          title: string
          description: string | null
          category: string | null
          difficulty: string | null
          xp_reward: number
          total_xp: number
          status: string
          project_id: string | null
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          category?: string | null
          difficulty?: string | null
          xp_reward?: number
          total_xp?: number
          status?: string
          project_id?: string | null
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          category?: string | null
          difficulty?: string | null
          xp_reward?: number
          total_xp?: number
          status?: string
          project_id?: string | null
          created_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          quest_id: string | null
          type: string
          title: string
          description: string | null
          xp_reward: number
          status: string
          // Additional fields for different task types
          social_platform?: string | null
          social_action?: string | null
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
          learn_questions?: any
          learn_passing_score?: number | null
          // New quiz fields
          quiz_question?: string | null
          quiz_answer_1?: string | null
          quiz_answer_2?: string | null
          quiz_answer_3?: string | null
          quiz_answer_4?: string | null
          quiz_correct_answer?: number | null
          quiz_is_multi_select?: boolean | null
          order_index?: number | null
          required?: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          quest_id?: string | null
          type: string
          title: string
          description?: string | null
          xp_reward?: number
          status?: string
          // Additional fields for different task types
          social_platform?: string | null
          social_action?: string | null
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
          learn_questions?: any
          learn_passing_score?: number | null
          order_index?: number | null
          required?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          quest_id?: string | null
          type?: string
          title?: string
          description?: string | null
          xp_reward?: number
          status?: string
          // Additional fields for different task types
          social_platform?: string | null
          social_action?: string | null
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
          learn_questions?: any
          learn_passing_score?: number | null
          order_index?: number | null
          required?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      user_task_submissions: {
        Row: {
          id: string
          user_id: string
          task_id: string
          quest_id: string
          status: string
          submission_data: any | null
          verification_data: any | null
          xp_earned: number
          xp_removed: number | null
          xp_removal_reason: string | null
          verified_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          task_id: string
          quest_id: string
          status?: string
          submission_data?: any | null
          verification_data?: any | null
          xp_earned?: number
          xp_removed?: number | null
          xp_removal_reason?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          task_id?: string
          quest_id?: string
          status?: string
          submission_data?: any | null
          verification_data?: any | null
          xp_earned?: number
          xp_removed?: number | null
          xp_removal_reason?: string | null
          verified_at?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_members: {
        Row: {
          id: string
          project_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          user_id: string
          role?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: string
          account_id: string
          username: string
          access_token: string
          access_token_secret: string | null
          refresh_token: string | null
          expires_at: string | null
          display_name: string | null
          platform_user_id: string | null
          platform_username: string | null
          profile_data: any | null
          verified: boolean
          // New platform-specific fields
          wallet_address: string | null
          wallet_network: string | null
          x_account_id: string | null
          x_username: string | null
          x_access_token: string | null
          x_access_token_secret: string | null
          discord_account_id: string | null
          discord_username: string | null
          discord_access_token: string | null
          discord_refresh_token: string | null
          telegram_account_id: string | null
          telegram_username: string | null
          telegram_access_token: string | null
          telegram_refresh_token: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          account_id: string
          username: string
          access_token: string
          access_token_secret?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          profile_data?: any | null
          verified?: boolean
          // New platform-specific fields
          wallet_address?: string | null
          wallet_network?: string | null
          x_account_id?: string | null
          x_username?: string | null
          x_access_token?: string | null
          x_access_token_secret?: string | null
          discord_account_id?: string | null
          discord_username?: string | null
          discord_access_token?: string | null
          discord_refresh_token?: string | null
          telegram_account_id?: string | null
          telegram_username?: string | null
          telegram_access_token?: string | null
          telegram_refresh_token?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          account_id?: string
          username?: string
          access_token?: string
          access_token_secret?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          display_name?: string | null
          platform_user_id?: string | null
          platform_username?: string | null
          profile_data?: any | null
          verified?: boolean
          // New platform-specific fields
          wallet_address?: string | null
          wallet_network?: string | null
          x_account_id?: string | null
          x_username?: string | null
          x_access_token?: string | null
          x_access_token_secret?: string | null
          discord_account_id?: string | null
          discord_username?: string | null
          discord_access_token?: string | null
          discord_refresh_token?: string | null
          telegram_account_id?: string | null
          telegram_username?: string | null
          telegram_access_token?: string | null
          telegram_refresh_token?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      oauth_states: {
        Row: {
          id: string
          user_id: string
          platform: string
          state: string
          code_verifier: string | null
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          state: string
          code_verifier?: string | null
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          state?: string
          code_verifier?: string | null
          expires_at?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
