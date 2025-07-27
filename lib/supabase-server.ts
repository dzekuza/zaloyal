import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

export async function createServerClient(request: NextRequest) {
  let cookieStore;
  try {
    cookieStore = await cookies();
  } catch {
    // Handle the case where cookies() is not available
    cookieStore = {
      get: () => undefined,
      set: () => {},
      getAll: () => [],
      delete: () => {},
      has: () => false,
    };
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
      },
      global: {
        headers: {
          cookie: request.headers.get('cookie') || ''
        }
      }
    }
  )
}

// Utility function to get authenticated user
export async function getAuthenticatedUser(request: NextRequest) {
  const supabase = await createServerClient(request);
  
  // Check for Supabase Auth user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (user && !userError) {
    return { user, authType: 'supabase' };
  }
  
  return { user: null, authType: null };
} 