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

    // Check if user has a wallet linked
    const { data: existingWallet, error: walletError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', 'solana')
      .single();

    if (walletError || !existingWallet) {
      return NextResponse.json({
        error: 'No wallet found to unlink'
      }, { status: 404 });
    }

    // Remove wallet from social_accounts table
    const { error: deleteError } = await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'solana');

    if (deleteError) {
      console.error('Error unlinking wallet:', deleteError);
      return NextResponse.json(
        { error: 'Failed to unlink wallet' },
        { status: 500 }
      );
    }

    console.log('Successfully unlinked wallet:', {
      userId: user.id,
      userEmail: user.email,
      walletAddress: existingWallet.wallet_address?.substring(0, 10) + '...'
    });

    return NextResponse.json({
      success: true,
      message: 'Wallet unlinked successfully'
    });

  } catch (error) {
    console.error('Wallet unlinking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 