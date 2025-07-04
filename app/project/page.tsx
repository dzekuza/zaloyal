"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, Zap, Trophy, Star, Globe, Twitter, MessageSquare } from "lucide-react"
import ProjectCard from "@/components/ProjectCard"
import EditProjectForm from "@/components/edit-project-form"
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export default function MyProjectsPage() {
  const [projects, setProjects] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<any | null>(null)

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <p className="text-white text-xl">Loading your projects...</p>
      </div>
    )
  }

  if (!projects.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
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

  const handleDelete = async (projectId: string) => {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      return;
    }
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) {
      alert("Failed to delete project: " + error.message);
      return;
    }
    setProjects((prev: any[]) => prev.filter((p) => p.id !== projectId));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">My Projects</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              currentUserId={currentUserId}
              onEdit={() => setEditingProject(project)}
              onDelete={() => handleDelete(project.id)}
            >
              <Link href={`/project/${project.id}`}>
                <Button
                  size="sm"
                  className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                >
                  View My Project
                </Button>
              </Link>
            </ProjectCard>
          ))}
        </div>
      </div>
      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={open => setEditingProject(open ? editingProject : null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl bg-[#0b4b34] border-[#0b4b34]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          {editingProject && <EditProjectForm project={editingProject} onSave={() => setEditingProject(null)} />}
        </DialogContent>
      </Dialog>
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