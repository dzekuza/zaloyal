"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Info } from "lucide-react"

export default function DebugOAuthHeaders() {
  const [loading, setLoading] = useState(false)
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const { toast } = useToast()

  const debugOAuthFlow = async () => {
    setLoading(true)
    setDebugInfo(null)

    try {
      console.log('🔍 Starting detailed OAuth debug...')

      // Step 1: Check current user
      const { data: { user } } = await supabase.auth.getUser()
      
      // Step 2: Check environment variables (client-side)
      const envInfo = {
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasTwitterClientId: !!process.env.SUPABASE_AUTH_EXTERNAL_TWITTER_CLIENT_ID,
        hasTwitterSecret: !!process.env.SUPABASE_AUTH_EXTERNAL_TWITTER_SECRET,
      }

      // Step 3: Try to initiate OAuth with detailed logging
      console.log('📡 Initiating OAuth with detailed logging...')
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'twitter',
        options: {
          redirectTo: `${window.location.origin}/auth/callback/supabase`,
          queryParams: {
            force_login: 'true',
            // Add additional parameters that might help
            response_type: 'code',
            scope: 'tweet.read users.read follows.read offline.access'
          }
        }
      })

      const debugData = {
        timestamp: new Date().toISOString(),
        userAuthenticated: !!user,
        userEmail: user?.email,
        userId: user?.id,
        environmentVariables: envInfo,
        oauthUrl: data?.url,
        error: error?.message,
        errorCode: error?.status,
        errorName: error?.name,
        success: !error && !!data?.url,
        // Additional debug info
        hasOAuthUrl: !!data?.url,
        errorType: error ? 'oauth_error' : 'none',
        provider: 'twitter'
      }

      setDebugInfo(debugData)

      if (error) {
        console.error('❌ OAuth debug failed:', error)
        
        // Analyze error type
        if (error.message?.includes('Error creating identity')) {
          toast({
            title: "OAuth 2.0 Configuration Issue",
            description: "Twitter app may need OAuth 2.0 enabled or elevated access",
            variant: "destructive",
          })
        } else if (error.message?.includes('invalid_client')) {
          toast({
            title: "Invalid API Keys",
            description: "Check your Twitter API Key and Secret",
            variant: "destructive",
          })
        } else if (error.message?.includes('redirect_uri_mismatch')) {
          toast({
            title: "Callback URL Mismatch",
            description: "Check your Twitter app callback URLs",
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
        console.log('✅ OAuth debug successful:', data)
        toast({
          title: "OAuth Debug Successful",
          description: "Twitter OAuth is working correctly!",
        })
      }

    } catch (error) {
      console.error('💥 Debug error:', error)
      setDebugInfo({
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: 'exception',
        success: false
      })
      
      toast({
        title: "Debug Failed",
        description: "An unexpected error occurred during debugging",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const openTwitterPortal = () => {
    window.open('https://developer.twitter.com/en/portal/dashboard', '_blank')
  }

  const openOAuthSettings = () => {
    window.open('https://developer.twitter.com/en/portal/dashboard', '_blank')
  }

  return (
    <div className="min-h-screen bg-[#181818] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="bg-[#111111] border-[#282828]">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Info className="w-5 h-5" />
              OAuth Headers & Token Debug
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              This debug tool will help identify issues with OAuth headers, tokens, and Twitter app configuration.
            </p>
            
            <Button 
              onClick={debugOAuthFlow} 
              disabled={loading}
              className="w-full"
            >
              {loading ? "Debugging..." : "Debug OAuth Headers & Tokens"}
            </Button>

            {debugInfo && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {debugInfo.success ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-white font-medium">
                    {debugInfo.success ? "Debug Passed" : "Debug Failed"}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 text-sm">
                    <h4 className="text-white font-medium">Basic Info</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Timestamp:</span>
                        <span className="text-white text-xs">
                          {new Date(debugInfo.timestamp).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">User Authenticated:</span>
                        <Badge variant={debugInfo.userAuthenticated ? "default" : "secondary"}>
                          {debugInfo.userAuthenticated ? "Yes" : "No"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Provider:</span>
                        <span className="text-white">{debugInfo.provider}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Error Type:</span>
                        <span className="text-red-400">{debugInfo.errorType}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <h4 className="text-white font-medium">Environment Variables</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Supabase URL:</span>
                        <Badge variant={debugInfo.environmentVariables?.hasSupabaseUrl ? "default" : "destructive"}>
                          {debugInfo.environmentVariables?.hasSupabaseUrl ? "Set" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Supabase Key:</span>
                        <Badge variant={debugInfo.environmentVariables?.hasSupabaseKey ? "default" : "destructive"}>
                          {debugInfo.environmentVariables?.hasSupabaseKey ? "Set" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Twitter Client ID:</span>
                        <Badge variant={debugInfo.environmentVariables?.hasTwitterClientId ? "default" : "destructive"}>
                          {debugInfo.environmentVariables?.hasTwitterClientId ? "Set" : "Missing"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Twitter Secret:</span>
                        <Badge variant={debugInfo.environmentVariables?.hasTwitterSecret ? "default" : "destructive"}>
                          {debugInfo.environmentVariables?.hasTwitterSecret ? "Set" : "Missing"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {debugInfo.error && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium">Error Details</h4>
                    <div className="bg-red-500/10 border border-red-500 rounded p-3">
                      <div className="text-red-300 text-sm">
                        <div><strong>Error:</strong> {debugInfo.error}</div>
                        {debugInfo.errorCode && <div><strong>Code:</strong> {debugInfo.errorCode}</div>}
                        {debugInfo.errorName && <div><strong>Name:</strong> {debugInfo.errorName}</div>}
                      </div>
                    </div>
                  </div>
                )}

                {debugInfo.oauthUrl && (
                  <div className="space-y-2">
                    <h4 className="text-white font-medium">OAuth URL</h4>
                    <div className="bg-green-500/10 border border-green-500 rounded p-3">
                      <div className="text-green-300 text-xs break-all">
                        {debugInfo.oauthUrl}
                      </div>
                    </div>
                  </div>
                )}

                {debugInfo.error?.includes('Error creating identity') && (
                  <Alert className="border-red-500 bg-red-500/10">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <AlertDescription className="text-red-300">
                      <strong>OAuth 2.0 Issue Detected:</strong> This error typically indicates:
                      <ul className="list-disc list-inside mt-2 space-y-1">
                        <li>Twitter app needs OAuth 2.0 enabled</li>
                        <li>App needs elevated access</li>
                        <li>API keys might be incorrect</li>
                        <li>Callback URLs might be wrong</li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={openTwitterPortal}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Twitter Developer Portal
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={openOAuthSettings}
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    OAuth Settings
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