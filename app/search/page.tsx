"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Star, Users, Zap, Trophy, Globe, Twitter, MessageSquare } from "lucide-react"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const query = searchParams.get("q") || ""
  const [loading, setLoading] = useState(false)
  const [projects, setProjects] = useState<any[]>([])
  const [quests, setQuests] = useState<any[]>([])

  useEffect(() => {
    if (!query) return
    setLoading(true)
    Promise.all([
      supabase.from("projects").select("*")
        .ilike("name", `%${query}%`)
        .order("created_at", { ascending: false }),
      supabase.from("quests").select("*")
        .ilike("title", `%${query}%`)
        .order("created_at", { ascending: false })
    ]).then(([projRes, questRes]) => {
      setProjects(projRes.data || [])
      setQuests(questRes.data || [])
      setLoading(false)
    })
  }, [query])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 py-8">
      <div className="container mx-auto px-4">
        <h1 className="text-3xl font-bold text-white mb-6">Search Results for "{query}"</h1>
        {loading ? (
          <div className="text-white text-lg">Loading...</div>
        ) : (
          <>
            <section className="mb-10">
              <h2 className="text-2xl font-semibold text-white mb-4">Projects</h2>
              {projects.length === 0 ? (
                <div className="text-gray-400">No projects found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((project) => (
                    <Card key={project.id} className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm overflow-hidden">
                      <div className="relative overflow-hidden">
                        <img
                          src={project.cover_image_url || "/placeholder.svg?height=160&width=240"}
                          alt={project.name}
                          className="h-40 w-full object-cover"
                        />
                        <div className="absolute top-3 left-3 flex gap-2">
                          {project.category && (
                            <span className="bg-blue-500/80 text-white text-xs px-2 py-1 rounded">{project.category}</span>
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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">{project.name}</CardTitle>
                        <CardDescription className="text-gray-300 text-sm line-clamp-2">{project.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="mb-3 flex items-center gap-2">
                          {project.website_url && <IconLink href={project.website_url} icon={Globe} />}
                          {project.twitter_url && <IconLink href={project.twitter_url} icon={Twitter} />}
                          {project.discord_url && <IconLink href={project.discord_url} icon={MessageSquare} />}
                        </div>
                        <Link href={`/project/${project.id}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">View Project</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h2 className="text-2xl font-semibold text-white mb-4">Quests</h2>
              {quests.length === 0 ? (
                <div className="text-gray-400">No quests found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {quests.map((quest) => (
                    <Card key={quest.id} className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm overflow-hidden">
                      <div className="relative overflow-hidden">
                        <img
                          src={quest.image_url || "/placeholder.svg?height=160&width=240"}
                          alt={quest.title}
                          className="h-40 w-full object-cover"
                        />
                      </div>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg text-white">{quest.title}</CardTitle>
                        <CardDescription className="text-gray-300 text-sm line-clamp-2">{quest.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <Link href={`/quest/${quest.id}`}>
                          <Button size="sm" className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white">View Quest</Button>
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  )
}

function IconLink({ href, icon: Icon }: { href: string; icon: any }) {
  return (
    <Button
      size="sm"
      variant="outline"
      onClick={() => window.open(href, "_blank")}
      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
    >
      <Icon className="h-3 w-3" />
    </Button>
  )
} 