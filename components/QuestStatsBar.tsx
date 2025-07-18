import { Zap, Users, Trophy } from "lucide-react";

interface QuestStatsBarProps {
  totalXP: number;
  participants: number;
  taskCount: number;
}

export default function QuestStatsBar({ totalXP, participants, taskCount }: QuestStatsBarProps) {
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-400 mb-4">
      <span className="flex items-center gap-1">
        <Zap className="w-4 h-4 text-yellow-400" />
        <span className="hidden sm:inline">{totalXP} Total XP</span>
        <span className="sm:hidden">{totalXP} XP</span>
      </span>
      <span className="flex items-center gap-1">
        <Users className="w-4 h-4" />
        <span className="hidden sm:inline">{participants} Participants</span>
        <span className="sm:hidden">{participants}</span>
      </span>
      <span className="flex items-center gap-1">
        <Trophy className="w-4 h-4" />
        <span className="hidden sm:inline">{taskCount} Tasks</span>
        <span className="sm:hidden">{taskCount}</span>
      </span>
    </div>
  );
} 