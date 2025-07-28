import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    
    // Get the current user session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    const user = session.user;

    // Get the wallet address from the request body
    const { walletAddress } = await request.json();
    
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