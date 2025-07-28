"use client"

import React, { useState, useEffect } from 'react'
import { AuthProvider } from '@/components/auth-provider-wrapper'
import AuthenticatedLayout from '@/components/authenticated-layout'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Prevent hydration mismatch by not rendering until mounted
  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#181818] flex items-center justify-center">
        <div className="text-white text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <AuthProvider>
      <AuthenticatedLayout>
        {children}
      </AuthenticatedLayout>
    </AuthProvider>
  )
}

