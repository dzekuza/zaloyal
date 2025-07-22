import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Users } from 'lucide-react';
import React from 'react';

interface QuestCardProps {
  quest: any;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, children, actions }) => {
  return (
    <Card className="bg-[#111111] rounded-lg border border-[#282828] transition-all duration-300 hover:bg-[#181818] overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-lg text-white">{quest.title}</CardTitle>
          <CardDescription className="text-gray-300 text-sm mt-1">{quest.description}</CardDescription>
        </div>
        {quest.status && (
          <Badge className={quest.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'}>
            {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
          </Badge>
        )}
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        <div className="flex flex-wrap justify-between items-center text-xs sm:text-sm md:text-base text-gray-400 gap-2 mb-2">
          <span className="flex items-center gap-1">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span>{quest.total_xp || 0} XP</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{quest.participants || 0} participants</span>
          </span>
        </div>
        {children}
        {actions && <div className="flex gap-2 mt-2">{actions}</div>}
      </CardContent>
    </Card>
  );
};

export default QuestCard; 