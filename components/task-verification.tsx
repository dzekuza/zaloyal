"use client"

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useXAuth } from '@/hooks/use-x-auth';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, AlertCircle, ExternalLink } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  description: string;
  social_action: 'follow' | 'like' | 'retweet';
  social_url: string;
  verification_params: any;
  xp_reward: number;
}

interface VerificationStatus {
  status: 'pending' | 'verified' | 'failed' | 'cached';
  result?: {
    error?: string;
  };
}

interface TaskVerificationProps {
  task: Task;
  onVerificationComplete?: (taskId: string, verified: boolean) => void;
}

export function TaskVerification({ task, onVerificationComplete }: TaskVerificationProps) {
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const { account, enqueueVerification, pollVerificationStatus } = useXAuth();
  const { toast } = useToast();

  // Check if user has X account linked
  const hasXAccount = !!account;

  // Get verification status on mount
  useEffect(() => {
    if (hasXAccount) {
      checkVerificationStatus();
    }
  }, [hasXAccount, task.id]);

  const checkVerificationStatus = async () => {
    try {
      const status = await pollVerificationStatus(task.id, 1) as VerificationStatus; // Just check current status
      setVerificationStatus(status.status);
    } catch (error) {
      // No existing verification, that's fine
      setVerificationStatus(null);
    }
  };

  const handleVerify = async () => {
    if (!hasXAccount) {
      toast({
        title: "X Account Required",
        description: "Please link your X account first to verify this task.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsPolling(true);
      
      // Enqueue verification
      await enqueueVerification(task.id);
      
      // Poll for status updates
      const result = await pollVerificationStatus(task.id) as VerificationStatus;
      
      setVerificationStatus(result.status);
      
      if (result.status === 'verified') {
        toast({
          title: "Task Verified!",
          description: `You earned ${task.xp_reward} XP!`,
        });
        onVerificationComplete?.(task.id, true);
      } else if (result.status === 'failed') {
        toast({
          title: "Verification Failed",
          description: result.result?.error || "Please complete the task and try again.",
          variant: "destructive",
        });
        onVerificationComplete?.(task.id, false);
      }
      
    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: "Verification Error",
        description: error instanceof Error ? error.message : "Failed to verify task",
        variant: "destructive",
      });
    } finally {
      setIsPolling(false);
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'Verified';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Verifying...';
      default:
        return 'Not Verified';
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'verified':
        return 'bg-green-500 text-white';
      case 'failed':
        return 'bg-red-500 text-white';
      case 'pending':
        return 'bg-yellow-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getActionText = () => {
    switch (task.social_action) {
      case 'follow':
        return 'Follow';
      case 'like':
        return 'Like';
      case 'retweet':
        return 'Retweet';
      default:
        return 'Complete';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{task.title}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{task.xp_reward} XP</Badge>
            <Badge className={getStatusColor()}>
              {getStatusIcon()}
              <span className="ml-1">{getStatusText()}</span>
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300 mb-4">{task.description}</p>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-400">
              {getActionText()} this {task.social_action}:
            </span>
            <Button
              variant="outline"
              size="sm"
              asChild
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <a 
                href={task.social_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </a>
            </Button>
          </div>
          
          <Button
            onClick={handleVerify}
            disabled={!hasXAccount || isPolling || verificationStatus === 'verified'}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isPolling ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Verifying...
              </>
            ) : verificationStatus === 'verified' ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Verified
              </>
            ) : (
              'Verify'
            )}
          </Button>
        </div>
        
        {!hasXAccount && (
          <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-md">
            <p className="text-yellow-400 text-sm">
              Link your X account to verify this task automatically.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 