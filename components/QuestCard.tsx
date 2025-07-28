import { Card, CardHeader, CardContent, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Users, FileText } from 'lucide-react';
import React from 'react';

interface QuestCardProps {
  quest: any;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}

const QuestCard: React.FC<QuestCardProps> = ({ quest, children, actions }) => {
  return (
    <Card className="bg-[#111111] rounded-lg border border-[#282828] transition-all duration-300 hover:bg-[#181818] overflow-hidden">
      {/* Quest Cover Image */}
      <div className="relative w-full h-32 sm:h-40 rounded-t-lg overflow-hidden">
        <img 
          src={quest.image_url || "/quest-cover-fallback.jpeg"} 
          alt={quest.title}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Project Header */}
      {quest.projects?.name && (
        <div className="px-4 pt-4 pb-2 border-b border-[#282828]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-[#111111] border border-[#282828] flex items-center justify-center">
              {quest.projects.logo_url ? (
                <img 
                  src={quest.projects.logo_url} 
                  alt={quest.projects.name}
                  className="w-4 h-4 sm:w-6 sm:h-6 rounded-full object-cover"
                />
              ) : (
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" />
              )}
            </div>
            <span className="text-gray-300 text-sm sm:text-base font-medium">{quest.projects.name}</span>
          </div>
        </div>
      )}
      
      <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
            <div className="flex-1">
              <CardTitle className="text-base sm:text-lg text-white line-clamp-2">{quest.title}</CardTitle>
              <CardDescription className="text-gray-300 text-sm mt-1 line-clamp-3">{quest.description}</CardDescription>
            </div>
            {quest.status && (
              <Badge className={`shrink-0 ${
                quest.status === 'active' ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-300'
              }`}>
                {quest.status.charAt(0).toUpperCase() + quest.status.slice(1)}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0 space-y-3 sm:space-y-4">
        <div className="flex flex-wrap justify-between items-center text-xs sm:text-sm text-gray-400 gap-2">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 text-yellow-400" />
            <span>{quest.total_xp || 0} XP</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
            <span>{quest.participants || quest.participant_count || 0} participants</span>
          </span>
        </div>
        {children && (
          <div className="pt-2">
            {children}
          </div>
        )}
        {actions && (
          <div className="flex gap-2 pt-2">
            {actions}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuestCard; 