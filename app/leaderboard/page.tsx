"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Medal, Award, Crown } from "lucide-react";
import Link from "next/link";
import { walletAuth, type WalletUser } from "@/lib/wallet-auth";
import { supabase } from "@/lib/supabase";
import BackgroundWrapper from "@/components/BackgroundWrapper";

function getPeriodRange(period: string) {
  const now = new Date();
  let start: Date | null = null;
  switch (period) {
    case "daily":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "weekly":
      start = new Date(now);
      start.setDate(now.getDate() - now.getDay());
      start.setHours(0, 0, 0, 0);
      break;
    case "monthly":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    default:
      start = null;
  }
  return start;
}

export default function Leaderboard() {
  const [mounted, setMounted] = useState(false);
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null);
  const [emailUser, setEmailUser] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("all-time");
  const [selectedQuest, setSelectedQuest] = useState("all");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [quests, setQuests] = useState<any[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration-safe user detection
  useEffect(() => {
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user);
    });
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single();
        setEmailUser({ ...user, profile });
      }
    };
    checkEmailAuth();
    return () => unsubscribeWallet();
  }, []);

  // Fetch all quests for filter dropdown
  useEffect(() => {
    const fetchQuests = async () => {
      const { data, error } = await supabase.from("quests").select("id, title").order("created_at", { ascending: false });
      if (!error && data) setQuests(data);
    };
    fetchQuests();
  }, []);

  // Fetch leaderboard data with filters
  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      // 1. Get all users
      const { data: usersRaw, error: usersError } = await supabase
        .from("users")
        .select("id, wallet_address, username, email, avatar_url, total_xp, level, rank")
        .order("total_xp", { ascending: false })
        .limit(100);
      if (usersError || !usersRaw) {
        setUsers([]);
        setLoading(false);
        return;
      }
      // 2. Get all completed quest progress for period/quest
      let questProgressQuery = supabase
        .from("user_quest_progress")
        .select("user_id, quest_id, completed_at")
        .eq("status", "completed");
      const periodStart = getPeriodRange(selectedPeriod);
      if (periodStart) {
        questProgressQuery = questProgressQuery.gte("completed_at", periodStart.toISOString());
      }
      if (selectedQuest !== "all") {
        questProgressQuery = questProgressQuery.eq("quest_id", selectedQuest);
      }
      const { data: questProgress, error: qpError } = await questProgressQuery;
      // 3. Aggregate completed quests per user
      const completedMap: Record<string, number> = {};
      (questProgress || []).forEach((row) => {
        completedMap[row.user_id] = (completedMap[row.user_id] || 0) + 1;
      });
      // 4. Fetch badges for all users
      const userIds = usersRaw.map((u) => u.id);
      const { data: badgesRaw } = await supabase
        .from("user_badges")
        .select("user_id, badge_icon, badge_rarity")
        .in("user_id", userIds);
      const badgesMap: Record<string, any[]> = {};
      (badgesRaw || []).forEach((b) => {
        if (!badgesMap[b.user_id]) badgesMap[b.user_id] = [];
        badgesMap[b.user_id].push({ icon: b.badge_icon, rarity: b.badge_rarity });
      });
      // 5. Compose leaderboard users
      const leaderboardUsers = usersRaw.map((user, idx) => ({
        ...user,
        completed_quests: completedMap[user.id] || 0,
        badges: badgesMap[user.id] || [],
        rank: idx + 1,
      }));
      setUsers(leaderboardUsers);
      setLoading(false);
    };
    fetchLeaderboard();
  }, [selectedPeriod, selectedQuest]);

  const currentUser = walletUser?.walletAddress || emailUser?.profile?.wallet_address;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-green-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-green-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">#{rank}</span>;
    }
  };

  const getRankBadgeColor = (rank: number) => {
    if (rank <= 3) return "from-green-400 to-emerald-500";
    if (rank <= 10) return "from-purple-400 to-pink-500";
    if (rank <= 50) return "from-blue-400 to-cyan-500";
    return "from-gray-400 to-gray-500";
  };

  if (loading) {
    return (
      <BackgroundWrapper>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-white text-xl">Loading leaderboard...</div>
        </div>
      </BackgroundWrapper>
    );
  }

  return (
    <BackgroundWrapper>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-green-400 via-emerald-400 to-green-400 bg-clip-text text-transparent mb-4">
            Leaderboard
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Compete with the best Web3 quest participants and climb the ranks
          </p>
          {/* Hydration-safe: Only show after mount */}
          {mounted && currentUser && (
            <Link href="/register-project">
              <button className="mt-6 px-6 py-2 rounded-lg bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold shadow-lg hover:from-green-600 hover:to-emerald-600 transition-colors">
                Create Project
              </button>
            </Link>
          )}
        </div>

        {/* Top 3 Podium */}
        {users.length >= 3 && (
          <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm mb-8">
            <CardContent className="p-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                {/* 2nd Place */}
                <div className={`text-center order-1 md:order-1 ${users[1].wallet_address === currentUser ? "ring-4 ring-green-400" : ""}`}>
                  <div className="relative mb-4">
                    <img
                      src={users[1].avatar_url || "/placeholder.svg"}
                      alt="2nd place"
                      className="w-20 h-20 rounded-full mx-auto border-4 border-gray-400"
                    />
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-lg">{users[1].username}</h3>
                  <p className="text-gray-400 text-sm font-mono">
                    {(users[1].wallet_address || users[1].email || "").slice(0, 10)}...
                  </p>
                  <div className="flex justify-center gap-1 my-2">
                    {users[1].badges.map((badge: any, i: number) => (
                      <span key={i} className="text-lg" title={badge.rarity}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0">
                    {users[1].total_xp} XP
                  </Badge>
                </div>

                {/* 1st Place */}
                <div className={`text-center order-2 md:order-2 ${users[0].wallet_address === currentUser ? "ring-4 ring-green-400" : ""}`}>
                  <div className="relative mb-4">
                    <img
                      src={users[0].avatar_url || "/placeholder.svg"}
                      alt="1st place"
                      className="w-24 h-24 rounded-full mx-auto border-4 border-green-400"
                    />
                    <div className="absolute -top-3 -right-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                      1
                    </div>
                    <Crown className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-white font-bold text-xl">{users[0].username}</h3>
                  <p className="text-gray-400 text-sm font-mono">
                    {(users[0].wallet_address || users[0].email || "").slice(0, 10)}...
                  </p>
                  <div className="flex justify-center gap-1 my-2">
                    {users[0].badges.map((badge: any, i: number) => (
                      <span key={i} className="text-xl" title={badge.rarity}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                  <Badge className="bg-gradient-to-r from-green-400 to-emerald-500 text-white border-0 text-lg px-4 py-1">
                    {users[0].total_xp} XP
                  </Badge>
                </div>

                {/* 3rd Place */}
                <div className={`text-center order-3 md:order-3 ${users[2].wallet_address === currentUser ? "ring-4 ring-green-400" : ""}`}>
                  <div className="relative mb-4">
                    <img
                      src={users[2].avatar_url || "/placeholder.svg"}
                      alt="3rd place"
                      className="w-20 h-20 rounded-full mx-auto border-4 border-green-600"
                    />
                    <div className="absolute -top-2 -right-2 bg-gradient-to-r from-green-600 to-green-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                  </div>
                  <h3 className="text-white font-bold text-lg">{users[2].username}</h3>
                  <p className="text-gray-400 text-sm font-mono">
                    {(users[2].wallet_address || users[2].email || "").slice(0, 10)}...
                  </p>
                  <div className="flex justify-center gap-1 my-2">
                    {users[2].badges.map((badge: any, i: number) => (
                      <span key={i} className="text-lg" title={badge.rarity}>
                        {badge.icon}
                      </span>
                    ))}
                  </div>
                  <Badge className="bg-gradient-to-r from-green-600 to-green-700 text-white border-0">
                    {users[2].total_xp} XP
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all-time" className="text-white hover:bg-slate-700">
                All Time
              </SelectItem>
              <SelectItem value="monthly" className="text-white hover:bg-slate-700">
                This Month
              </SelectItem>
              <SelectItem value="weekly" className="text-white hover:bg-slate-700">
                This Week
              </SelectItem>
              <SelectItem value="daily" className="text-white hover:bg-slate-700">
                Today
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedQuest} onValueChange={setSelectedQuest}>
            <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white backdrop-blur-sm">
              <SelectValue placeholder="Quest" />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-700">
              <SelectItem value="all" className="text-white hover:bg-slate-700">
                All Quests
              </SelectItem>
              {quests.map((quest) => (
                <SelectItem key={quest.id} value={quest.id} className="text-white hover:bg-slate-700">
                  {quest.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-400" />
              Global Rankings
            </CardTitle>
            <CardDescription className="text-gray-300">Top performers across all quests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {users.slice(3).map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg bg-black/30 hover:bg-black/40 transition-colors ${user.wallet_address === currentUser ? "ring-2 ring-green-400" : ""}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10">{getRankIcon(user.rank)}</div>
                    <img
                      src={user.avatar_url || "/placeholder.svg"}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h3 className="text-white font-semibold">{user.username}</h3>
                      <p className="text-gray-400 text-sm font-mono">{(user.wallet_address || user.email || "").slice(0, 10)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-green-400 font-bold">{user.total_xp}</p>
                      <p className="text-gray-400 text-xs">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">{user.completed_quests}</p>
                      <p className="text-gray-400 text-xs">Quests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-green-400 font-semibold">L{user.level}</p>
                      <p className="text-gray-400 text-xs">Level</p>
                    </div>
                    <div className="flex gap-1">
                      {user.badges.map((badge: any, i: number) => (
                        <span key={i} className="text-sm" title={badge.rarity}>
                          {badge.icon}
                        </span>
                      ))}
                    </div>
                    <Badge className={`bg-gradient-to-r ${getRankBadgeColor(user.rank)} text-white border-0`}>
                      #{user.rank}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </BackgroundWrapper>
  );
}
