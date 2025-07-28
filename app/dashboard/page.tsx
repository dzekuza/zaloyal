"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";
import AuthWrapper from "@/components/auth-wrapper";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/components/auth-provider-wrapper";

function DashboardContent() {
  const { user, loading: authLoading } = useAuth()
  const [profile, setProfile] = useState<any>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      try {
        const { data: profile } = await supabase.from("users").select("*", { count: "exact" }).eq("id", user.id).single();
        
        // Calculate total XP from verified task submissions
        const { data: verifiedSubmissions } = await supabase
          .from("user_task_submissions")
          .select("tasks(xp_reward)")
          .eq("user_id", user.id)
          .eq("status", "verified");
        
        // Calculate total XP earned
        const totalXpEarned = verifiedSubmissions?.reduce((sum: number, submission: any) => {
          return sum + (submission.tasks?.xp_reward || 0);
        }, 0) || 0;
        
        // Update profile with calculated total XP
        const updatedProfile = {
          ...profile,
          total_xp: totalXpEarned
        };
        
        const { data: activeQuests } = await supabase
          .from("user_quest_progress")
          .select(`*, quests:quest_id(*), total_xp_earned, completion_percentage`)
          .eq("user_id", user.id)
          .eq("status", "active");
        // Fetch completed quests
        const { data: completedQuests } = await supabase
          .from("user_quest_progress")
          .select(`*, quests:quest_id(*), total_xp_earned, completed_at, completion_percentage`)
          .eq("user_id", user.id)
          .eq("status", "completed")
          .order("completed_at", { ascending: false });
        
        // Fetch completed tasks with quest and project details
        const { data: completedTasks } = await supabase
          .from("user_task_submissions")
          .select(`
            *,
            tasks:task_id(
              *,
              quests:quest_id(
                *,
                projects:project_id(
                  id,
                  name,
                  logo_url
                )
              )
            )
          `)
          .eq("user_id", user.id)
          .eq("status", "verified")
          .order("created_at", { ascending: false });
        const { data: badges } = await supabase
          .from("user_badges")
          .select("*")
          .eq("user_id", user.id)
          .order("earned_at", { ascending: false });
        
        setProfile(updatedProfile);
        setActiveQuests(activeQuests || []);
        setCompletedQuests(completedQuests || []);
        setCompletedTasks(completedTasks || []);
        setBadges(badges || []);
        setAchievements(badges || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    
    if (user && !authLoading) {
      fetchData();
    }
  }, [user, authLoading]);

  // Show loading while auth is being checked or data is being fetched
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <p className="text-white text-xl">Loading your dashboard...</p>
      </div>
    );
  }

  // Only show "Profile not found" if auth is complete and user exists but no profile
  if (user && !authLoading && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <p className="text-white text-xl">Profile not found...</p>
      </div>
    );
  }

  return (
    <PageContainer>
      <DashboardClient
        profile={profile}
        activeQuests={activeQuests}
        completedQuests={completedQuests}
        completedTasks={completedTasks}
        badges={badges}
        achievements={achievements}
      />
    </PageContainer>
  );
}

export default function DashboardPage() {
  return (
    <AuthWrapper
      requireAuth={true}
      title="Sign In Required"
      message="Please sign in with your email or wallet to view your dashboard."
      onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
    >
      <DashboardContent />
    </AuthWrapper>
  );
}
