import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export function createServerClient() {
  const cookieStore = cookies()

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        getAccessToken: async () => {
          const cookie = cookieStore.get('sb-access-token')
          return cookie?.value
        },
        getRefreshToken: async () => {
          const cookie = cookieStore.get('sb-refresh-token')
          return cookie?.value
        },
        setAccessToken: async (token) => {
          cookieStore.set('sb-access-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
          })
        },
        setRefreshToken: async (token) => {
          cookieStore.set('sb-refresh-token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 30 // 30 days
          })
        },
        removeAccessToken: async () => {
          cookieStore.delete('sb-access-token')
        },
        removeRefreshToken: async () => {
          cookieStore.delete('sb-refresh-token')
        }
      }
    }
  )
} 