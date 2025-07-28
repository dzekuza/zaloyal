"use client"

import React, { useState, useEffect } from 'react'
import { AuthProvider } from '@/components/auth-provider-wrapper'
import AuthenticatedLayout from '@/components/authenticated-layout'

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
    
    // Handle font loading errors to prevent JavaScript syntax errors
    const handleFontError = (event: Event) => {
      console.warn('Font loading error detected, using fallback fonts:', event)
    }
    
    // Listen for font loading errors
    document.addEventListener('error', handleFontError, true)
    
    // Cleanup
    return () => {
      document.removeEventListener('error', handleFontError, true)
    }
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

