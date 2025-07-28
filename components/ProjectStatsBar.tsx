import { Trophy, Users, Zap, Star } from "lucide-react";

interface ProjectStatsBarProps {
  questCount: number;
  participants: number;
  xpToCollect: number;
  myXp?: number;
}

export default function ProjectStatsBar({ questCount, participants, xpToCollect, myXp = 0 }: ProjectStatsBarProps) {
  return (
    <div className="bg-black/20 border-b border-white/10">
      <div className="px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-8">
          <div className="flex flex-row flex-wrap items-start sm:items-center gap-2 sm:gap-8 flex-1 w-full">
            <div className="flex items-center gap-2 text-yellow-200 text-xs sm:text-sm md:text-base">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold">{questCount}</span>
              <span className="text-gray-200 hidden sm:inline">Quests</span>
            </div>
            <div className="flex items-center gap-2 text-blue-200 text-xs sm:text-sm md:text-base">
              <Users className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold">{participants}</span>
              <span className="text-gray-200 hidden sm:inline">Participants</span>
            </div>
            <div className="flex items-center gap-2 text-green-400 text-xs sm:text-sm md:text-base">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold">{xpToCollect}</span>
              <span className="text-gray-200 hidden sm:inline">XP to Collect</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400 text-xs sm:text-sm md:text-base">
              <Star className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="font-semibold">{myXp}</span>
              <span className="text-gray-200 hidden sm:inline">My XP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 