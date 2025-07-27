"use client"

import { useAuth } from '@/components/auth-provider-wrapper'
import { useXAuth } from '@/hooks/use-x-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function AuthTest() {
  const { user, signInWithX } = useAuth()
  const { account, isConnecting, connectX, disconnectX, getXAccount } = useXAuth()
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (user) {
      getXAccount()
    }
  }, [user, getXAccount])

  const checkAuthState = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data: identities } = await supabase.auth.getUserIdentities()
      
      setDebugInfo({
        session: session ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            provider: session.user.app_metadata?.provider,
            metadata: session.user.user_metadata
          }
        } : null,
        identities: identities?.identities || [],
        authUser: user,
        xAccount: account
      })
    } catch (error) {
      console.error('Error checking auth state:', error)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Authentication Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold mb-2">Current User:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {user ? JSON.stringify(user, null, 2) : 'Not authenticated'}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold mb-2">X Account:</h3>
            <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto">
              {account ? JSON.stringify(account, null, 2) : 'Not connected'}
            </pre>
          </div>

          <div className="flex gap-2">
            <Button onClick={signInWithX} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Sign in with X (Auth Provider)'}
            </Button>
            
            <Button onClick={connectX} disabled={isConnecting}>
              {isConnecting ? 'Connecting...' : 'Connect X (Hook)'}
            </Button>
            
            {account && (
              <Button onClick={disconnectX} variant="outline">
                Disconnect X
              </Button>
            )}
            
            <Button onClick={checkAuthState} variant="outline">
              Check Auth State
            </Button>
          </div>

          {debugInfo && (
            <div>
              <h3 className="font-semibold mb-2">Debug Info:</h3>
              <pre className="bg-gray-100 p-2 rounded text-sm overflow-auto max-h-96">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
} 