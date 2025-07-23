"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Filter, Users, Zap, Trophy, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import ProjectCard from "@/components/ProjectCard";
import BackgroundWrapper from "@/components/BackgroundWrapper";

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
  if (!projects.length) return null;

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) return;
    // You may need to import supabase here if you want to support delete from the client
    // const { error } = await supabase.from("projects").delete().eq("id", projectId)
    // if (error) {
    //   alert("Failed to delete project: " + error.message)
    // } else {
    //   onProjectDeleted()
    // }
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
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  const totalXPToCollect = useMemo(() => 
    projects.reduce((sum: number, p: Project) => sum + (p.xpToCollect || 0), 0), 
    [projects]
  );

  const totalQuests = useMemo(() => 
    projects.reduce((sum: number, p: Project) => sum + (p.quest_count || 0), 0), 
    [projects]
  );

  const filteredProjects = useMemo(() => {
    let filtered = projects;
    
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p: Project) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description?.toLowerCase().includes(searchLower),
      );
    }
    
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p: Project) => 
        p.category?.toLowerCase() === selectedCategory.toLowerCase()
      );
    }
    
    return filtered;
  }, [searchTerm, selectedCategory, projects]);

  const featuredProjects = useMemo(() => 
    filteredProjects.filter((p: Project) => p.featured), 
    [filteredProjects]
  );

  const allProjects = useMemo(() => 
    filteredProjects.filter((p: Project) => !p.featured), 
    [filteredProjects]
  );

  return (
    <BackgroundWrapper>
      {/* Hero Section */}
      <header className="relative overflow-hidden bg-[#181818]">
        <div className="w-full px-4 py-12 md:py-16 text-center space-y-6">
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-bold text-white">
            Web3 Projects
          </h1>
          <p className="text-lg md:text-xl text-gray-300 max-w-2xl mx-auto">
            Discover amazing Web3 projects and complete their quests to earn rewards
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-400">
            <span className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {projects.length} Verified Projects
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
      </header>

      {/* Gap between header and search/filter */}
      <div className="mb-8" />

      {/* Search and Filter Section */}
      <div className="w-full px-4">
        <div className="flex flex-col md:flex-row gap-4 mb-8">
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
              {categories.map((category) => (
                <SelectItem key={category} value={category.toLowerCase()} className="text-white hover:bg-[#06351f]">
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Featured Projects */}
        {featuredProjects.length > 0 && (
          <>
            <h2 className="flex items-center gap-2 text-2xl font-bold text-white mb-6">
              <Star className="h-5 w-5 text-yellow-400" />
              Featured Projects
            </h2>
            <ProjectGrid
              projects={featuredProjects}
              currentUserId={null}
              onProjectDeleted={() => window.location.reload()}
            />
          </>
        )}

        {/* All Projects */}
        <h2 className="text-2xl font-bold text-white my-6">All Projects</h2>
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
    </BackgroundWrapper>
  );
} 