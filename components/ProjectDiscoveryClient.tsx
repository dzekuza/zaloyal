"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "./auth-provider-wrapper";
import { supabase } from "@/lib/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Filter, Users, Zap, Trophy, Star } from "lucide-react";
import Link from "next/link";
import ProjectCard from "./ProjectCard";
import { HeroGeometric } from "@/components/ui/shape-landing-hero";

// Reusable error fallback component
function ErrorFallback({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
      <div className="text-center space-y-4">
        <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
        <p className="text-gray-300">{message}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Refresh Page
        </button>
      </div>
    </div>
  );
}

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

interface ProjectGridProps {
  projects: Project[];
  currentUserId: string | null;
  onProjectDeleted: () => void;
}

function ProjectGrid({ projects, currentUserId, onProjectDeleted }: ProjectGridProps) {
  async function handleDeleteProject(projectId: string) {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", projectId);
      if (error) throw error;
      onProjectDeleted();
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  }
}

interface ProjectDiscoveryClientProps {
  projects: Project[];
  categories: string[];
}

// Wrapper component to handle auth context safely
function ProjectDiscoveryClientWithAuth({ projects, categories }: ProjectDiscoveryClientProps) {
  let auth: ReturnType<typeof useAuth> | undefined;
  try {
    auth = useAuth();
  } catch (error) {
    console.error("Auth context not available:", error);
    return <ErrorFallback message="Authentication Error" />;
  }

  const { user, loading } = auth;
  const [userProjectXp, setUserProjectXp] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Add debugging information
  console.log("ProjectDiscoveryClient auth state:", { user: !!user, loading, userId: user?.id });

  // Timeout mechanism to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        console.log("ProjectDiscoveryClient: Loading timeout reached, forcing continue");
        setLoadingTimeout(true);
      }, 10000); // 10 second timeout

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [loading]);

  // Show loading state while auth is initializing (with timeout fallback)
  if (loading && !loadingTimeout) {
    console.log("ProjectDiscoveryClient: Showing loading state");
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <div className="text-center space-y-4">
          <div className="text-white text-lg">Loading authentication...</div>
          <div className="text-gray-400 text-sm">Please wait while we verify your session</div>
        </div>
      </div>
    );
  }

  // If loading timeout reached, show a message but continue
  if (loadingTimeout) {
    console.log("ProjectDiscoveryClient: Loading timeout reached, continuing with limited functionality");
  }

  console.log("ProjectDiscoveryClient: Auth loaded, user:", user?.email || "No user");

  // Calculate user XP for each project
  useEffect(() => {
    const calculateUserProjectXp = async () => {
      if (!user?.id) {
        console.log("ProjectDiscoveryClient: No user ID, clearing XP");
        setUserProjectXp({});
        return;
      }

      console.log("ProjectDiscoveryClient: Calculating XP for user:", user.id);

      try {
        const projectIds = projects.map(p => p.id);
        if (projectIds.length === 0) {
          console.log("ProjectDiscoveryClient: No projects to calculate XP for");
          return;
        }

        // Get all quest IDs for these projects
        const { data: quests, error: questsError } = await supabase
          .from("quests")
          .select("id, project_id")
          .in("project_id", projectIds);

        if (questsError) {
          console.error("ProjectDiscoveryClient: Error fetching quests:", questsError);
          setUserProjectXp({});
          return;
        }

        if (!quests || quests.length === 0) {
          console.log("ProjectDiscoveryClient: No quests found for projects");
          setUserProjectXp({});
          return;
        }

        const questIds = quests.map(q => q.id);
        console.log("ProjectDiscoveryClient: Found quest IDs:", questIds);

        // Get user's verified submissions for these projects' quests
        const { data: submissions, error: submissionsError } = await supabase
          .from("user_task_submissions")
          .select("task_id, quest_id")
          .in("quest_id", questIds)
          .eq("user_id", user.id)
          .eq("status", "verified");

        if (submissionsError) {
          console.error("ProjectDiscoveryClient: Error fetching submissions:", submissionsError);
          // Log more details about the error
          if (submissionsError.message) {
            console.error("ProjectDiscoveryClient: Submission error message:", submissionsError.message);
          }
          if (submissionsError.details) {
            console.error("ProjectDiscoveryClient: Submission error details:", submissionsError.details);
          }
          if (submissionsError.hint) {
            console.error("ProjectDiscoveryClient: Submission error hint:", submissionsError.hint);
          }
          setUserProjectXp({});
          return;
        }

        console.log("ProjectDiscoveryClient: Found submissions:", submissions?.length || 0);

        if (!submissions || submissions.length === 0) {
          console.log("ProjectDiscoveryClient: No verified submissions found");
          setUserProjectXp({});
          return;
        }

        // Get task IDs from submissions
        const taskIds = submissions.map(s => s.task_id);
        console.log("ProjectDiscoveryClient: Task IDs from submissions:", taskIds);

        // Get tasks with their XP rewards
        const { data: tasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, quest_id, xp_reward")
          .in("id", taskIds);

        if (tasksError) {
          console.error("ProjectDiscoveryClient: Error fetching tasks:", tasksError);
          setUserProjectXp({});
          return;
        }

        console.log("ProjectDiscoveryClient: Found tasks:", tasks?.length || 0);

        // Create a map of quest_id to project_id
        const questToProject = new Map(quests.map(q => [q.id, q.project_id]));
        
        // Create a map of task_id to xp_reward
        const taskToXp = new Map(tasks?.map(t => [t.id, t.xp_reward]) || []);

        // Sum XP per project
        const projectXp: Record<string, number> = {};
        submissions.forEach(submission => {
          const projectId = questToProject.get(submission.quest_id);
          const taskXp = taskToXp.get(submission.task_id) || 0;
          
          if (projectId) {
            projectXp[projectId] = (projectXp[projectId] || 0) + taskXp;
          }
        });

        console.log("ProjectDiscoveryClient: Calculated XP:", projectXp);
        setUserProjectXp(projectXp);
      } catch (error) {
        console.error("ProjectDiscoveryClient: Error calculating user project XP:", error);
        // Log more details about the caught error
        if (error instanceof Error) {
          console.error("ProjectDiscoveryClient: Error message:", error.message);
          console.error("ProjectDiscoveryClient: Error stack:", error.stack);
        }
        setUserProjectXp({});
      }
    };

    calculateUserProjectXp();
  }, [user?.id, projects]);

  try {
    // Ensure projects is always an array
    const safeProjects = useMemo(() => {
      return Array.isArray(projects) ? projects : [];
    }, [projects]);

    const totalXPToCollect = useMemo(() => 
      safeProjects.reduce((sum: number, p: Project) => sum + (p.xpToCollect || 0), 0), 
      [safeProjects]
    );

    const totalQuests = useMemo(() => 
      safeProjects.reduce((sum: number, p: Project) => sum + (p.quest_count || 0), 0), 
      [safeProjects]
    );

    const filteredProjects = useMemo(() => {
      let filtered = safeProjects;
      
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        filtered = filtered.filter(
          (p: Project) =>
            p.name?.toLowerCase().includes(searchLower) ||
            p.description?.toLowerCase().includes(searchLower),
        );
      }
      
      if (selectedCategory !== "all") {
        filtered = filtered.filter((p: Project) => 
          p.category?.toLowerCase() === selectedCategory.toLowerCase()
        );
      }
      
      return filtered;
    }, [searchTerm, selectedCategory, safeProjects]);

    const featuredProjects = useMemo(() => 
      filteredProjects.filter((p: Project) => p.featured), 
      [filteredProjects]
    );

    const allProjects = useMemo(() => 
      filteredProjects.filter((p: Project) => !p.featured), 
      [filteredProjects]
    );

    // Ensure categories is always an array
    const safeCategories = Array.isArray(categories) ? categories : [];

    return (
      <div className="w-full">
        {/* Loading timeout warning */}
        {loadingTimeout && (
          <div className="mb-4 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-300">
              <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
              <span className="text-sm">Authentication is taking longer than expected. Some features may be limited.</span>
            </div>
          </div>
        )}

        {/* Animated Hero Section */}
        <div className="relative w-full">
          <HeroGeometric 
            badge="Web3 Projects"
            title1="Discover Amazing"
            title2="Web3 Projects"
          />
          <div className="absolute bottom-8 md:bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="flex flex-wrap justify-center gap-2 md:gap-3 text-xs md:text-sm text-gray-300">
              <span className="flex items-center gap-1 md:gap-2 bg-black/40 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-green-500/30">
                <Users className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{safeProjects.length} Verified Projects</span>
                <span className="sm:hidden">{safeProjects.length} Projects</span>
              </span>
              <span className="flex items-center gap-1 md:gap-2 bg-black/40 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-green-500/30">
                <Zap className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{totalQuests} Active Quests</span>
                <span className="sm:hidden">{totalQuests} Quests</span>
              </span>
              <span className="flex items-center gap-1 md:gap-2 bg-black/40 backdrop-blur-sm px-2 md:px-3 py-1 md:py-1.5 rounded-full border border-green-500/30">
                <Trophy className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden sm:inline">{totalXPToCollect.toLocaleString()} XP to Collect</span>
                <span className="sm:hidden">{totalXPToCollect.toLocaleString()} XP</span>
              </span>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="w-full px-4 md:px-6 py-8">
          {/* Search and Filter Section - Column Layout */}
          <div className="flex flex-col gap-4 mb-8 w-full">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4 z-10" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-white/20 border-white/20 text-white placeholder:text-gray-200 backdrop-blur-sm focus:ring-2 focus:ring-green-500"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full md:w-48 bg-white/10 border-white/20 text-white backdrop-blur-sm">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-[#0b4b34] border-[#0b4b34]">
                  <SelectItem value="all" className="text-white hover:bg-[#06351f]">
                    All Categories
                  </SelectItem>
                  {safeCategories.map((category) => (
                    <SelectItem key={category} value={category.toLowerCase()} className="text-white hover:bg-[#06351f]">
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Projects Section - Column Layout */}
          <div className="flex flex-col gap-8">
            {/* Featured Projects */}
            {featuredProjects.length > 0 && (
              <div className="w-full">
                <h2 className="text-2xl font-bold text-white mb-6">Featured Projects</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {featuredProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      currentUserId={user?.id ? user.id : undefined}
                      xpToCollect={project.xpToCollect}
                      myXp={userProjectXp[project.id] || 0}
                    >
                      <Link href={`/project/${project.id}`}>
                        <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                          View Project
                        </Button>
                      </Link>
                    </ProjectCard>
                  ))}
                </div>
              </div>
            )}

            {/* All Projects */}
            <div className="w-full">
              <h2 className="text-2xl font-bold text-white mb-6">All Projects</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {allProjects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    currentUserId={user?.id ? user.id : undefined}
                    xpToCollect={project.xpToCollect}
                    myXp={userProjectXp[project.id] || 0}
                  >
                    <Link href={`/project/${project.id}`}>
                      <Button className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white">
                        View Project
                      </Button>
                    </Link>
                  </ProjectCard>
                ))}
              </div>
              
              {filteredProjects.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg mb-2">No projects found</p>
                  <p className="text-gray-500">Try different search terms or filters</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in ProjectDiscoveryClient:", error);
    return (
      <ErrorFallback message="Something went wrong" />
    );
  }
}

export default function ProjectDiscoveryClient({ projects, categories }: ProjectDiscoveryClientProps) {
  return (
    <ProjectDiscoveryClientWithAuth projects={projects} categories={categories} />
  );
}