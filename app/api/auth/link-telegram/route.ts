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

    // Generate a unique verification code
    const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // Store the verification code temporarily (in production, use Redis or database)
    // For now, we'll use a simple approach - in production you'd want to store this
    // with an expiration time and link it to the session
    console.log('Generated verification code:', verificationCode);

    return NextResponse.json({
      success: true,
      verificationCode: verificationCode,
      instructions: [
        '1. Add @belinkverify_bot to your Telegram group or channel',
        '2. Start a chat with @belinkverify_bot',
        '3. Send the verification code: ' + verificationCode,
        '4. The bot will verify your account and link it to your profile'
      ],
      message: 'Please follow the instructions to link your Telegram account'
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

    // In production, you would:
    // 1. Verify the verification code is valid and not expired
    // 2. Check that the bot is actually installed in the user's group/channel
    // 3. Verify the telegramUserId and telegramUsername match the bot's verification

    // For now, we'll accept the verification for testing
    // In production, you'd implement proper verification logic

    // Store the Telegram account information
    const { error: insertError } = await supabaseAdmin
      .from('social_accounts')
      .insert({
        user_id: 'anonymous', // This will be updated when user completes the process
        platform: 'telegram',
        telegram_account_id: telegramUserId,
        telegram_username: telegramUsername,
        telegram_chat_id: telegramChatId,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error storing Telegram account:', insertError);
      return NextResponse.json({
        error: 'Failed to link Telegram account'
      }, { status: 500 });
    }

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