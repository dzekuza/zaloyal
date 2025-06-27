"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, Trophy, Star, Globe, Twitter, MessageSquare } from "lucide-react"

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserAndProjects = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setProjects([])
        setLoading(false)
        return
      }
      setCurrentUserId(user.id)
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false })
      setProjects(data || [])
      setLoading(false)
    }
    fetchUserAndProjects()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <p className="text-white text-xl">Loading your projects...</p>
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm p-8 max-w-md">
          <div className="text-center">
            <Users className="w-16 h-16 mx-auto text-blue-400 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-4">No Projects Found</h2>
            <p className="text-gray-300 mb-6">You haven't registered any projects yet.</p>
            <Link href="/register-project">
              <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white border-0">
                Register Project
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">My Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm hover:from-white/15 hover:to-white/10 transition overflow-hidden"
            >
              {/* Cover */}
              <div className="relative overflow-hidden">
                <img
                  src={project.cover_image_url || "/placeholder.svg?height=160&width=240"}
                  alt={project.name}
                  className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 left-3 flex gap-2">
                  {project.category && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-purple-500 text-white border-0 text-xs">
                      {project.category}
                    </Badge>
                  )}
                  {project.verified && (
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">✓</Badge>
                  )}
                </div>
                <div className="absolute top-3 right-3">
                  <img
                    src={project.logo_url || "/placeholder.svg?height=24&width=24"}
                    alt={`${project.name} logo`}
                    className="h-6 w-6 rounded-full border border-white/30"
                  />
                </div>
              </div>

              {/* Body */}
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white group-hover:text-blue-400 transition-colors">
                  {project.name}
                </CardTitle>
                <CardDescription className="text-gray-300 text-sm line-clamp-2">{project.description}</CardDescription>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="mb-3 flex justify-between items-center text-xs text-gray-400">
                  <span className="flex items-center gap-1">
                    <Trophy className="h-3 w-3 text-yellow-400" />
                    {project.quest_count} Quests
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {project.total_participants}
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="h-3 w-3 text-yellow-400" />
                    {project.total_xp_distributed} XP
                  </span>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  {project.website_url && <IconLink href={project.website_url} icon={Globe} />}
                  {project.twitter_url && <IconLink href={project.twitter_url} icon={Twitter} />}
                  {project.discord_url && <IconLink href={project.discord_url} icon={MessageSquare} />}
                </div>

                <Link href={`/project/${project.id}`}>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600"
                  >
                    View My Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

function getAbsoluteUrl(url: string) {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}

function IconLink({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <a href={getAbsoluteUrl(href)} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
      <Icon className="h-4 w-4" />
    </a>
  );
} 