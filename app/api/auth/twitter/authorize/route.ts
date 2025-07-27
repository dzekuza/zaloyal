import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('DEBUG: Starting Supabase X OAuth flow');
    console.log('DEBUG: Request cookies:', request.headers.get('cookie')?.substring(0, 100) + '...');
    console.log('DEBUG: User ID header:', request.headers.get('x-user-id'));
    
    const supabase = await createServerClient(request);
    
    // First try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('DEBUG: Session check:', session ? 'found' : 'not found', sessionError);
    
    // Then try to get the user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('DEBUG: User check:', user ? 'found' : 'not found', userError);
    
    let authenticatedUser = user || session?.user;
    
    // If no user from session, check if user ID was passed in header
    if (!authenticatedUser) {
      const userIdHeader = request.headers.get('x-user-id');
      console.log('DEBUG: Checking user ID header:', userIdHeader);
      
      if (userIdHeader) {
        // Create a minimal user object for OAuth flow
        authenticatedUser = {
          id: userIdHeader,
          email: undefined,
          app_metadata: {},
          user_metadata: {}
        } as any;
        console.log('DEBUG: Using user ID from header:', userIdHeader);
      } else {
        console.log('DEBUG: No authenticated user found');
        console.log('DEBUG: Session error:', sessionError);
        console.log('DEBUG: User error:', userError);
        
        // Try to get user from cookies manually
        const cookies = request.headers.get('cookie');
        console.log('DEBUG: Raw cookies:', cookies);
        
        return NextResponse.json(
          { error: 'User not authenticated. Please sign in first.' },
          { status: 401 }
        );
      }
    }

    if (!authenticatedUser) {
      return NextResponse.json(
        { error: 'User not authenticated. Please sign in first.' },
        { status: 401 }
      );
    }

    console.log('DEBUG: User authenticated:', authenticatedUser.id, authenticatedUser.email);

    // Use Supabase's native OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback/supabase`,
        scopes: 'tweet.read users.read follows.read offline.access'
      }
    });

    if (error) {
      console.error('DEBUG: Supabase OAuth error:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to initialize X OAuth' },
        { status: 500 }
      );
    }

    console.log('DEBUG: Supabase OAuth URL generated:', data.url ? 'yes' : 'no');

    return NextResponse.json({
      authUrl: data.url,
      success: true
    });

  } catch (error) {
    console.error('X OAuth error:', error);
    return NextResponse.json(
      { error: 'Internal server error during OAuth initialization' },
      { status: 500 }
    );
  }
} 
