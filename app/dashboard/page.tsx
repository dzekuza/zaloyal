"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import DashboardClient from "@/components/DashboardClient";

export default function DashboardPage() {
  // Fix useState types
  const [profile, setProfile] = useState<any>(null);
  const [activeQuests, setActiveQuests] = useState<any[]>([]);
  const [completedQuests, setCompletedQuests] = useState<any[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { user } } = await supabase.auth.getUser();
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
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900"><p className="text-white text-xl">Loading your dashboard...</p></div>;
  }
  if (!profile) {
    return <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900"><p className="text-white text-xl">Please sign in to view your dashboard.</p></div>;
  }
  return (
    <DashboardClient
      profile={profile}
      activeQuests={activeQuests}
      completedQuests={completedQuests}
      badges={badges}
      achievements={achievements}
    />
  );
}
