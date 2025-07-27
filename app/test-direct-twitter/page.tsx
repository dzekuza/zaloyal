"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Info } from "lucide-react"

export default function TestDirectTwitter() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  const testDirectTwitterOAuth = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      console.log('🔍 Testing direct Twitter OAuth...')

      // Get environment variables
      const clientId = process.env.NEXT_PUBLIC_TWITTER_CLIENT_ID || 'ZmpNMlozbXBxMDBSQkIKd1hPTG46MTpjaQ'
      const redirectUri = `${window.location.origin}/auth/callback/direct-twitter`
      
      // Build OAuth URL manually
      const oauthUrl = new URL('https://twitter.com/i/oauth2/authorize')
      oauthUrl.searchParams.set('response_type', 'code')
      oauthUrl.searchParams.set('client_id', clientId)
      oauthUrl.searchParams.set('redirect_uri', redirectUri)
      oauthUrl.searchParams.set('scope', 'tweet.read users.read follows.read offline.access')
      oauthUrl.searchParams.set('state', 'test-direct-oauth')
      oauthUrl.searchParams.set('code_challenge_method', 'S256')
      oauthUrl.searchParams.set('code_challenge', 'test-challenge') // In real app, generate this

      const results = {
        timestamp: new Date().toISOString(),
        oauthUrl: oauthUrl.toString(),
        clientId: clientId,
        redirectUri: redirectUri,
        success: true
      }

      setTestResults(results)

      toast({
        title: "Direct OAuth URL Generated",
        description: "Click the button below to test direct Twitter OAuth",
      })

    } catch (error) {
      console.error('Direct OAuth test failed:', error)
      setTestResults({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })

      toast({
        title: "Direct OAuth Test Failed",
        description: "An error occurred while testing direct OAuth",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openDirectOAuth = () => {
    if (testResults?.oauthUrl) {
      window.open(testResults.oauthUrl, '_blank')
    }
  }

  const openTwitterPortal = () => {
    window.open('https://developer.twitter.com/en/portal/dashboard', '_blank')
  }

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="bg-[#111111] border-[#282828]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5" />
              Direct Twitter OAuth Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This test bypasses Supabase Auth and tries direct Twitter OAuth to isolate the issue.
            </p>

            <Button
              onClick={testDirectTwitterOAuth}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Direct Twitter OAuth"}
            </Button>

            {testResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-white font-medium">
                    {testResults.success ? "Test Passed" : "Test Failed"}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Client ID:</span>
                    <span className="text-white text-xs truncate max-w-48">
                      {testResults.clientId}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Redirect URI:</span>
                    <span className="text-white text-xs truncate max-w-48">
                      {testResults.redirectUri}
                    </span>
                  </div>
                </div>

                {testResults.oauthUrl && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium">Generated OAuth URL</h4>
                    <div className="bg-blue-500/10 border border-blue-500 rounded p-3">
                      <div className="text-blue-300 text-xs break-all">
                        {testResults.oauthUrl}
                      </div>
                    </div>
                    <Button
                      onClick={openDirectOAuth}
                      variant="outline"
                      className="w-full"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Open Direct OAuth URL
                    </Button>
                  </div>
                )}

                {testResults.error && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">
                      {testResults.error}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={openTwitterPortal}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Check Twitter App Settings
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 