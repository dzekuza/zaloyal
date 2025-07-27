import AuthTest from '@/components/auth-test'
import { createServerClient } from '@/lib/supabase-server'

export default async function TestAuthPage() {
  // Server-side auth check
  const supabase = await createServerClient({ headers: new Headers() } as any)
  const { data: { session } } = await supabase.auth.getSession()
  
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">Authentication Test Page</h1>
      
      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-semibold mb-2">Server-Side Auth Status:</h2>
        <pre className="text-sm">
          {session ? `Authenticated: ${session.user.email}` : 'Not authenticated'}
        </pre>
      </div>
      
      <AuthTest />
    </div>
  )
} 