"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trophy, Medal, Award, Crown } from "lucide-react"

// Mock leaderboard data
const mockGlobalLeaderboard = [
  {
    rank: 1,
    username: "DeFiKing",
    walletAddress: "0x742d35Cc6634C0532925a3b8D4C0532925a3b8D4",
    totalXP: 25750,
    completedQuests: 45,
    level: 28,
    avatar: "/placeholder.svg?height=40&width=40",
    badges: ["🏆", "⚡", "🎯"],
  },
  {
    rank: 2,
    username: "CryptoNinja",
    walletAddress: "0x8ba1f109551bD432803012645Hac136c0532925a",
    totalXP: 23200,
    completedQuests: 41,
    level: 26,
    avatar: "/placeholder.svg?height=40&width=40",
    badges: ["🥈", "🎨", "🦋"],
  },
  {
    rank: 3,
    username: "Web3Explorer",
    walletAddress: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    totalXP: 21800,
    completedQuests: 38,
    level: 24,
    avatar: "/placeholder.svg?height=40&width=40",
    badges: ["🥉", "🚀", "💎"],
  },
  {
    rank: 4,
    username: "TokenMaster",
    walletAddress: "0xA0b86a33E6441E6C7D3E4C2C4C6C6C6C6C6C6C6C",
    totalXP: 19500,
    completedQuests: 35,
    level: 22,
    avatar: "/placeholder.svg?height=40&width=40",
    badges: ["🎖️", "⭐", "🔥"],
  },
  {
    rank: 5,
    username: "NFTCollector",
    walletAddress: "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D",
    totalXP: 18200,
    completedQuests: 32,
    level: 21,
    avatar: "/placeholder.svg?height=40&width=40",
    badges: ["🎨", "💫", "🌟"],
  },
]

// Generate more users for the leaderboard
const generateMoreUsers = () => {
  const users = []
  for (let i = 6; i <= 50; i++) {
    users.push({
      rank: i,
      username: `User${i}`,
      walletAddress: `0x${Math.random().toString(16).substr(2, 40)}`,
      totalXP: Math.floor(Math.random() * 15000) + 3000,
      completedQuests: Math.floor(Math.random() * 25) + 5,
      level: Math.floor(Math.random() * 15) + 5,
      avatar: "/placeholder.svg?height=40&width=40",
      badges: ["⚡", "🎯", "🌟"].slice(0, Math.floor(Math.random() * 3) + 1),
    })
  }
  return users
}

const allUsers = [...mockGlobalLeaderboard, ...generateMoreUsers()]

const mockQuestLeaderboards = {
  "defi-master": [
    { rank: 1, username: "DeFiKing", xp: 2500, completionTime: "2 days" },
    { rank: 2, username: "YieldFarmer", xp: 2500, completionTime: "3 days" },
    { rank: 3, username: "LiquidityPro", xp: 2400, completionTime: "2 days" },
  ],
  "nft-quest": [
    { rank: 1, username: "NFTCollector", xp: 1800, completionTime: "1 day" },
    { rank: 2, username: "ArtLover", xp: 1800, completionTime: "2 days" },
    { rank: 3, username: "DigitalArtist", xp: 1750, completionTime: "1 day" },
  ],
}

export default function Leaderboard() {
  const [selectedPeriod, setSelectedPeriod] = useState("all-time")
  const [selectedQuest, setSelectedQuest] = useState("all")

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank <= 3) return "from-yellow-400 to-orange-500"
    if (rank <= 10) return "from-purple-400 to-pink-500"
    if (rank <= 50) return "from-blue-400 to-cyan-500"
    return "from-gray-400 to-gray-500"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent mb-4">
            Leaderboard
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Compete with the best Web3 quest participants and climb the ranks
          </p>
        </div>

        {/* Top 3 Podium */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm mb-8">
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
              {/* 2nd Place */}
              <div className="text-center order-1 md:order-1">
                <div className="relative mb-4">
                  <img
                    src={mockGlobalLeaderboard[1].avatar || "/placeholder.svg"}
                    alt="2nd place"
                    className="w-20 h-20 rounded-full mx-auto border-4 border-gray-400"
                  />
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-gray-400 to-gray-500 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg">{mockGlobalLeaderboard[1].username}</h3>
                <p className="text-gray-400 text-sm font-mono">
                  {mockGlobalLeaderboard[1].walletAddress.slice(0, 10)}...
                </p>
                <div className="flex justify-center gap-1 my-2">
                  {mockGlobalLeaderboard[1].badges.map((badge, i) => (
                    <span key={i} className="text-lg">
                      {badge}
                    </span>
                  ))}
                </div>
                <Badge className="bg-gradient-to-r from-gray-400 to-gray-500 text-white border-0">
                  {mockGlobalLeaderboard[1].totalXP} XP
                </Badge>
              </div>

              {/* 1st Place */}
              <div className="text-center order-2 md:order-2">
                <div className="relative mb-4">
                  <img
                    src={mockGlobalLeaderboard[0].avatar || "/placeholder.svg"}
                    alt="1st place"
                    className="w-24 h-24 rounded-full mx-auto border-4 border-yellow-400"
                  />
                  <div className="absolute -top-3 -right-3 bg-gradient-to-r from-yellow-400 to-orange-500 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold">
                    1
                  </div>
                  <Crown className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-8 h-8 text-yellow-400" />
                </div>
                <h3 className="text-white font-bold text-xl">{mockGlobalLeaderboard[0].username}</h3>
                <p className="text-gray-400 text-sm font-mono">
                  {mockGlobalLeaderboard[0].walletAddress.slice(0, 10)}...
                </p>
                <div className="flex justify-center gap-1 my-2">
                  {mockGlobalLeaderboard[0].badges.map((badge, i) => (
                    <span key={i} className="text-xl">
                      {badge}
                    </span>
                  ))}
                </div>
                <Badge className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white border-0 text-lg px-4 py-1">
                  {mockGlobalLeaderboard[0].totalXP} XP
                </Badge>
              </div>

              {/* 3rd Place */}
              <div className="text-center order-3 md:order-3">
                <div className="relative mb-4">
                  <img
                    src={mockGlobalLeaderboard[2].avatar || "/placeholder.svg"}
                    alt="3rd place"
                    className="w-20 h-20 rounded-full mx-auto border-4 border-amber-600"
                  />
                  <div className="absolute -top-2 -right-2 bg-gradient-to-r from-amber-600 to-amber-700 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                </div>
                <h3 className="text-white font-bold text-lg">{mockGlobalLeaderboard[2].username}</h3>
                <p className="text-gray-400 text-sm font-mono">
                  {mockGlobalLeaderboard[2].walletAddress.slice(0, 10)}...
                </p>
                <div className="flex justify-center gap-1 my-2">
                  {mockGlobalLeaderboard[2].badges.map((badge, i) => (
                    <span key={i} className="text-lg">
                      {badge}
                    </span>
                  ))}
                </div>
                <Badge className="bg-gradient-to-r from-amber-600 to-amber-700 text-white border-0">
                  {mockGlobalLeaderboard[2].totalXP} XP
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

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
              <SelectItem value="defi-master" className="text-white hover:bg-slate-700">
                DeFi Master
              </SelectItem>
              <SelectItem value="nft-quest" className="text-white hover:bg-slate-700">
                NFT Quest
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Leaderboard Table */}
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Global Rankings
            </CardTitle>
            <CardDescription className="text-gray-300">Top performers across all quests</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {allUsers.slice(3).map((user) => (
                <div
                  key={user.rank}
                  className="flex items-center justify-between p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center w-10 h-10">{getRankIcon(user.rank)}</div>
                    <img
                      src={user.avatar || "/placeholder.svg"}
                      alt={user.username}
                      className="w-10 h-10 rounded-full"
                    />
                    <div>
                      <h3 className="text-white font-semibold">{user.username}</h3>
                      <p className="text-gray-400 text-sm font-mono">{user.walletAddress.slice(0, 10)}...</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-center">
                      <p className="text-yellow-400 font-bold">{user.totalXP}</p>
                      <p className="text-gray-400 text-xs">XP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-white font-semibold">{user.completedQuests}</p>
                      <p className="text-gray-400 text-xs">Quests</p>
                    </div>
                    <div className="text-center">
                      <p className="text-blue-400 font-semibold">L{user.level}</p>
                      <p className="text-gray-400 text-xs">Level</p>
                    </div>
                    <div className="flex gap-1">
                      {user.badges.map((badge, i) => (
                        <span key={i} className="text-sm">
                          {badge}
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
    </div>
  )
}
