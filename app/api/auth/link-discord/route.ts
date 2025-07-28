import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    
    // Read request body once and store it
    const requestBody = await request.json();
    const { userEmail } = requestBody;
    
    console.log('Discord linking request:', {
      userEmail: userEmail || 'missing'
    });
    
    // Get the current user - try multiple authentication methods
    let user = null;
    let authError = null;
    
    // Method 1: Try to get session
    try {
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (session && session.user) {
        user = session.user;
        console.log('Found user via session:', user.email);
      } else {
        console.log('No session found, sessionErr:', sessionErr);
      }
    } catch (error) {
      console.log('Session check failed:', error);
    }
    
    // Method 2: If no session, try to get user directly
    if (!user) {
      try {
        const { data: { user: currentUser }, error: userErr } = await supabase.auth.getUser();
        if (currentUser) {
          user = currentUser;
          console.log('Found user via getUser:', user.email);
        } else {
          authError = userErr;
          console.log('No user found via getUser, userErr:', userErr);
        }
      } catch (error) {
        console.log('getUser check failed:', error);
        authError = error;
      }
    }
    
    // Method 3: If still no user, check if we have an email in the request body
    if (!user && userEmail) {
      console.log('Attempting email-based authentication for:', userEmail);
      
      // Use service role key to access auth.users table
      if (!supabaseServiceKey) {
        console.error('Missing service role key for admin operations');
        return NextResponse.json({
          error: 'Missing service role key for admin operations'
        }, { status: 500 });
      }
      
      const adminClient = createClient(supabaseUrl, supabaseServiceKey);
      
      try {
        // Query auth.users table directly by email
        const { data: authUsers, error: authUsersError } = await adminClient.auth.admin.listUsers();
        
        if (authUsersError) {
          console.error('Error fetching auth users:', authUsersError);
        } else {
          console.log('Found', authUsers.users.length, 'users in auth system');
          const foundUser = authUsers.users.find(u => u.email === userEmail);
          if (foundUser) {
            user = foundUser;
            console.log('Found user via email lookup:', user.email);
          } else {
            console.log('User not found in auth system for email:', userEmail);
            console.log('Available users:', authUsers.users.map(u => u.email));
          }
        }
      } catch (error) {
        console.error('Error in admin user lookup:', error);
      }
    }
    
    if (!user) {
      console.error('Authentication failed. No user found via any method.');
      console.error('Request body:', { userEmail });
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    // Check if user already has a Discord account linked
    const { data: existingAccounts } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'discord');

    if (existingAccounts && existingAccounts.length > 0) {
      return NextResponse.json({
        error: 'Discord account already linked'
      }, { status: 400 });
    }

    // Generate OAuth URL for Discord linking with state parameter
    const state = btoa(JSON.stringify({
      action: 'link',
      userId: user.id,
      timestamp: Date.now()
    }));

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${supabaseUrl}/auth/v1/callback`,
        scopes: 'identify email',
        queryParams: {
          prompt: 'consent',
          access_type: 'offline',
          state: state
        }
      }
    });

    if (error) {
      return NextResponse.json({
        error: 'Failed to generate Discord OAuth URL',
        details: error.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      oauthUrl: data.url,
      state: state
    });

  } catch (error) {
    console.error('Discord linking error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
} 