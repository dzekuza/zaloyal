import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({
        error: 'Missing Supabase configuration'
      }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Read request body to get user information
    const requestBody = await request.json();
    const { userEmail } = requestBody;
    
    console.log('Telegram linking request:', {
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
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
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

    // Generate a unique verification code
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Store the verification code in the database with the user's ID
    const { error: insertError } = await supabaseAdmin
      .from('telegram_verification_codes')
      .insert({
        verification_code: verificationCode,
        user_id: user.id, // Associate the code with the specific user
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() // 10 minutes
      });

    if (insertError) {
      console.error('Error storing verification code:', insertError);
      return NextResponse.json({
        error: 'Failed to generate verification code'
      }, { status: 500 });
    }

    console.log('Generated verification code:', verificationCode, 'for user:', user.id);

    return NextResponse.json({
      success: true,
      verificationCode: verificationCode,
      instructions: [
        '1. Add @belinkverify_bot to your Telegram group or channel',
        '2. Send the verification code: ' + verificationCode + ' in the group/channel',
        '3. The bot will link your group/channel to your profile'
      ],
      message: 'Please follow the instructions to link your Telegram group/channel'
    });

  } catch (error) {
    console.error('Telegram linking error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error
    }, { status: 500 });
  }
}

// Verify the Telegram account linking
export async function PUT(request: NextRequest) {
  try {
    const { verificationCode, telegramUserId, telegramUsername, telegramChatId } = await request.json();

    if (!verificationCode || !telegramUserId || !telegramUsername) {
      return NextResponse.json({
        error: 'Missing verification data'
      }, { status: 400 });
    }

    // Verify the verification code exists and is not expired
    const { data: codeData, error: codeError } = await supabaseAdmin
      .from('telegram_verification_codes')
      .select('*')
      .eq('verification_code', verificationCode)
      .gte('expires_at', new Date().toISOString())
      .is('used_at', null)
      .single();

    if (codeError || !codeData) {
      return NextResponse.json({
        error: 'Invalid or expired verification code'
      }, { status: 400 });
    }

    // Store the Telegram account information
    const { error: insertError } = await supabaseAdmin
      .from('social_accounts')
      .insert({
        user_id: codeData.user_id, // Use the user_id from the verification code
        platform: 'telegram',
        telegram_chat_id: telegramChatId,
        telegram_chat_title: 'Linked Group',
        telegram_chat_type: 'group',
        telegram_account_id: telegramUserId,
        telegram_username: telegramUsername,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing Telegram account:', insertError);
      return NextResponse.json({
        error: 'Failed to link Telegram account'
      }, { status: 500 });
    }

    // Mark the verification code as used
    await supabaseAdmin
      .from('telegram_verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('verification_code', verificationCode);

    return NextResponse.json({
      success: true,
      message: 'Telegram account linked successfully'
    });

  } catch (error) {
    console.error('Telegram verification error:', error);
    return NextResponse.json({
      error: 'Failed to verify Telegram account'
    }, { status: 500 });
  }
} 