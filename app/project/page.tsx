"use client"

import { useEffect, useState, useMemo } from "react"
import Link from "next/link"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users } from "lucide-react"
import ProjectCard from "@/components/ProjectCard"
import EditProjectForm from "@/components/edit-project-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"

interface Project {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
  status?: string;
  category?: string | null;
  featured?: boolean | null;
  verified?: boolean | null;
  logo_url?: string | null;
  cover_image_url?: string | null;
  website_url?: string | null;
  twitter_url?: string | null;
  discord_url?: string | null;
  total_xp_distributed?: number;
  quest_count?: number;
  total_participants?: number;
  xpToCollect?: number;
}

export default function MyProjectsPage() {
  const [myProjects, setMyProjects] = useState<Project[]>([])
  const [allProjects, setAllProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkSessionAndFetch = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setMyProjects([]);
        setAllProjects([]);
        setLoading(false);
        return;
      }
      setCurrentUserId(user.id);
      // Fetch my projects
      const { data: myData, error: myError } = await supabase
        .from("projects")
        .select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, total_participants')
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (myError) {
        setError("Error loading your projects: " + myError.message);
        console.error("Error loading my projects:", myError);
        setLoading(false);
        return;
      }
      // Fetch all projects
      const { data: allData, error: allError } = await supabase
        .from("projects")
        .select('id, owner_id, name, logo_url, cover_image_url, category, status, featured, total_participants')
        .order("created_at", { ascending: false });
      if (allError) {
        setError("Error loading all projects: " + allError.message);
        console.error("Error loading all projects:", allError);
        setLoading(false);
        return;
      }
      // For each project, fetch all quests and sum total_xp
      const addXP = async (projects: Project[]) => Promise.all(
        (projects || []).map(async (project) => {
          const { data: quests, error: questsError } = await supabase
            .from("quests")
            .select("total_xp")
            .eq("project_id", project.id)
            .eq("status", "active");
          if (questsError) {
            setError("Error loading quests for project: " + project.id + ": " + questsError.message);
            console.error("Error loading quests for project", project.id, questsError);
          }
          const xpToCollect = (quests || []).reduce((sum, q) => sum + (q.total_xp || 0), 0);
          return { ...project, xpToCollect };
        })
      );
      setMyProjects(await addXP(myData || []));
      setAllProjects(await addXP((allData || []).filter((p) => p.owner_id !== user.id)));
      setLoading(false);
    };
    checkSessionAndFetch();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <p className="text-white text-xl">Loading your projects...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <p className="text-white text-xl">{error}</p>
      </div>
    )
  }

  if (!myProjects.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#181818]">
        <Card className="bg-[#111111] border-[#282828] backdrop-blur-sm p-8 max-w-md">
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
    setMyProjects((prev: Project[]) => prev.filter((p) => p.id !== projectId));
  };

  return (
    <div className="min-h-screen bg-[#181818]">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold text-white mb-8">My Projects</h1>
        {myProjects.length === 0 ? (
          <Card className="bg-gradient-to-br from-white/10 to-white/5 border-white/20 backdrop-blur-sm p-8 max-w-md mx-auto">
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
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {myProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={currentUserId}
                onEdit={() => setEditingProject(project)}
                onDelete={() => handleDelete(project.id)}
                xpToCollect={project.xpToCollect}
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
        )}
        <h2 className="text-3xl font-bold text-white mb-6 mt-12">All Projects</h2>
        {allProjects.length === 0 ? (
          <p className="text-gray-300">No other projects found.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {allProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={null}
                onEdit={undefined}
                onDelete={undefined}
                xpToCollect={project.xpToCollect}
              >
                <Link href={`/project/${project.id}`}>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
                  >
                    View Project
                  </Button>
                </Link>
              </ProjectCard>
            ))}
          </div>
        )}
      </div>
      {/* Edit Project Dialog */}
      <Dialog open={!!editingProject} onOpenChange={open => setEditingProject(open ? editingProject : null)}>
        <DialogContent className="max-h-[80vh] overflow-y-auto w-full max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update your project details and save your changes below.
            </DialogDescription>
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