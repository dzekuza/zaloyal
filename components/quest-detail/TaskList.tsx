import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import TelegramLoginWidget from '@/components/telegram-login-widget';
import { FileText, Trash, Twitter, MessageCircle, MessageSquare, ExternalLink, Download, BookOpen } from 'lucide-react';
import type { Task } from './types';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

interface TaskListProps {
  tasks: Task[];
  verifyingTask: string | null;
  submissionData: Record<string, any>;
  isAdminOrCreator: () => boolean;
  setEditingTask: React.Dispatch<React.SetStateAction<Task | null>>;
  setShowEditTask: React.Dispatch<React.SetStateAction<boolean>>;
  setShowQuiz: (fn: (s: Record<string, boolean>) => Record<string, boolean>) => void;
  handleTaskVerification: (Task: Task) => Promise<void>;
  handleDeleteTask: (taskId: string) => Promise<void>;
  walletUser: any;
  isAuthenticated: boolean;
  onSignIn?: () => void;
  questId?: string; // Add questId prop
}

// Helper to get task type display name
function getTaskTypeDisplay(task: Task) {
  switch (task.type) {
    case 'social':
      if (task.social_platform === 'twitter') return 'X';
      if (task.social_platform === 'discord') return 'Discord';
      if (task.social_platform === 'telegram') return 'Telegram';
      return 'Social';
    case 'visit':
      return 'Visit URL';
    case 'download':
      return 'Download';
    case 'learn':
      return 'Quiz';
    case 'form':
      return 'Form';
    default:
      return task.title || 'Task';
  }
}

// Helper to get task description
function getTaskDescription(task: Task) {
  switch (task.type) {
    case 'social':
      if (task.social_platform === 'twitter') {
        if (task.social_action === 'follow') return 'Follow';
        if (task.social_action === 'like') return 'Like post';
        if (task.social_action === 'retweet') return 'Retweet post';
      }
      if (task.social_platform === 'discord' && task.social_action === 'join') {
        return 'Join channel';
      }
      if (task.social_platform === 'telegram' && task.social_action === 'join') {
        return 'Join channel';
      }
      return 'Complete social task';
    case 'visit':
      return 'Visit the specified URL';
    case 'download':
      return 'Download the file';
    case 'learn':
      return 'Complete the quiz';
    case 'form':
      return 'Fill out the form';
    default:
      return task.description || '';
  }
}

// Helper to get task icon
function getTaskIcon(task: Task) {
  switch (task.type) {
    case 'social':
      if (task.social_platform === 'twitter') return <Twitter className="w-4 h-4 text-blue-400" />;
      if (task.social_platform === 'discord') return <MessageCircle className="w-4 h-4 text-indigo-400" />;
      if (task.social_platform === 'telegram') return <MessageSquare className="w-4 h-4 text-blue-500" />;
      return <ExternalLink className="w-4 h-4 text-gray-400" />;
    case 'download':
      return <Download className="w-4 h-4 text-green-400" />;
    case 'visit':
      return <ExternalLink className="w-4 h-4 text-purple-400" />;
    case 'form':
      return <FileText className="w-4 h-4 text-orange-400" />;
    case 'learn':
      return <BookOpen className="w-4 h-4 text-yellow-400" />;
    default:
      return <FileText className="w-4 h-4 text-gray-400" />;
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
  questId,
}) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [userSubmissions, setUserSubmissions] = useState<Record<string, any>>({});
  const [completingTask, setCompletingTask] = useState<string | null>(null);
  const { toast } = useToast();
  
  const adminStatus = isAdminOrCreator()
  console.log('DEBUG: TaskList render:', { adminStatus, tasksCount: tasks.length })

  // Check if user has completed tasks
  useEffect(() => {
    const checkUserSubmissions = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return

        const { data: submissions } = await supabase
          .from('user_task_submissions')
          .select('*')
          .eq('user_id', session.user.id)
          .eq('status', 'verified')

        const submissionsMap: Record<string, any> = {}
        submissions?.forEach(submission => {
          submissionsMap[submission.task_id] = submission
        })

        setUserSubmissions(submissionsMap)
      } catch (error) {
        console.error('Error checking user submissions:', error)
      }
    }

    checkUserSubmissions()
  }, [])

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

  // Helper to get absolute URL
  const getAbsoluteUrl = (url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  };

  // Helper to track task completion
  const trackTaskCompletion = async (task: Task, action: string, metadata?: any) => {
    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.log('No session available for task completion tracking')
        return
      }

      console.log('Session found for task completion:', session.user.email)
      console.log('Task object:', task)

      // Ensure we have all required fields
      if (!task.id) {
        console.error('Task ID is missing')
        return
      }

      const taskQuestId = task.quest_id || questId
      if (!taskQuestId) {
        console.error('Task quest_id is missing and no questId prop provided:', task)
        return
      }

      const completionData = {
        taskId: task.id,
        userId: session.user.id,
        questId: taskQuestId,
        action: action,
        taskType: task.type,
        metadata: metadata || {},
        timestamp: new Date().toISOString()
      }

      console.log('Sending task completion request:', completionData)

      const response = await fetch('/api/track-task-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(completionData)
      })

      console.log('Task completion response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Error tracking task completion:', response.statusText, errorText)
        console.error('Request data that failed:', completionData)
      } else {
        const result = await response.json()
        console.log('Task completion tracked successfully:', result)
      }
    } catch (error) {
      console.error('Error tracking task completion:', error)
    }
  };

  // Helper to handle 'Complete Task' click
  const handleCompleteTask = async (task: Task) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete tasks.",
        variant: "destructive",
      });
      return;
    }

    // Get current session
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      toast({
        title: "Authentication required",
        description: "Please sign in to complete tasks.",
        variant: "destructive",
      });
      return;
    }

    console.log('Session found for task completion:', session.user.email);
    console.log('Task object:', task);

    setCompletingTask(task.id);
    setCompletedTasks(prev => ({ ...prev, [task.id]: true }));

    try {
      const completionData = {
        taskId: task.id,
        userId: session.user.id,
        questId: task.quest_id || questId,
        action: task.type === 'download' ? 'downloaded' : 
                task.type === 'visit' ? 'visited' : 
                task.type === 'form' ? 'form_submitted' : 'completed',
        taskType: task.type,
        metadata: { url: task.social_url || task.visit_url || task.form_url || task.download_url },
        timestamp: new Date().toISOString(),
      };

      console.log('Sending task completion request:', completionData);

      const response = await fetch('/api/track-task-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify(completionData),
      });

      console.log('Task completion response status:', response.status);

      if (response.ok) {
        const result = await response.json();
        console.log('Task completion tracked successfully:', result);

        toast({
          title: "Task completed!",
          description: "Your task completion has been recorded.",
        });

        // For download, visit, and form tasks, automatically trigger verification
        if (task.type === 'download' || task.type === 'visit' || task.type === 'form') {
          console.log('DEBUG: Auto-triggering verification for task:', task.id);
          try {
            await handleTaskVerification(task);
            console.log('DEBUG: Auto-verification completed successfully');
          } catch (error) {
            console.error('DEBUG: Error in auto-verification:', error);
            toast({
              title: "Verification failed",
              description: "Task completed but verification failed. Please try again.",
              variant: "destructive",
            });
          }
        }
      } else {
        const errorData = await response.json();
        console.error('Task completion failed:', errorData);
        toast({
          title: "Task completion failed",
          description: errorData.message || "Failed to record task completion.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error completing task:', error);
      toast({
        title: "Error",
        description: "Failed to complete task. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingTask(null);
    }
  };

  // Render task-specific content
  const renderTaskContent = (task: Task) => {
    switch (task.type) {
      case 'social':
        if (task.social_platform === 'twitter') {
          return (
            <div className="mt-3">
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
            <div className="mt-3">
              {task.social_action === 'join' && task.social_url ? (
                <div className="space-y-2">
                  <a 
                    href={getAbsoluteUrl(task.social_url)} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-sm break-all block"
                  >
                    Join Discord Server
                  </a>
                  <p className="text-xs text-gray-400">
                    Click the link above to join the Discord server, then click "Verify Task" to confirm your membership.
                  </p>
                </div>
              ) : (
                <p className="text-indigo-400 text-sm">Join the Discord server</p>
              )}
            </div>
          );
        }
        if (task.social_platform === 'telegram') {
          return (
            <div className="mt-3">
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
            <div className="mt-3">
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
      
      case 'download':
        if (task.download_url) {
          return (
            <div className="mt-3 space-y-2">
              {task.download_title && (
                <p className="text-sm text-gray-300 font-medium">{task.download_title}</p>
              )}
              {task.download_description && (
                <p className="text-sm text-gray-300">{task.download_description}</p>
              )}
              <a 
                href={getAbsoluteUrl(task.download_url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-green-400 hover:text-green-300 text-sm break-all"
                onClick={() => trackTaskCompletion(task, 'downloaded', { url: task.download_url })}
              >
                <Download className="w-4 h-4" />
                Download File
              </a>
            </div>
          );
        }
        break;
      
      case 'learn':
        if (task.quiz_question) {
          return (
            <div className="mt-3">
              <div className="text-sm text-gray-300 mb-2">
                {task.quiz_question}
              </div>
              <div className="text-xs text-gray-400">
                {task.quiz_answer_1 && task.quiz_answer_2 && task.quiz_answer_3 && task.quiz_answer_4 ? 
                  '4 answer options available' : 
                  `${[task.quiz_answer_1, task.quiz_answer_2, task.quiz_answer_3, task.quiz_answer_4].filter(Boolean).length} answer options available`
                }
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
          const userSubmission = userSubmissions[task.id];
          const isCompleted = userSubmission && (userSubmission.status === 'verified' || userSubmission.verified === true);
          const isVerifying = verifyingTask === task.id;
          const isCompleting = completingTask === task.id;
          const isLocallyCompleted = completedTasks[task.id];
          const taskAdminStatus = isAdminOrCreator();
          console.log('DEBUG: Task render:', { taskId: task.id, taskAdminStatus, isCompleted, userSubmission });
          
          return (
            <div key={task.id} className="flex items-start gap-3 md:gap-4 p-3 md:p-4 bg-[#111111] rounded-lg border border-[#282828] transition-all duration-300 hover:bg-[#181818] overflow-hidden">
              <div className="flex-1 min-w-0">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getTaskIcon(task)}
                      <h3 className="text-white font-semibold text-sm md:text-base">{getTaskTypeDisplay(task)}</h3>
                      {isCompleted && (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>
                      )}
                    </div>
                    <p className="text-gray-300 text-xs md:text-sm mb-3">{getTaskDescription(task)}</p>
                    
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
                            {task.type === 'download' || task.type === 'visit' || task.type === 'form' ? (
                              <Button
                                onClick={() => handleCompleteTask(task)}
                                disabled={isCompleting}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                                size="sm"
                              >
                                {isCompleting ? 'Completing...' : 'Complete Task'}
                              </Button>
                            ) : (
                              <Button
                                onClick={async () => {
                                  await handleTaskVerification(task);
                                }}
                                disabled={isVerifying}
                                className="bg-green-600 hover:bg-green-700 text-white text-xs md:text-sm"
                                size="sm"
                              >
                                {isVerifying ? 'Verifying...' : 'Verify Task'}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                    {isCompleted && !isAdminOrCreator() && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Completed</Badge>
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