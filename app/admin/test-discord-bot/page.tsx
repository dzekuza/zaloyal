'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

export default function TestDiscordBot() {
  const [guildId, setGuildId] = useState('')
  const [userId, setUserId] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleTestBot = async () => {
    if (!guildId || !userId) {
      toast({
        title: 'Missing Parameters',
        description: 'Please enter both Guild ID and User ID',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/test-discord-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guildId,
          userId,
        }),
      })

      const data = await response.json()
      setResult({ status: response.status, data })

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Discord bot test completed successfully',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || data.message || 'Discord bot test failed',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Test error:', error)
      toast({
        title: 'Error',
        description: 'Failed to test Discord bot',
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
          <CardTitle>Test Discord Bot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="guildId">Guild ID (Server ID)</Label>
            <Input
              id="guildId"
              value={guildId}
              onChange={(e) => setGuildId(e.target.value)}
              placeholder="Enter Discord server ID"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="userId">User ID</Label>
            <Input
              id="userId"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Enter Discord user ID"
            />
          </div>
          
          <Button 
            onClick={handleTestBot} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Discord Bot'}
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