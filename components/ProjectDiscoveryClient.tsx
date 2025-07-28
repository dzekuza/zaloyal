"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Users, Zap, Trophy, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ProjectCard";

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
  if (!projects || !projects.length) return null;

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    onProjectDeleted(); // fallback for now
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
      {projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          currentUserId={currentUserId}
          onDelete={currentUserId && project.owner_id === currentUserId ? () => handleDeleteProject(project.id) : undefined}
          xpToCollect={project.xpToCollect}
        >
          <Link href={`/project/${project.id}`}>
            <Button
              size="sm"
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
            >
              {currentUserId && project.owner_id === currentUserId ? "View My Project" : "Explore Project"}
            </Button>
          </Link>
        </ProjectCard>
      ))}
    </div>
  );
}

interface ProjectDiscoveryClientProps {
  projects: Project[];
  categories: string[];
}

export default function ProjectDiscoveryClient({ projects, categories }: ProjectDiscoveryClientProps) {
  try {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

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
        {/* Hero Section */}
        <div className="text-center space-y-6 py-12 md:py-16">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white">
            Web3 Projects
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Discover amazing Web3 projects and complete their quests to earn rewards
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {safeProjects.length} Verified Projects
            </span>
            <span className="flex items-center gap-2">
              <Zap className="w-4 h-4" />
              {totalQuests} Active Quests
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="w-4 h-4" />
              {totalXPToCollect.toLocaleString()} XP to Collect
            </span>
          </div>
        </div>

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
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
                <Star className="h-5 w-5 text-yellow-400" />
                Featured Projects
              </h2>
              <ProjectGrid
                projects={featuredProjects}
                currentUserId={null}
                onProjectDeleted={() => window.location.reload()}
              />
            </div>
          )}

          {/* All Projects */}
          <div className="w-full">
            <h2 className="text-2xl font-bold text-white mb-6">All Projects</h2>
            <ProjectGrid
              projects={allProjects}
              currentUserId={null}
              onProjectDeleted={() => window.location.reload()}
            />
            
            {filteredProjects.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400 text-lg mb-2">No projects found</p>
                <p className="text-gray-500">Try different search terms or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error in ProjectDiscoveryClient:", error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-900 via-emerald-800 to-green-900">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold text-white">Something went wrong</h2>
          <p className="text-gray-300">Please try refreshing the page</p>
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
}