"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Zap, Users, Star, Target, Clock, CheckCircle } from "lucide-react"

// Mock user data
const mockUser = {
  walletAddress: "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
  username: "CryptoExplorer",
  avatar: "/placeholder.svg?height=80&width=80",
  totalXP: 8750,
  completedQuests: 12,
  rank: 47,
  level: 15,
  nextLevelXP: 10000,
  badges: [
    { id: 1, name: "DeFi Master", icon: "🏆", rarity: "legendary" },
    { id: 2, name: "NFT Collector", icon: "🎨", rarity: "epic" },
    { id: 3, name: "Social Butterfly", icon: "🦋", rarity: "rare" },
    { id: 4, name: "Early Adopter", icon: "⚡", rarity: "common" },
  ],
}

const mockActiveQuests = [
  {
    id: "1",
    title: "DeFi Master Challenge",
    progress: 75,
    totalTasks: 8,
    completedTasks: 6,
    xpEarned: 1875,
    totalXP: 2500,
    timeLeft: "5 days",
    status: "active",
  },
  {
    id: "2",
    title: "NFT Collection Quest",
    progress: 33,
    totalTasks: 6,
    completedTasks: 2,
    xpEarned: 600,
    totalXP: 1800,
    timeLeft: "12 days",
    status: "active",
  },
  {
    id: "3",
    title: "Web3 Social Media Mastery",
    progress: 90,
    totalTasks: 10,
    completedTasks: 9,
    xpEarned: 1350,
    totalXP: 1500,
    timeLeft: "15 days",
    status: "active",
  },
]

const mockCompletedQuests = [
  {
    id: "4",
    title: "Crypto Basics Bootcamp",
    xpEarned: 1200,
    completedDate: "2024-01-15",
    rank: 23,
  },
  {
    id: "5",
    title: "Trading Fundamentals",
    xpEarned: 1800,
    completedDate: "2024-01-10",
    rank: 12,
  },
  {
    id: "6",
    title: "Wallet Security Challenge",
    xpEarned: 800,
    completedDate: "2024-01-05",
    rank: 45,
  },
]

const mockAchievements = [
  {
    id: 1,
    title: "First Quest Complete",
    description: "Complete your first quest",
    icon: Target,
    unlocked: true,
    unlockedDate: "2024-01-01",
  },
  {
    id: 2,
    title: "XP Collector",
    description: "Earn 5,000 XP",
    icon: Zap,
    unlocked: true,
    unlockedDate: "2024-01-10",
  },
  {
    id: 3,
    title: "Social Master",
    description: "Complete 10 social tasks",
    icon: Users,
    unlocked: true,
    unlockedDate: "2024-01-12",
  },
  {
    id: 4,
    title: "DeFi Expert",
    description: "Complete 5 DeFi quests",
    icon: Trophy,
    unlocked: false,
    progress: 80,
  },
]

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")

  const levelProgress = (mockUser.totalXP / mockUser.nextLevelXP) * 100

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "from-yellow-400 to-orange-500"
      case "epic":
        return "from-purple-400 to-pink-500"
      case "rare":
        return "from-blue-400 to-cyan-500"
      default:
        return "from-gray-400 to-gray-500"
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* User Profile Header */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img
                    src={mockUser.avatar || "/placeholder.svg"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-2 border-white/20"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    L{mockUser.level}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{mockUser.username}</h1>
                  <p className="text-gray-400 text-sm font-mono">{mockUser.walletAddress}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Zap className="w-4 h-4" />
                      {mockUser.totalXP} XP
                    </span>
                    <span className="flex items-center gap-1 text-green-400">
                      <Trophy className="w-4 h-4" />
                      Rank #{mockUser.rank}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <CheckCircle className="w-4 h-4" />
                      {mockUser.completedQuests} Quests
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Level Progress</span>
                    <span className="text-white">
                      {mockUser.totalXP}/{mockUser.nextLevelXP} XP
                    </span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                  <p className="text-xs text-gray-400">
                    {mockUser.nextLevelXP - mockUser.totalXP} XP to Level {mockUser.level + 1}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white/10 backdrop-blur-sm">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quests" className="data-[state=active]:bg-white/20">
              Active Quests
            </TabsTrigger>
            <TabsTrigger value="achievements" className="data-[state=active]:bg-white/20">
              Achievements
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-white/20">
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border-blue-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Total XP</p>
                      <p className="text-2xl font-bold text-white">{mockUser.totalXP}</p>
                    </div>
                    <Zap className="w-8 h-8 text-blue-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-500/20 to-green-600/20 border-green-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-green-200 text-sm">Global Rank</p>
                      <p className="text-2xl font-bold text-white">#{mockUser.rank}</p>
                    </div>
                    <Trophy className="w-8 h-8 text-green-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border-purple-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">Completed</p>
                      <p className="text-2xl font-bold text-white">{mockUser.completedQuests}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-purple-400" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-500/20 to-orange-600/20 border-orange-500/30 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-orange-200 text-sm">Current Level</p>
                      <p className="text-2xl font-bold text-white">{mockUser.level}</p>
                    </div>
                    <Star className="w-8 h-8 text-orange-400" />
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
                  {mockUser.badges.map((badge) => (
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
              {mockActiveQuests.map((quest) => (
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
                            {quest.xpEarned}/{quest.totalXP} XP
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {quest.timeLeft} left
                          </span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Progress</span>
                            <span className="text-white">{quest.progress}%</span>
                          </div>
                          <Progress value={quest.progress} className="h-2" />
                        </div>
                      </div>
                      <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0">
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
              {mockAchievements.map((achievement) => {
                const IconComponent = achievement.icon
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
                            {achievement.title}
                          </h3>
                          <p className="text-gray-400 text-sm mb-2">{achievement.description}</p>
                          {achievement.unlocked ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                              Unlocked {achievement.unlockedDate}
                            </Badge>
                          ) : achievement.progress ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Progress</span>
                                <span className="text-white">{achievement.progress}%</span>
                              </div>
                              <Progress value={achievement.progress} className="h-1" />
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-gray-400 border-gray-500/30">
                              Locked
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
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
                  {mockCompletedQuests.map((quest) => (
                    <div key={quest.id} className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                      <div>
                        <h3 className="text-white font-semibold">{quest.title}</h3>
                        <p className="text-gray-400 text-sm">Completed on {quest.completedDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-yellow-400 font-semibold">+{quest.xpEarned} XP</p>
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
  )
}
