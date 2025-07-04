import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, Zap, Trophy, Globe, Twitter, MessageSquare } from "lucide-react";

export default function ProjectCard({
  project,
  currentUserId,
  onEdit,
  onDelete,
  children,
}: {
  project: any,
  currentUserId?: string | null,
  onEdit?: () => void,
  onDelete?: () => void,
  children?: React.ReactNode,
}) {
  const isOwner = currentUserId && project.owner_id === currentUserId;
  return (
    <Card className="group bg-[#0b4b34c4] border-white/20 transition overflow-hidden">
      {/* Cover */}
      <div className="relative overflow-hidden">
        <img
          src={project.cover_image_url || "/placeholder.svg?height=160&width=240"}
          alt={project.name}
          className="h-40 w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
        <div className="absolute top-3 left-3 right-3 flex justify-between items-center gap-2">
          <div className="flex gap-2">
            {project.category && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">
                {project.category}
              </Badge>
            )}
            {project.verified && (
              <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 text-xs">✓</Badge>
            )}
          </div>
          {isOwner && (
            <div className="flex gap-2">
              {onEdit && (
                <Button size="sm" variant="outline" className="px-3 py-1 text-xs" onClick={onEdit}>Edit</Button>
              )}
              {onDelete && (
                <Button size="sm" variant="destructive" className="px-3 py-1 text-xs" onClick={onDelete}>Delete</Button>
              )}
            </div>
          )}
        </div>
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          {project.logo_url && (
            <img
              src={project.logo_url || "/placeholder.svg?height=24&width=24"}
              alt={`${project.name} logo`}
              className="h-8 w-8 rounded-full border border-white/30 bg-white"
            />
          )}
        </div>
      </div>
      {/* Body */}
      <CardHeader className="pb-3">
        <CardTitle className="text-lg text-white group-hover:text-green-400 transition-colors">
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
        {children}
      </CardContent>
    </Card>
  );
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