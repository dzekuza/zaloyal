import { Trophy, Users, Zap } from "lucide-react";

interface ProjectStatsBarProps {
  questCount: number;
  participants: number;
  xpToCollect: number;
}

export default function ProjectStatsBar({ questCount, participants, xpToCollect }: ProjectStatsBarProps) {
  return (
    <div className="bg-black/20 border-b border-white/10">
      <div className="container mx-auto w-full max-w-full px-4 py-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-8">
          <div className="flex flex-row flex-wrap items-start sm:items-center gap-4 sm:gap-8 flex-1 w-full">
            <div className="flex items-center gap-2 text-yellow-200">
              <Trophy className="w-5 h-5" />
              <span className="font-semibold">{questCount}</span>
              <span className="text-gray-200 hidden sm:inline">Quests</span>
            </div>
            <div className="flex items-center gap-2 text-blue-200">
              <Users className="w-5 h-5" />
              <span className="font-semibold">{participants}</span>
              <span className="text-gray-200 hidden sm:inline">Participants</span>
            </div>
            <div className="flex items-center gap-2 text-green-400">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">{xpToCollect}</span>
              <span className="text-gray-200 hidden sm:inline">XP to Collect</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 