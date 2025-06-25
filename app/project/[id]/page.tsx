"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Globe, Twitter, MessageSquare, Github, Users, Zap, Trophy, Calendar, Star } from "lucide-react"

import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

import type { Database } from "@/lib/supabase"

type Project = Database["public"]["Tables"]["projects"]["Row"] & {
  quest_count?: number
  total_participants?: number
  quests?: Array<Database["public"]["Tables"]["quests"]["Row"]>
}

type Quest = Database["public"]["Tables"]["quests"]["Row"] & {
  task_count?: number
  participants?: number
}

export default function ProjectDetail() {
  const params = useParams()
  const projectId = params.id as string

  const [project, setProject] = useState<Project | null>(null)
  const [quests, setQuests] = useState<Quest[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("overview")

  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchQuests()
    }
  }, [projectId])

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase.from("projects").select("*").eq("id", projectId).single()

      if (error) throw error

      // Get project stats
      const { count: questCount } = await supabase
        .from("quests")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("status", "active")

      const { data: questIds } = await supabase
        .from("quests")
        .select("id")
        .eq("project_id", projectId)
        .eq("status", "active")

      let totalParticipants = 0
      if (questIds?.length) {
        const { count } = await supabase
          .from("user_quest_progress")
          .select("user_id", { count: "exact", head: true })
          .in(
            "quest_id",
            questIds.map((q) => q.id),
          )
        totalParticipants = count || 0
      }

      setProject({
        ...data,
        quest_count: questCount || 0,
        total_participants: totalParticipants,
      })
    } catch (error) {
      console.error("Error fetching project:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchQuests = async () => {
    try {
      const { data, error } = await supabase
        .from("quests")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "active")
        .order("created_at", { ascending: false })

      if (error) throw error

      const questsWithStats = await Promise.all(
        (data || []).map(async (quest) => {
          const { count: taskCount } = await supabase
            .from("tasks")
            .select("*", { count: "exact", head: true })
            .eq("quest_id", quest.id)

          const { count: participants } = await supabase
            .from("user_quest_progress")
            .select("user_id", { count: "exact", head: true })
            .eq("quest_id", quest.id)

          return {
            ...quest,
            task_count: taskCount || 0,
            participants: participants || 0,
          }
        }),
      )

      setQuests(questsWithStats)
    } catch (error) {
      console.error("Error fetching quests:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading project...</div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Project Not Found</h2>
          <Link href="/">
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="relative">
        <div
          className="h-64 bg-cover bg-center"
          style={{
            backgroundImage: `url(${project.cover_image_url || "/placeholder.svg?height=256&width=1200"})`,
          }}
        >
          <div className="absolute inset-0 bg-black/50" />
        </div>

        <div className="absolute top-4 left-4">
          <Link href="/" className="text-white hover:text-gray-300 transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </Link>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="container mx-auto">
            <div className="flex items-end gap-6">
              <img
                src={project.logo_url || "/placeholder.svg?height=80&width=80"}
                alt={`${project.name} logo`}
                className="w-20 h-20 rounded-full border-4 border-white bg-white"
              />
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                  {project.verified && (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✓ Verified</Badge>
                  )}
                  {project.category && (
                    <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">{project.category}</Badge>
                  )}
                </div>
                <p className="text-gray-300 text-lg max-w-2xl">{project.description}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-black/20 border-b border-white/10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 text-yellow-400">
                <Trophy className="w-5 h-5" />
                <span className="font-semibold">{project.quest_count}</span>
                <span className="text-gray-400">Quests</span>
              </div>
              <div className="flex items-center gap-2 text-blue-400">
                <Users className="w-5 h-5" />
                <span className="font-semibold">{project.total_participants}</span>
                <span className="text-gray-400">Participants</span>
              </div>
              <div className="flex items-center gap-2 text-green-400">
                <Zap className="w-5 h-5" />
                <span className="font-semibold">{project.total_xp_distributed || 0}</span>
                <span className="text-gray-400">XP Distributed</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {project.website_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(project.website_url, "_blank")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Globe className="w-4 h-4" />
                </Button>
              )}
              {project.twitter_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(project.twitter_url, "_blank")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Twitter className="w-4 h-4" />
                </Button>
              )}
              {project.discord_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(project.discord_url, "_blank")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
              )}
              {project.github_url && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(project.github_url, "_blank")}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Github className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white/10 mb-8">
            <TabsTrigger value="overview" className="data-[state=active]:bg-white/20 text-white">
              Overview
            </TabsTrigger>
            <TabsTrigger value="quests" className="data-[state=active]:bg-white/20 text-white">
              Quests ({project.quest_count})
            </TabsTrigger>
            <TabsTrigger value="about" className="data-[state=active]:bg-white/20 text-white">
              About
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Featured Quests */}
            <div>
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Star className="w-6 h-6 text-yellow-400" />
                Featured Quests
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quests.slice(0, 6).map((quest) => (
                  <QuestCard key={quest.id} quest={quest} />
                ))}
              </div>
            </div>

            {/* Project Info */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">About {project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 leading-relaxed">{project.description}</p>
                    {project.additional_info && (
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <p className="text-gray-300 leading-relaxed">{project.additional_info}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white">Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-sm text-gray-400">Blockchain</div>
                      <div className="text-white font-medium">{project.blockchain_network}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Contract Address</div>
                      <div className="text-white font-mono text-sm break-all">{project.contract_address}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Launch Date</div>
                      <div className="text-white font-medium">{new Date(project.created_at).toLocaleDateString()}</div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="quests" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {quests.map((quest) => (
                <QuestCard key={quest.id} quest={quest} />
              ))}
            </div>
            {quests.length === 0 && (
              <div className="text-center py-12">
                <div className="text-gray-400 text-lg mb-4">No quests available</div>
                <p className="text-gray-500">This project hasn't created any quests yet</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="about" className="space-y-6">
            <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white">Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                  <p className="text-gray-300 leading-relaxed">{project.description}</p>
                </div>

                {project.additional_info && (
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-3">Additional Information</h3>
                    <p className="text-gray-300 leading-relaxed">{project.additional_info}</p>
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Technical Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-400">Blockchain Network</div>
                      <div className="text-white font-medium">{project.blockchain_network}</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Category</div>
                      <div className="text-white font-medium">{project.category}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-sm text-gray-400">Contract Address</div>
                      <div className="text-white font-mono text-sm break-all">{project.contract_address}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Links</h3>
                  <div className="flex flex-wrap gap-2">
                    {project.website_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(project.website_url, "_blank")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        Website
                      </Button>
                    )}
                    {project.twitter_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(project.twitter_url, "_blank")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Twitter className="w-4 h-4 mr-2" />
                        Twitter
                      </Button>
                    )}
                    {project.discord_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(project.discord_url, "_blank")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <MessageSquare className="w-4 h-4 mr-2" />
                        Discord
                      </Button>
                    )}
                    {project.github_url && (
                      <Button
                        variant="outline"
                        onClick={() => window.open(project.github_url, "_blank")}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        <Github className="w-4 h-4 mr-2" />
                        GitHub
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function QuestCard({ quest }: { quest: Quest }) {
  return (
    <Card className="group bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition">
      <div className="relative">
        <img
          src={quest.image_url || "/placeholder.svg?height=160&width=240"}
          alt={quest.title}
          className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 right-3">
          <Badge variant="outline" className="bg-black/50 text-white border-white/30">
            <Calendar className="w-3 h-3 mr-1" />
            {quest.time_limit_days ? `${quest.time_limit_days} days` : "No limit"}
          </Badge>
        </div>
      </div>

      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">{quest.title}</CardTitle>
        <CardDescription className="text-gray-300 text-sm line-clamp-2">{quest.description}</CardDescription>
      </CardHeader>

      <CardContent className="pt-0">
        <div className="mb-3 flex justify-between items-center text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-yellow-400" />
            {quest.total_xp} XP
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            {quest.participants}
          </span>
          <span>{quest.task_count} tasks</span>
        </div>

        <Link href={`/quest/${quest.id}`}>
          <Button
            size="sm"
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
          >
            Start Quest
          </Button>
        </Link>
      </CardContent>
    </Card>
  )
}
