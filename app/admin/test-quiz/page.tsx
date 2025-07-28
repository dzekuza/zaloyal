'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase'

export default function TestQuiz() {
  const [taskId, setTaskId] = useState('1b6ff809-85e5-4453-97af-cb82769de670') // Quiz task ID
  const [answers, setAnswers] = useState('[0]')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTest = async () => {
    setLoading(true)
    try {
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()
      
      if (sessionError || !session) {
        toast({
          title: 'Authentication Required',
          description: 'Please sign in to test quiz submission',
          variant: 'destructive',
        })
        return
      }

      const response = await fetch('/api/verify/learn-completion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        credentials: 'include',
        body: JSON.stringify({
          taskId,
          answers: JSON.parse(answers),
          quizData: {
            correctAnswer: 0,
            isMultiSelect: false,
            totalAnswers: 4
          }
        })
      })

      const data = await response.json()
      setResult({ status: response.status, data })

      if (response.ok) {
        toast({
          title: 'Success',
          description: data.message || 'Quiz submission completed',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message || 'Quiz submission failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: 'Error',
        description: 'Failed to test quiz submission',
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
          <CardTitle>Test Quiz Submission</CardTitle>
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
            <Label htmlFor="answers">Answers (JSON array)</Label>
            <Input
              id="answers"
              value={answers}
              onChange={(e) => setAnswers(e.target.value)}
              placeholder="[0] for first answer"
            />
          </div>
          
          <Button 
            onClick={handleTest} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Quiz Submission'}
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