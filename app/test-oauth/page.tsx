"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"

export default function TestOAuth() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  const testTwitterOAuth = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      console.log('🔍 Testing Twitter OAuth configuration...')

      // Test Supabase OAuth configuration
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          scopes: 'tweet.read users.read follows.read offline.access'
        }
      })

      if (error) {
        console.error('OAuth error:', error)
        setTestResults({
          timestamp: new Date().toISOString(),
          error: error.message,
          success: false,
          details: {
            code: error.status,
            message: error.message
          }
        })

        toast({
          title: "OAuth Test Failed",
          description: error.message,
          variant: "destructive",
        })
        return
      }

      if (data?.url) {
        setTestResults({
          timestamp: new Date().toISOString(),
          success: true,
          oauthUrl: data.url,
          provider: 'twitter'
        })

        toast({
          title: "OAuth Test Passed",
          description: "Twitter OAuth is properly configured. Redirecting...",
        })

        // Redirect to Twitter OAuth
        window.location.href = data.url
      } else {
        setTestResults({
          timestamp: new Date().toISOString(),
          error: "No OAuth URL returned",
          success: false
        })

        toast({
          title: "OAuth Test Failed",
          description: "No OAuth URL returned from Supabase",
          variant: "destructive",
        })
      }

    } catch (error) {
      console.error('OAuth test failed:', error)
      setTestResults({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })

      toast({
        title: "OAuth Test Failed",
        description: "An error occurred while testing OAuth",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openSupabaseDashboard = () => {
    window.open('https://supabase.com/dashboard', '_blank')
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
              Twitter OAuth Configuration Test
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This test checks if Twitter OAuth is properly configured in your Supabase project.
            </p>

            <Button
              onClick={testTwitterOAuth}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Twitter OAuth Configuration"}
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
                    {testResults.success ? "Configuration Valid" : "Configuration Error"}
                  </span>
                </div>

                {testResults.error && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">
                      {testResults.error}
                    </AlertDescription>
                  </Alert>
                )}

                {testResults.details && (
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error Code:</span>
                      <span className="text-white">{testResults.details.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error Message:</span>
                      <span className="text-white text-xs truncate max-w-48">
                        {testResults.details.message}
                      </span>
                    </div>
                  </div>
                )}

                {testResults.success && testResults.oauthUrl && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium">OAuth URL Generated</h4>
                    <div className="bg-blue-500/10 border border-blue-500 rounded p-3">
                      <div className="text-blue-300 text-xs break-all">
                        {testResults.oauthUrl}
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-4 space-y-2">
                  <Button
                    variant="outline"
                    onClick={openSupabaseDashboard}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Supabase Dashboard
                  </Button>
                  
                  <Button
                    variant="outline"
                    onClick={openTwitterPortal}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Open Twitter Developer Portal
                  </Button>
                </div>

                {testResults.error && (
                  <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500 rounded">
                    <h4 className="text-yellow-300 font-medium mb-2">How to Fix:</h4>
                    <ol className="text-yellow-200 text-sm space-y-1">
                      <li>1. Go to Supabase Dashboard → Authentication → Providers</li>
                      <li>2. Enable Twitter provider</li>
                      <li>3. Add your Twitter API credentials</li>
                      <li>4. Add callback URL: <code className="bg-yellow-500/20 px-1 rounded">http://localhost:3000/auth/callback/supabase</code></li>
                      <li>5. Test again</li>
                    </ol>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 