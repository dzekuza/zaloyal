import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types - Updated to include missing fields being added
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string | null
          username: string | null
          avatar_url: string | null
          wallet_address: string | null
          total_xp: number
          level: number
          // Social media fields (being added)
          discord_id: string | null
          discord_username: string | null
          discord_avatar_url: string | null
          telegram_id: string | null
          telegram_username: string | null
          telegram_avatar_url: string | null
          twitter_username: string | null
          twitter_id: string | null
          twitter_avatar_url: string | null
          x_username: string | null
          x_id: string | null
          x_avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          wallet_address?: string | null
          total_xp?: number
          level?: number
          // Social media fields (being added)
          discord_id?: string | null
          discord_username?: string | null
          discord_avatar_url?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          telegram_avatar_url?: string | null
          twitter_username?: string | null
          twitter_id?: string | null
          twitter_avatar_url?: string | null
          x_username?: string | null
          x_id?: string | null
          x_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          avatar_url?: string | null
          wallet_address?: string | null
          total_xp?: number
          level?: number
          // Social media fields (being added)
          discord_id?: string | null
          discord_username?: string | null
          discord_avatar_url?: string | null
          telegram_id?: string | null
          telegram_username?: string | null
          telegram_avatar_url?: string | null
          twitter_username?: string | null
          twitter_id?: string | null
          twitter_avatar_url?: string | null
          x_username?: string | null
          x_id?: string | null
          x_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quests: {
        Row: {
          id: string
          title: string
          description: string | null
          project_id: string
          total_xp: number
          status: string
          time_limit_days: number | null
          max_participants: number | null
          is_featured: boolean | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          project_id: string
          total_xp?: number
          status?: string
          time_limit_days?: number | null
          max_participants?: number | null
          is_featured?: boolean | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          project_id?: string
          total_xp?: number
          status?: string
          time_limit_days?: number | null
          max_participants?: number | null
          is_featured?: boolean | null
          created_at?: string
          updated_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          title: string
          description: string | null
          quest_id: string
          xp_reward: number
          status: string
          // Missing fields being added
          task_type: string
          social_action: string | null
          social_url: string | null
          social_post_id: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          quest_id: string
          xp_reward?: number
          status?: string
          // Missing fields being added
          task_type?: string
          social_action?: string | null
          social_url?: string | null
          social_post_id?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          quest_id?: string
          xp_reward?: number
          status?: string
          // Missing fields being added
          task_type?: string
          social_action?: string | null
          social_url?: string | null
          social_post_id?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
      projects: {
        Row: {
          id: string
          owner_id: string
          name: string
          description: string | null
          website_url: string | null
          logo_url: string | null
          cover_image_url: string | null
          contract_address: string | null
          blockchain_network: string | null
          twitter_url: string | null
          discord_url: string | null
          telegram_url: string | null
          github_url: string | null
          medium_url: string | null
          total_quests: number
          total_participants: number
          total_xp_distributed: number
          status: string
          verified: boolean
          featured: boolean
          tags: string[] | null
          category: string | null
          founded_date: string | null
          team_size: number | null
          x_username: string | null
          x_id: string | null
          x_avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          owner_id: string
          name: string
          description?: string | null
          website_url?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          contract_address?: string | null
          blockchain_network?: string | null
          twitter_url?: string | null
          discord_url?: string | null
          telegram_url?: string | null
          github_url?: string | null
          medium_url?: string | null
          total_quests?: number
          total_participants?: number
          total_xp_distributed?: number
          status?: string
          verified?: boolean
          featured?: boolean
          tags?: string[] | null
          category?: string | null
          founded_date?: string | null
          team_size?: number | null
          x_username?: string | null
          x_id?: string | null
          x_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          owner_id?: string
          name?: string
          description?: string | null
          website_url?: string | null
          logo_url?: string | null
          cover_image_url?: string | null
          contract_address?: string | null
          blockchain_network?: string | null
          twitter_url?: string | null
          discord_url?: string | null
          telegram_url?: string | null
          github_url?: string | null
          medium_url?: string | null
          total_quests?: number
          total_participants?: number
          total_xp_distributed?: number
          status?: string
          verified?: boolean
          featured?: boolean
          tags?: string[] | null
          category?: string | null
          founded_date?: string | null
          team_size?: number | null
          x_username?: string | null
          x_id?: string | null
          x_avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      social_accounts: {
        Row: {
          id: string
          user_id: string
          platform: string
          access_token: string
          access_token_secret: string | null
          refresh_token: string | null
          expires_at: string | null
          username: string | null
          // Missing fields being added
          platform_user_id: string | null
          platform_username: string | null
          profile_data: any | null
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          platform: string
          access_token: string
          access_token_secret?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          username?: string | null
          // Missing fields being added
          platform_user_id?: string | null
          platform_username?: string | null
          profile_data?: any | null
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          platform?: string
          access_token?: string
          access_token_secret?: string | null
          refresh_token?: string | null
          expires_at?: string | null
          username?: string | null
          // Missing fields being added
          platform_user_id?: string | null
          platform_username?: string | null
          profile_data?: any | null
          verified?: boolean
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
      user_task_submissions: {
        Row: {
          id: string
          user_id: string
          quest_id: string
          status: string
          verified: boolean
          submitted_at: string
          verified_at: string | null
          verification_data: any | null
          // Missing fields being added
          task_id: string | null
          xp_awarded: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          quest_id: string
          status?: string
          verified?: boolean
          submitted_at?: string
          verified_at?: string | null
          verification_data?: any | null
          // Missing fields being added
          task_id?: string | null
          xp_awarded?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          quest_id?: string
          status?: string
          verified?: boolean
          submitted_at?: string
          verified_at?: string | null
          verification_data?: any | null
          // Missing fields being added
          task_id?: string | null
          xp_awarded?: number
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
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          icon?: string | null
          color?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
