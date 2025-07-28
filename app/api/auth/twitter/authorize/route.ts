import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    console.log('DEBUG: Starting X OAuth flow');
    
    const supabase = await createServerClient(request);
    
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('DEBUG: Session check:', session ? 'found' : 'not found', sessionError);
    
    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('DEBUG: User check:', user ? 'found' : 'not found', userError);
    
    let authenticatedUser = user || session?.user;
    
    // If no authenticated user, return error
    if (!authenticatedUser) {
      console.log('DEBUG: No authenticated user found');
      return NextResponse.json(
        { error: 'Authentication required. Please sign in first.' },
        { status: 401 }
      );
    }

    console.log('DEBUG: User authenticated:', authenticatedUser.id, authenticatedUser.email);

    // Generate a unique state parameter for security
    const state = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    // Store OAuth state in database for verification
    const { error: stateError } = await supabase
      .from('oauth_states')
      .insert({
        user_id: authenticatedUser.id,
        platform: 'twitter',
        state: state,
        code_verifier: null, // Twitter doesn't use PKCE
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 minutes
        created_at: new Date().toISOString()
      });

    if (stateError) {
      console.error('Error storing OAuth state:', stateError);
      return NextResponse.json(
        { error: 'Failed to initialize OAuth flow' },
        { status: 500 }
      );
    }

    // Use Supabase's native OAuth flow
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${request.nextUrl.origin}/auth/callback/supabase`,
        scopes: 'tweet.read users.read follows.read offline.access',
        queryParams: {
          state: state
        }
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
