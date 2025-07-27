import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TelegramLoginWidget from '@/components/telegram-login-widget';
import { FileText, Trash, Twitter, MessageCircle, MessageSquare, ExternalLink, Download, BookOpen } from 'lucide-react';
import type { Task } from './types';

interface TaskListProps {
  tasks: Task[];
  verifyingTask: string | null;
  submissionData: Record<string, any>;
  isAdminOrCreator: () => boolean;
  setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
  setShowEditTask: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuiz: (fn: (s: Record<string, boolean>) => Record<string, boolean>) => void;
  handleTaskVerification: (task: Task) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  walletUser: any;
  isAuthenticated: boolean;
  onSignIn?: () => void;
}

function getAbsoluteUrl(url: string): string {
  return url?.match(/^https?:\/\//i) ? url : `https://${url}`;
}

function getTwitterTaskHeading(twitterTaskType: string): string {
  switch (twitterTaskType) {
    case 'tweet_reaction': return 'React to Tweet';
    case 'twitter_follow': return 'Follow on Twitter';
    case 'tweet': return 'Tweet';
    case 'twitter_space': return 'Join Twitter Space';
    case 'like': return 'Like Tweet';
    case 'retweet': return 'Retweet';
    case 'post': return 'Post';
    case 'reply': return 'Reply';
    case 'quote': return 'Quote';
    case 'bookmark': return 'Bookmark';
    default: return 'Twitter Task';
  }
}

// Helper to get heading and description based on task type/action
function getTaskHeadingAndDescription(task: Task) {
  if (task.type === 'learn') {
    return { heading: 'Quiz', description: 'Complete the quiz' };
  }
  if (task.type === 'visit') {
    return { heading: 'Visit URL', description: 'Visit the specified URL' };
  }
  if (task.type === 'social') {
    if (task.social_platform === 'twitter') {
      if (task.social_action === 'follow') return { heading: 'X', description: 'Follow' };
      if (task.social_action === 'like') return { heading: 'X', description: 'Like post' };
      if (task.social_action === 'retweet') return { heading: 'X', description: 'Retweet post' };
    }
    if (task.social_platform === 'discord' && task.social_action === 'join') {
      return { heading: 'Discord', description: 'Join channel' };
    }
    if (task.social_platform === 'telegram' && task.social_action === 'join') {
      return { heading: 'Telegram', description: 'Join channel' };
    }
  }
  return { heading: task.title || 'Task', description: task.description || '' };
}

// Helper to get task icon
function getTaskIcon(task: Task) {
  switch (task.type) {
    case 'social':
      if (task.social_platform === 'twitter') return <Twitter className="w-4 h-4" />;
      if (task.social_platform === 'discord') return <MessageCircle className="w-4 h-4" />;
      if (task.social_platform === 'telegram') return <MessageSquare className="w-4 h-4" />;
      return <ExternalLink className="w-4 h-4" />;
    case 'download':
      return <Download className="w-4 h-4" />;
    case 'learn':
      return <BookOpen className="w-4 h-4" />;
    default:
      return <FileText className="w-4 h-4" />;
  }
}

const TaskList: React.FC<TaskListProps> = React.memo(function TaskList({
  tasks,
  verifyingTask,
  submissionData,
  isAdminOrCreator,
  setEditingTask,
  setShowEditTask,
  setShowQuiz,
  handleTaskVerification,
  handleDeleteTask,
  walletUser,
  isAuthenticated,
  onSignIn,
}) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});

  if (!isAuthenticated && !isAdminOrCreator()) {
    return (
      <div className="flex items-center justify-center py-8">
        <Button
          variant="default"
          size="lg"
          onClick={onSignIn || (() => window.dispatchEvent(new CustomEvent('open-auth-dialog')))}
        >
          Sign in to participate
        </Button>
      </div>
    );
  }

  // Helper to handle 'Complete Task' click
  const handleCompleteTask = (task: Task) => {
    if (task.type === 'learn') {
      setShowQuiz(s => ({ ...s, [task.id]: true }));
      setCompletedTasks(prev => ({ ...prev, [task.id]: true }));
      return;
    }
    // Social, visit, form, download: open URL if present
    let url = '';
    if (task.type === 'social' && task.social_url) url = getAbsoluteUrl(task.social_url);
    if (task.type === 'visit' && task.visit_url) url = getAbsoluteUrl(task.visit_url);
    if (task.type === 'form' && task.form_url) url = getAbsoluteUrl(task.form_url);
    if (task.type === 'download' && task.download_url) url = getAbsoluteUrl(task.download_url);
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      setCompletedTasks(prev => ({ ...prev, [task.id]: true }));
    }
  };

  // Render task-specific content
  const renderTaskContent = (task: Task) => {
    switch (task.type) {
      case 'social':
        if (task.social_platform === 'twitter') {
          return (
            <div className="mt-3 p-3 bg-[#181818] rounded border border-[#282828]">
              <div className="flex items-center gap-2 mb-2">
                <Twitter className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-gray-300">X Task</span>
              </div>
              {task.social_action === 'follow' ? (
                task.social_url ? (
                  <a 
                    href={getAbsoluteUrl(task.social_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 text-sm break-all"
                  >
                    Follow {task.social_username || 'admin'} on X
                  </a>
                ) : (
                  <p className="text-blue-400 text-sm">Follow the admin's X account</p>
                )
              ) : task.social_url ? (
                <a 
                  href={getAbsoluteUrl(task.social_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm break-all"
                >
                  {task.social_url}
                </a>
              ) : (
                <p className="text-gray-300 text-sm">Complete the X task</p>
              )}
            </div>
          );
        }
        if (task.social_platform === 'discord') {
          return (
            <div className="mt-3 p-3 bg-[#181818] rounded border border-[#282828]">
              <div className="flex items-center gap-2 mb-2">
                <MessageCircle className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-gray-300">Discord Task</span>
              </div>
              {task.social_action === 'join' && task.social_url ? (
                <a 
                  href={getAbsoluteUrl(task.social_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-400 hover:text-indigo-300 text-sm break-all"
                >
                  Join {task.social_username || 'admin'} on Discord
                </a>
              ) : (
                <p className="text-indigo-400 text-sm">Join the admin's Discord channel</p>
              )}
            </div>
          );
        }
        if (task.social_platform === 'telegram') {
          return (
            <div className="mt-3 p-3 bg-[#181818] rounded border border-[#282828]">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-sm text-gray-300">Telegram Task</span>
              </div>
              {task.social_action === 'join' && task.social_url ? (
                <a 
                  href={getAbsoluteUrl(task.social_url)} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-400 text-sm break-all"
                >
                  Join {task.social_username || 'admin'} on Telegram
                </a>
              ) : (
                <p className="text-blue-500 text-sm">Join the admin's Telegram channel</p>
              )}
            </div>
          );
        }
        break;
      
      case 'visit':
        if (task.visit_url) {
          return (
            <div className="mt-3 p-3 bg-[#181818] rounded border border-[#282828]">
              <div className="flex items-center gap-2 mb-2">
                <ExternalLink className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300">Visit Task</span>
              </div>
              <a 
                href={getAbsoluteUrl(task.visit_url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 text-sm break-all"
              >
                {task.visit_url}
              </a>
              {task.visit_duration_seconds && (
                <p className="text-gray-300 text-xs mt-1">
                  Minimum visit duration: {task.visit_duration_seconds} seconds
                </p>
              )}
            </div>
          );
        }
        break;
      
      case 'learn':
        if (task.learn_content) {
          return (
            <div className="mt-3 p-3 bg-[#181818] rounded border border-[#282828]">
              <div className="flex items-center gap-2 mb-2">
                <BookOpen className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-gray-300">Quiz Task</span>
              </div>
              <div className="text-sm text-gray-300">
                {task.learn_content}
              </div>
              {task.learn_passing_score && (
                <p className="text-gray-300 text-xs mt-1">
                  Passing score: {task.learn_passing_score}%
                </p>
              )}
            </div>
          );
        }
        break;
    }
    return null;
  };

  return (
    <div className="space-y-3 md:space-y-4">
      {tasks.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No tasks available for this quest.</p>
        </div>
      ) : (
        tasks.map((task) => {
          const isCompleted = task.user_task_submissions;
          const isVerifying = verifyingTask === task.id;
          const isLocallyCompleted = completedTasks[task.id];
          return (
            <div key={task.id} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-[#111111] rounded-lg border border-[#282828] transition-all duration-300 hover:bg-[#181818] overflow-hidden">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTaskIcon(task)}
                      <h3 className="text-white font-semibold text-sm md:text-base">{getTaskHeadingAndDescription(task).heading}</h3>
                      {isCompleted && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs md:text-sm mb-3">{getTaskHeadingAndDescription(task).description}</p>
                    
                    {/* Task-specific content */}
                    {renderTaskContent(task)}
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    {isAdminOrCreator() && (
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline" onClick={() => { setEditingTask(task); setShowEditTask(true); }} className="h-6 w-6 md:h-8 md:w-8 p-0">
                          <FileText className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDeleteTask(task.id)} className="h-6 w-6 md:h-8 md:w-8 p-0">
                          <Trash className="w-3 h-3 md:w-4 md:h-4" />
                        </Button>
                      </div>
                    )}
                    {!isCompleted && !isAdminOrCreator() && (
                      <div className="flex gap-1 md:gap-2">
                        {task.type === 'learn' ? (
                          <Button onClick={() => { setShowQuiz(s => ({ ...s, [task.id]: true })); setCompletedTasks(prev => ({ ...prev, [task.id]: true })); }} className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm" size="sm">Start Quiz</Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => handleCompleteTask(task)}
                              disabled={isLocallyCompleted}
                              className="bg-gray-700 hover:bg-gray-800 text-white text-xs md:text-sm"
                              size="sm"
                            >
                              Complete Task
                            </Button>
                            <Button
                              onClick={() => handleTaskVerification(task)}
                              disabled={!isLocallyCompleted || isVerifying}
                              className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                              size="sm"
                            >
                              {isVerifying ? 'Verifying...' : 'Verify Task'}
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
});

export default TaskList; 