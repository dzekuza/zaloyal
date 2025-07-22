import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, Trophy, Globe, Twitter, MessageSquare, Building2 } from "lucide-react";
import Image from "next/image";

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
  discord_url?: string | null;
  github_url?: string | null;
  telegram_url?: string | null;
  medium_url?: string | null;
  total_xp_distributed?: number;
  quest_count?: number;
  total_participants?: number;
  xpToCollect?: number;
}

interface ProjectCardProps {
  project: any;
  currentUserId?: string | null;
  onEdit?: () => void;
  onDelete?: () => void;
  children?: React.ReactNode;
  xpToCollect?: number;
}

function PlaceholderCover({ name, logoUrl }: { name: string; logoUrl?: string }) {
  return (
    <div className="h-40 sm:h-48 md:h-56 w-full bg-gradient-to-br from-[#1a1a1a] via-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10 quest-placeholder-bg"></div>
      {/* Logo or fallback */}
      <div className="relative z-10 flex items-center justify-center">
        {logoUrl ? (
          <Image
            src={logoUrl}
            alt={`${name} logo`}
            width={80}
            height={80}
            loading="lazy"
            decoding="async"
            className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-white/20 bg-white/10 object-cover"
            style={{ color: "transparent" }}
            unoptimized
          />
        ) : (
          <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-full border-2 border-white/20 bg-white/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 sm:h-10 sm:w-10 text-white/60" />
          </div>
        )}
      </div>
      {/* Project name overlay */}
    </div>
  );
}

export default function ProjectCard({
  project,
  currentUserId,
  onEdit,
  onDelete,
  children,
  xpToCollect,
}: ProjectCardProps) {
  const isOwner = currentUserId && project.owner_id === currentUserId;
  const totalXp = typeof xpToCollect === 'number' ? xpToCollect : project.total_xp_distributed || 0;

  const getAbsoluteUrl = (url: string) => {
    return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
  };

  const IconLink = ({ href, icon: Icon }: { href: string; icon: any }) => (
    <a 
      href={getAbsoluteUrl(href)} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="hover:text-green-400 transition-colors"
      aria-label={`Visit ${href}`}
    >
      <Icon className="h-4 w-4" />
    </a>
  );

  return (
    <Card className="group bg-[#111111] rounded-lg border border-[#282828] transition-all duration-300 hover:bg-[#181818] overflow-hidden">
      {/* Cover Image */}
      <div className="relative overflow-hidden">
        {project.cover_image_url ? (
          <Image
            src={project.cover_image_url}
            alt={project.name}
            width={800}
            height={224}
            loading="lazy"
            decoding="async"
            className="h-40 sm:h-48 md:h-56 w-full object-cover group-hover:scale-105 transition-transform duration-300"
            style={{ color: "transparent" }}
            unoptimized
          />
        ) : (
          <div className="h-40 sm:h-48 md:h-56 w-full">
            <PlaceholderCover name={project.name} logoUrl={project.logo_url} />
          </div>
        )}
        
        {/* Top Overlay - Badges and Actions */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start gap-2">
          <div className="flex gap-2 flex-wrap">
            {project.category && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                {project.category}
              </Badge>
            )}
            {project.verified && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                ✓ Verified
              </Badge>
            )}
          </div>
          
          {isOwner && (
            <div className="flex gap-2">
              {onEdit && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="px-3 py-1 text-xs bg-[#111111]/80 backdrop-blur-sm border-white/20 hover:bg-white/10" 
                  onClick={onEdit}
                >
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button 
                  size="sm" 
                  variant="destructive" 
                  className="px-3 py-1 text-xs bg-red-600 hover:bg-red-700 text-white shadow-md border-0"
                  onClick={onDelete}
                >
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Bottom Overlay - Logo (only if cover image exists) */}
        {project.cover_image_url && project.logo_url && (
          <div className="absolute bottom-3 left-3">
            <Image
              src={project.logo_url}
              alt={`${project.name} logo`}
              width={32}
              height={32}
              loading="lazy"
              decoding="async"
              className="h-8 w-8 rounded-full border border-white/30 bg-white object-cover"
              style={{ color: "transparent" }}
              unoptimized
            />
          </div>
        )}
      </div>

      {/* Card Body */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg sm:text-xl md:text-2xl text-white group-hover:text-green-400 transition-colors line-clamp-1">
          {project.name}
        </CardTitle>
        <CardDescription className="text-gray-300 text-sm sm:text-base line-clamp-2">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-0 space-y-4">
        {/* Stats Row */}
        <div className="flex flex-wrap justify-between items-center text-xs sm:text-sm md:text-base text-gray-400 gap-2">
          <span className="flex items-center gap-1">
            <Trophy className="h-3 w-3 text-yellow-400" />
            <span className="hidden sm:inline">{project.quest_count} Quests</span>
            <span className="sm:hidden">{project.quest_count}</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="hidden sm:inline">{project.total_participants}</span>
            <span className="sm:hidden">{project.total_participants}</span>
          </span>
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-yellow-400" />
            <span className="hidden sm:inline">{totalXp} XP</span>
            <span className="sm:hidden">{totalXp}</span>
          </span>
        </div>

        {/* Social Links */}
        <div className="flex items-center gap-2 flex-wrap">
          {project.website_url && <IconLink href={project.website_url} icon={Globe} />}
          {project.discord_url && <IconLink href={project.discord_url} icon={MessageSquare} />}
          {project.twitter_username && (
            <a
              href={`https://twitter.com/${project.twitter_username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              @{project.twitter_username}
            </a>
          )}
        </div>

        {/* Action Button */}
        {children}
      </CardContent>
    </Card>
  );
} 