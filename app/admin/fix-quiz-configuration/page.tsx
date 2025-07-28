'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function FixQuizConfigurationPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleFixQuiz = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/fix-quiz-configuration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        setResult(data)
        toast({
          title: 'Success',
          description: 'Quiz configuration has been fixed successfully!',
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to fix quiz configuration',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error fixing quiz configuration:', error)
      toast({
        title: 'Error',
        description: 'Failed to fix quiz configuration',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="bg-[#111111] border-[#282828]">
        <CardHeader>
          <CardTitle className="text-white">Fix Quiz Configuration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-300">
              This tool fixes quiz tasks that have missing correct answer configurations.
              It will set the correct answer for the quiz task with ID: 1b6ff809-85e5-4453-97af-cb82769de670
            </p>
            
            <Button 
              onClick={handleFixQuiz}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Fixing...' : 'Fix Quiz Configuration'}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-[#0a0a0a] rounded-lg border border-[#282828]">
                <h3 className="text-white font-semibold mb-2">Result:</h3>
                <pre className="text-green-400 text-sm overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 