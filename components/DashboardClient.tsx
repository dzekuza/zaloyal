"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, CheckCircle, Star, Clock } from "lucide-react";

export default function DashboardClient({ profile, activeQuests, completedQuests, badges, achievements }: any) {
  const [activeTab, setActiveTab] = useState("overview");

  // Level progress calculation
  const levelProgress = profile && profile.total_xp && profile.level
    ? ((profile.total_xp % 1000) / 1000) * 100
    : 0;
  const nextLevelXP = profile ? ((profile.level || 1) * 1000) : 1000;

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-400 to-orange-500";
      case "epic":
        return "from-purple-400 to-pink-500";
      case "rare":
        return "from-green-400 to-emerald-500"; // changed from blue/cyan to green/emerald
      default:
        return "from-gray-400 to-gray-500";
    }
  };

  return (
    <div className="min-h-screen bg-[#181818]">
      <div className="container mx-auto px-4 py-8">
        {/* User Profile Header */}
        <Card className="bg-[#111111] rounded-lg mb-8">
          <CardContent className="p-4 sm:p-6">
            <div className="flex flex-col items-center md:flex-row md:items-center gap-4 md:gap-6 w-full">
              <div className="flex flex-col items-center gap-2 w-full md:w-auto">
                <div className="relative">
                  <img
                    src={profile?.avatar || "/placeholder.svg"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-2 border-white/20 mx-auto"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    L{profile?.level}
                  </div>
                </div>
                <h1 className="text-base sm:text-2xl font-bold text-white text-center mt-2">{profile?.username}</h1>
                <p className="text-gray-400 text-xs sm:text-sm font-mono text-center break-all">{profile?.walletAddress}</p>
              </div>
              <div className="flex-1 w-full md:max-w-md mt-4 md:mt-0">
                <div className="space-y-2 w-full">
                  <div className="flex flex-wrap justify-center md:justify-between gap-2 text-xs sm:text-sm mb-2">
                    <span className="flex items-center gap-1 text-yellow-200">
                      <Zap className="w-4 h-4" />
                      {profile?.total_xp} XP
                    </span>
                    <span className="flex items-center gap-1 text-green-200">
                      <Trophy className="w-4 h-4" />
                      Rank #{profile?.rank}
                    </span>
                    <span className="flex items-center gap-1 text-green-200">
                      <CheckCircle className="w-4 h-4" />
                      {profile?.completedQuests} Quests
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 w-full">
                    <div className="flex justify-between text-xs sm:text-sm">
                      <span className="text-gray-400">Level Progress</span>
                      <span className="text-white">
                        {profile?.total_xp}/{nextLevelXP} XP
                      </span>
                    </div>
                    <Progress value={levelProgress} className="h-2 w-full" />
                    <p className="text-xs text-gray-400 text-right w-full">
                      {nextLevelXP - profile?.total_xp} XP to Level {profile?.level + 1}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex whitespace-nowrap overflow-x-auto -mx-2 px-2 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 min-w-max">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quests" className="data-[state=active]:bg-white/20 min-w-max">
              Quests
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-white/20 min-w-max">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/20 min-w-max">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Total XP</p>
                      <p className="text-2xl font-bold text-white">{profile?.total_xp}</p>
                    </div>
                    <Zap className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Global Rank</p>
                      <p className="text-2xl font-bold text-white">#{profile?.rank}</p>
                    </div>
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Completed</p>
                      <p className="text-2xl font-bold text-white">{profile?.completedQuests}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/20 to-emerald-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Current Level</p>
                      <p className="text-2xl font-bold text-white">{profile?.level}</p>
                    </div>
                    <Star className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badges Section */}
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Badges</CardTitle>
                <CardDescription className="text-gray-300">Your earned badges and achievements</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {badges.map((badge: any) => (
                    <div key={badge.id} className="text-center">
                      <div
                        className={`w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-r ${getRarityColor(badge.rarity)} flex items-center justify-center text-2xl`}
                      >
                        {badge.icon}
                      </div>
                      <p className="text-white text-sm font-semibold">{badge.name}</p>
                      <Badge
                        variant="outline"
                        className={`text-xs mt-1 bg-gradient-to-r ${getRarityColor(badge.rarity)} border-0 text-white`}
                      >
                        {badge.rarity}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quests" className="space-y-6">
            <div className="grid gap-6">
              {activeQuests.map((quest: any) => (
                <Card
                  key={quest.id}
                  className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm"
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-white mb-2">{quest.title}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <CheckCircle className="w-4 h-4" />
                            {quest.completedTasks}/{quest.totalTasks} tasks
                          </span>
                          <span className="flex items-center gap-1">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            {quest.total_xp_earned}/{quest.totalXP} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {quest.timeLeft} left
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white">{quest.completion_percentage}%</span>
                          </div>
                          <Progress value={quest.completion_percentage} className="h-2" />
                        </div>
                      </div>
                      <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                        Continue Quest
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {achievements.map((achievement: any) => {
                const IconComponent = achievement.icon;
                return (
                  <Card
                    key={achievement.id}
                    className={`bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm ${achievement.unlocked ? "border-green-500/30" : "border-gray-500/30"}`}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-12 h-12 rounded-full flex items-center justify-center ${achievement.unlocked ? "bg-green-500/20 text-green-400" : "bg-gray-500/20 text-gray-400"}`}
                        >
                          <IconComponent className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <h3 className={`font-semibold mb-1 ${achievement.unlocked ? "text-white" : "text-gray-400"}`}>
                            {achievement.name}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
                          {achievement.unlocked ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Unlocked {achievement.unlockedDate}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 border-gray-500/30">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Completed Quests</CardTitle>
                <CardDescription className="text-gray-300">Your quest completion history</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedQuests.map((quest: any) => (
                    <div key={quest.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <h3 className="text-white font-semibold">{quest.title}</h3>
                        <p className="text-gray-400 text-sm">Completed on {quest.completed_at}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-semibold">+{quest.total_xp_earned} XP</p>
                        <p className="text-gray-400 text-sm">Rank #{quest.rank}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 