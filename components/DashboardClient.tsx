"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Trophy, Zap, CheckCircle, Star, Clock } from "lucide-react";
import QuestCard from '@/components/QuestCard';

export default function DashboardClient({ profile, activeQuests, completedQuests, completedTasks, badges, achievements }: any) {
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
    <div className="w-full">
      {/* Dashboard Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="flex gap-2 whitespace-nowrap overflow-x-auto bg-transparent shadow-none p-0 border-0 justify-start w-auto">
            <TabsTrigger value="overview" className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 text-gray-300 px-4 py-2 font-medium bg-transparent border-0 rounded-none hover:text-white hover:bg-transparent">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quests" className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 text-gray-300 px-4 py-2 font-medium bg-transparent border-0 rounded-none hover:text-white hover:bg-transparent">
              Quests
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 text-gray-300 px-4 py-2 font-medium bg-transparent border-0 rounded-none hover:text-white hover:bg-transparent">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:text-white data-[state=active]:border-b-2 data-[state=active]:border-green-500 text-gray-300 px-4 py-2 font-medium bg-transparent border-0 rounded-none hover:text-white hover:bg-transparent">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Total XP</p>
                      <p className="text-2xl font-bold text-white">{profile?.total_xp || 0}</p>
                    </div>
                    <Zap className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Global Rank</p>
                      <p className="text-2xl font-bold text-white">#{profile?.rank || 'N/A'}</p>
                    </div>
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Completed</p>
                      <p className="text-2xl font-bold text-white">{profile?.completedQuests || 0}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Current Level</p>
                      <p className="text-2xl font-bold text-white">{profile?.level || 1}</p>
                    </div>
                    <Star className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Badges Section */}
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
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
                <QuestCard key={quest.id} quest={quest}>
                  <Button className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                    Continue Quest
                  </Button>
                </QuestCard>
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
                    className={`bg-[#111111] border-[#282828] backdrop-blur-sm ${achievement.unlocked ? "border-green-500/30" : "border-gray-500/30"}`}
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
            <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Completed Tasks</CardTitle>
                <CardDescription className="text-gray-300">Your task completion history with project and quest details</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {completedTasks.map((taskSubmission: any) => {
                    const task = taskSubmission.tasks;
                    const quest = task?.quests;
                    const project = quest?.projects;
                    
                    if (!task || !quest) return null;
                    
                    return (
                      <div key={taskSubmission.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {project?.logo_url && (
                              <img 
                                src={project.logo_url} 
                                alt={project.name} 
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <div>
                              <h3 className="text-white font-semibold">{task.title}</h3>
                              <p className="text-gray-400 text-sm">
                                {project?.name || 'Unknown Project'} • {quest.title}
                              </p>
                            </div>
                          </div>
                          <p className="text-gray-400 text-xs">
                            Completed on {new Date(taskSubmission.created_at).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-yellow-400 font-semibold">+{task.xp_reward} XP</p>
                          <p className="text-gray-400 text-xs capitalize">{task.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </div>
  );
} 