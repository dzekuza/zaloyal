"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Trophy, Zap, Users, Star, Target, Clock, CheckCircle } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { walletAuth, type WalletUser } from "@/lib/wallet-auth"

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [walletUser, setWalletUser] = useState<WalletUser | null>(null)
  const [emailUser, setEmailUser] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [activeQuests, setActiveQuests] = useState<any[]>([])
  const [completedQuests, setCompletedQuests] = useState<any[]>([])
  const [badges, setBadges] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Wallet user
    const unsubscribeWallet = walletAuth.onAuthStateChange((user) => {
      setWalletUser(user)
    })
    // Email user
    const checkEmailAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from("users").select("*").eq("email", user.email).single()
        setEmailUser({ ...user, profile })
      }
    }
    checkEmailAuth()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        checkEmailAuth()
      } else if (event === "SIGNED_OUT") {
        setEmailUser(null)
      }
    })
    return () => {
      unsubscribeWallet()
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      let userId: string | null = null
      let userProfile: any = null
      if (walletUser) {
        // Get user by wallet address
        const { data: userData } = await supabase
          .from("users")
          .select("*")
          .eq("wallet_address", walletUser.walletAddress.toLowerCase())
          .single()
        userId = userData?.id
        userProfile = userData
      } else if (emailUser?.profile) {
        userId = emailUser.profile.id
        userProfile = emailUser.profile
      }
      setProfile(userProfile)
      if (!userId) {
        setLoading(false)
        return
      }
      // Fetch active quests
      const { data: activeProgress } = await supabase
        .from("user_quest_progress")
        .select(`*, quests:quest_id(*), total_xp_earned, completion_percentage`)
        .eq("user_id", userId)
        .eq("status", "active")
      // Fetch completed quests
      const { data: completedProgress } = await supabase
        .from("user_quest_progress")
        .select(`*, quests:quest_id(*), total_xp_earned, completed_at, completion_percentage`)
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
      // Fetch badges
      const { data: badgeData } = await supabase
        .from("user_badges")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false })
      setActiveQuests(activeProgress || [])
      setCompletedQuests(completedProgress || [])
      setBadges(badgeData || [])
      // Achievements: treat badges as achievements for now
      setAchievements(badgeData || [])
      setLoading(false)
    }
    fetchData()
  }, [walletUser, emailUser])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    )
  }

  // Level progress calculation
  const levelProgress = profile && profile.total_xp && profile.level
    ? ((profile.total_xp % 1000) / 1000) * 100
    : 0
  const nextLevelXP = profile ? ((profile.level || 1) * 1000) : 1000

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
                    src={profile?.avatar || "/placeholder.svg"}
                    alt="Profile"
                    className="w-20 h-20 rounded-full border-2 border-white/20"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs px-2 py-1 rounded-full font-semibold">
                    L{profile?.level}
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">{profile?.username}</h1>
                  <p className="text-gray-400 text-sm font-mono">{profile?.walletAddress}</p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-yellow-400">
                      <Zap className="w-4 h-4" />
                      {profile?.total_xp} XP
                    </span>
                    <span className="flex items-center gap-1 text-green-400">
                      <Trophy className="w-4 h-4" />
                      Rank #{profile?.rank}
                    </span>
                    <span className="flex items-center gap-1 text-blue-400">
                      <CheckCircle className="w-4 h-4" />
                      {profile?.completedQuests} Quests
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex-1 max-w-md">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Level Progress</span>
                    <span className="text-white">
                      {profile?.total_xp}/{nextLevelXP} XP
                    </span>
                  </div>
                  <Progress value={levelProgress} className="h-2" />
                  <p className="text-xs text-gray-400">
                    {nextLevelXP - profile?.total_xp} XP to Level {profile?.level + 1}
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
                      <p className="text-2xl font-bold text-white">{profile?.total_xp}</p>
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
                      <p className="text-2xl font-bold text-white">#{profile?.rank}</p>
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
                      <p className="text-2xl font-bold text-white">{profile?.completedQuests}</p>
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
                      <p className="text-2xl font-bold text-white">{profile?.level}</p>
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
                  {badges.map((badge) => (
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
              {activeQuests.map((quest) => (
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
              {achievements.map((achievement) => {
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
                  {completedQuests.map((quest) => (
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
  )
}
