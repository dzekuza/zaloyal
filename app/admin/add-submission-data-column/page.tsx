"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AddSubmissionDataColumn() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const handleAddColumn = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/add-submission-data-column', {
        method: 'POST',
      })
      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({ error: 'Failed to add column', details: error })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Add Submission Data Column</CardTitle>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={handleAddColumn} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Adding Column...' : 'Add submission_data Column'}
          </Button>
          
          {result && (
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 