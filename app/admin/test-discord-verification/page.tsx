'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function TestDiscordVerification() {
  const [taskId, setTaskId] = useState('')
  const [userId, setUserId] = useState('')
  const [questId, setQuestId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTest = async () => {
    if (!taskId || !userId || !questId) {
      toast({
        title: 'Missing Parameters',
        description: 'Please fill in all fields',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/verify/discord-join-real', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskId,
          userId,
          questId,
        }),
      })

      const data = await response.json()
      setResult({ status: response.status, data })

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Discord verification completed',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message || 'Verification failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: 'Error',
        description: 'Failed to test Discord verification',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Test Discord Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="taskId">Task ID</Label>
            <Input
              id="taskId"
              value={taskId}
              onChange={(e) => setTaskId(e.target.value)}
              placeholder="Enter task ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter user ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="questId">Quest ID</Label>
            <Input
              id="questId"
              value={questId}
              onChange={(e) => setQuestId(e.target.value)}
              placeholder="Enter quest ID"
            />
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Discord Verification'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-[#0a0a0a] rounded border">
              <h3 className="font-semibold text-white mb-2">Result:</h3>
              <pre className="text-sm text-gray-300 overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 