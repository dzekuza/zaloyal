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
    const { walletAddress, userEmail } = requestBody;
    
    console.log('Wallet linking request:', {
      walletAddress: walletAddress ? walletAddress.substring(0, 10) + '...' : 'missing',
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
      console.error('Request body:', { walletAddress: !!walletAddress, userEmail });
      return NextResponse.json(
        { error: 'User not authenticated. Please log in first.' },
        { status: 401 }
      );
    }

    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }

    // Check if user already has a wallet linked
    const { data: existingWallet } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'solana');

    if (existingWallet && existingWallet.length > 0) {
      return NextResponse.json({
        error: 'Wallet already linked'
      }, { status: 400 });
    }

    // Store wallet account in social_accounts table
    const { error: insertError } = await supabase
      .from('social_accounts')
      .insert({
        user_id: user.id,
        platform: 'solana',
        account_id: walletAddress,
        username: walletAddress.substring(0, 8) + '...' + walletAddress.substring(-6),
        access_token: '', // No access token needed for wallet
        refresh_token: null,
        expires_at: null,
        profile_data: {
          wallet_address: walletAddress,
          network: 'solana'
        },
        verified: true,
        wallet_address: walletAddress,
        wallet_network: 'solana',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing wallet account:', insertError);
      return NextResponse.json(
        { error: 'Failed to link wallet' },
        { status: 500 }
      );
    }

    console.log('Successfully linked wallet:', {
      userId: user.id,
      userEmail: user.email,
      walletAddress: walletAddress.substring(0, 10) + '...'
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet linked successfully',
      walletAddress: walletAddress
    });

  } catch (error) {
    console.error('Wallet linking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 