"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, XCircle, ExternalLink } from "lucide-react"

export default function TestTwitterAccess() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()

  const testTwitterOAuth = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      console.log('Testing Twitter OAuth configuration...')

      // Test 1: Check if Supabase Auth is configured
      const { data: { user } } = await supabase.auth.getUser()
      
      // Test 2: Try to initiate OAuth
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          queryParams: {
            force_login: 'true'
          }
        }
      })

      const results = {
        timestamp: new Date().toISOString(),
        userAuthenticated: !!user,
        oauthUrl: data?.url,
        error: error?.message,
        errorCode: error?.status,
        success: !error && !!data?.url
      }

      setTestResults(results)

      if (error) {
        console.error('Twitter OAuth test failed:', error)
        
        if (error.message?.includes('Error creating identity') || error.message?.includes('server_error')) {
          toast({
            title: "Elevated Access Required",
            description: "Your Twitter app likely needs elevated access. Check the Twitter Developer Portal.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "OAuth Configuration Error",
            description: error.message || "Unknown OAuth error",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "OAuth Test Successful",
          description: "Twitter OAuth is working correctly!",
        })
      }

    } catch (error) {
      console.error('Test error:', error)
      setTestResults({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      })
      
      toast({
        title: "Test Failed",
        description: "An unexpected error occurred during testing",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openTwitterPortal = () => {
    window.open('https://developer.twitter.com/en/portal/dashboard', '_blank')
  }

  const openElevatedAccess = () => {
    window.open('https://developer.twitter.com/en/portal/products/elevated', '_blank')
  }

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-6">
        <Card className="bg-[#111111] border-[#282828]">
          <CardHeader>
            <CardTitle className="text-white">Twitter OAuth Access Test</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This test will help diagnose if your Twitter app has the correct permissions for OAuth.
            </p>
            
            <Button 
              onClick={testTwitterOAuth} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Testing..." : "Test Twitter OAuth"}
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
                    <span className="text-gray-400">Timestamp:</span>
                    <span className="text-white">{new Date(testResults.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">User Authenticated:</span>
                    <Badge variant={testResults.userAuthenticated ? "default" : "secondary"}>
                      {testResults.userAuthenticated ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {testResults.oauthUrl && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">OAuth URL:</span>
                      <span className="text-green-400 text-xs truncate max-w-48">
                        {testResults.oauthUrl}
                      </span>
                    </div>
                  )}
                  {testResults.error && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error:</span>
                      <span className="text-red-400 text-xs max-w-48 text-right">
                        {testResults.error}
                      </span>
                    </div>
                  )}
                  {testResults.errorCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Error Code:</span>
                      <span className="text-red-400">{testResults.errorCode}</span>
                    </div>
                  )}
                </div>

                {testResults.error?.includes('Error creating identity') && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">
                      This error typically indicates that your Twitter app needs elevated access. 
                      Click the button below to check your app settings.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button 
                variant="outline" 
                onClick={openTwitterPortal}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Twitter Developer Portal
              </Button>
              <Button 
                variant="outline" 
                onClick={openElevatedAccess}
                className="flex-1"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Apply for Elevated Access
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 