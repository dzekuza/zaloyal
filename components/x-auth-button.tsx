"use client"

import { Button } from '@/components/ui/button'
import { useAuth } from '@/components/auth-provider-wrapper'
import { useXAuth } from '@/hooks/use-x-auth'
import { useEffect } from 'react'

export default function XAuthButton() {
  const { user } = useAuth()
  const { account, isConnecting, connectX, disconnectX, getXAccount } = useXAuth()

  useEffect(() => {
    if (user) {
      getXAccount()
    }
  }, [user, getXAccount])

  if (!user) {
    return (
      <Button disabled>
        Sign in to connect X
      </Button>
    )
  }

  if (isConnecting) {
    return (
      <Button disabled>
        Connecting...
      </Button>
    )
  }

  if (account) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">
          Connected as @{account.username}
        </span>
        <Button 
          variant="outline" 
          size="sm"
          onClick={disconnectX}
          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
        >
          Disconnect
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={connectX} className="bg-green-600 hover:bg-green-700 text-white">
      Connect X Account
    </Button>
  )
} 