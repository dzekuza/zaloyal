"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/components/ui/use-toast"
import { AlertCircle, CheckCircle, XCircle, ExternalLink, Info } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { useAuth } from "@/components/auth-provider-wrapper"

export default function TestOAuthFix() {
  const [loading, setLoading] = useState(false)
  const [testResults, setTestResults] = useState<any>(null)
  const { toast } = useToast()
  const { signInWithX } = useAuth()

  const testTwitterOAuth = async () => {
    setLoading(true)
    setTestResults(null)

    try {
      console.log('🔍 Testing Twitter OAuth after service role fix...')
      
      // Test the OAuth flow
      const result = await signInWithX()
      
      setTestResults({
        success: true,
        message: "OAuth initiated successfully",
        details: result
      })
      
      toast({
        title: "Success",
        description: "Twitter OAuth test initiated successfully",
      })
      
    } catch (error: any) {
      console.error('❌ OAuth test failed:', error)
      
      setTestResults({
        success: false,
        message: "OAuth test failed",
        error: error.message || error.toString()
      })
      
      toast({
        title: "Error",
        description: `OAuth test failed: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const checkDatabasePermissions = async () => {
    setLoading(true)
    
    try {
      console.log('🔍 Checking database permissions...')
      
      // Test if we can access social_accounts table
      const { data: socialAccounts, error: socialError } = await supabase
        .from('social_accounts')
        .select('*')
        .limit(1)
      
      // Test if we can access users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1)
      
      setTestResults({
        success: !socialError && !usersError,
        message: "Database permissions check completed",
        details: {
          social_accounts: socialError ? `Error: ${socialError.message}` : "Accessible",
          users: usersError ? `Error: ${usersError.message}` : "Accessible"
        }
      })
      
      if (!socialError && !usersError) {
        toast({
          title: "Success",
          description: "Database permissions are working correctly",
        })
      } else {
        toast({
          title: "Warning",
          description: "Some database permissions issues detected",
          variant: "destructive"
        })
      }
      
    } catch (error: any) {
      console.error('❌ Database permission check failed:', error)
      
      setTestResults({
        success: false,
        message: "Database permission check failed",
        error: error.message || error.toString()
      })
      
      toast({
        title: "Error",
        description: `Database check failed: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            OAuth Fix Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              This page tests the OAuth authentication after fixing the service role permissions.
              The previous error "permission denied for table social_accounts" should now be resolved.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button 
              onClick={checkDatabasePermissions}
              disabled={loading}
              variant="outline"
            >
              {loading ? "Checking..." : "Check Database Permissions"}
            </Button>
            
            <Button 
              onClick={testTwitterOAuth}
              disabled={loading}
            >
              {loading ? "Testing..." : "Test Twitter OAuth"}
            </Button>
          </div>

          {testResults && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Test Results</h3>
              
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {testResults.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">{testResults.message}</span>
                </div>
                
                {testResults.error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{testResults.error}</AlertDescription>
                  </Alert>
                )}
                
                {testResults.details && (
                  <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(testResults.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-semibold mb-2">What was fixed:</h4>
            <ul className="text-sm space-y-1">
              <li>• Added service_role policy for social_accounts table</li>
              <li>• Added service_role policy for users table</li>
              <li>• Fixed "permission denied for table social_accounts" error</li>
              <li>• Enabled proper OAuth authentication flow</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 