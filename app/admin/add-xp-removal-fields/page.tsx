'use client'

import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

export default function AddXpRemovalFieldsPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const { toast } = useToast()

  const handleAddFields = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/add-xp-removal-fields', {
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
          description: data.message,
        })
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to add XP removal fields',
          variant: 'destructive',
        })
      }
    } catch (error) {
      console.error('Error adding XP removal fields:', error)
      toast({
        title: 'Error',
        description: 'An error occurred while adding XP removal fields',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Add XP Removal Fields</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAddFields} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Adding Fields...' : 'Add XP Removal Fields'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <h3 className="font-semibold text-green-400 mb-2">Result:</h3>
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