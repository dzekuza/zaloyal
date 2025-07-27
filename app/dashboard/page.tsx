"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";
import AuthRequired from "@/components/auth-required";
import PageContainer from "@/components/PageContainer";
import { useAuth } from "@/components/auth-provider-wrapper";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth()
  // Fix useState types
  const [profile, setProfile] = useState<any>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await supabase.from("users").select("*", { count: "exact" }).eq("id", user.id).single();
      const { data: activeQuests } = await supabase
        .from("user_quest_progress")
        .select(`*, quests:quest_id(*), total_xp_earned, completion_percentage`)
        .eq("user_id", user.id)
        .eq("status", "active");
      const { data: completedQuests } = await supabase
        .from("user_quest_progress")
        .select(`*, quests:quest_id(*), total_xp_earned, completed_at, completion_percentage`)
        .eq("user_id", user.id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      const { data: badges } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", user.id)
        .order("earned_at", { ascending: false });
      setProfile(profile);
      setActiveQuests(activeQuests || []);
      setCompletedQuests(completedQuests || []);
      setBadges(badges || []);
      setAchievements(badges || []);
      setLoading(false);
    }
    fetchData();
  }, [user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <p className="text-white text-xl">Loading your dashboard...</p>
      </div>
    );
  }
  if (!user || !profile) {
    return (
      <AuthRequired 
        title="Sign In Required"
        message="Please sign in with your email or wallet to view your dashboard."
        onAuthClick={() => window.dispatchEvent(new CustomEvent('open-auth-dialog'))}
      />
    );
  }
  return (
    <PageContainer>
      <DashboardClient
        profile={profile}
        activeQuests={activeQuests}
        completedQuests={completedQuests}
        badges={badges}
        achievements={achievements}
      />
    </PageContainer>
  );
}
