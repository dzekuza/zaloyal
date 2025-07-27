import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

// Simple in-memory rate limiting (in production, use Redis or similar)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(userId: string, action: string): boolean {
  const key = `${userId}:${action}`;
  const now = Date.now();
  const limit = rateLimitMap.get(key);
  
  if (!limit || now > limit.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + 60000 }); // 1 minute window
    return true;
  }
  
  if (limit.count >= 3) { // Max 3 attempts per minute
    return false;
  }
  
  limit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { action, email, walletAddress } = await request.json();
    
    const supabase = await createServerClient(request);
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile?.role || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Rate limiting for destructive operations
    if (action.startsWith('clear_') && !checkRateLimit(user.id, action)) {
      return NextResponse.json({ error: 'Rate limit exceeded. Please wait before trying again.' }, { status: 429 });
    }

    // Audit logging for destructive operations
    if (action.startsWith('clear_')) {
      const auditData = {
        user_id: user.id,
        action: action,
        details: {
          email: email || null,
          wallet_address: walletAddress || null,
          ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        },
        timestamp: new Date().toISOString()
      };

      // Log to audit_logs table if it exists
      try {
        await supabase
          .from('audit_logs')
          .insert(auditData);
      } catch (auditError) {
        console.error('Audit logging failed:', auditError);
        // Don't fail the operation if audit logging fails
      }
    }

    let result;

    switch (action) {
      case 'clear_all':
        // Clear all user data
        const { data: clearAllData, error: clearAllError } = await supabase.rpc('clear_all_user_data');
        if (clearAllError) {
          console.error('Error clearing all data:', clearAllError);
          return NextResponse.json({ error: 'An unexpected error occurred while clearing data' }, { status: 500 });
        }
        result = clearAllData;
        break;

      case 'clear_by_email':
        if (!email) {
          return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }
        // Clear specific user data by email
        const { data: clearEmailData, error: clearEmailError } = await supabase.rpc('clear_user_data_by_email', {
          p_email: email
        });
        if (clearEmailError) {
          console.error('Error clearing user data by email:', clearEmailError);
          return NextResponse.json({ error: 'An unexpected error occurred while clearing user data' }, { status: 500 });
        }
        result = clearEmailData;
        break;

      case 'clear_by_wallet':
        if (!walletAddress) {
          return NextResponse.json({ error: 'Wallet address is required' }, { status: 400 });
        }
        // Clear specific user data by wallet address
        const { data: clearWalletData, error: clearWalletError } = await supabase.rpc('clear_user_data_by_wallet', {
          p_wallet_address: walletAddress
        });
        if (clearWalletError) {
          console.error('Error clearing user data by wallet:', clearWalletError);
          return NextResponse.json({ error: 'An unexpected error occurred while clearing user data' }, { status: 500 });
        }
        result = clearWalletData;
        break;

      case 'get_summary':
        // Get data summary
        const { data: summaryData, error: summaryError } = await supabase.rpc('get_data_summary');
        if (summaryError) {
          console.error('Error getting data summary:', summaryError);
          return NextResponse.json({ error: 'An unexpected error occurred while retrieving data summary' }, { status: 500 });
        }
        result = summaryData;
        break;

      case 'list_users':
        // List all users
        const { data: usersData, error: usersError } = await supabase.rpc('list_all_users');
        if (usersError) {
          console.error('Error listing users:', usersError);
          return NextResponse.json({ error: 'An unexpected error occurred while listing users' }, { status: 500 });
        }
        result = { users: usersData };
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid action. Use: clear_all, clear_by_email, clear_by_wallet, get_summary, or list_users' 
        }, { status: 400 });
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Admin clear data error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request);
    
    // Check if user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Check if user has admin role
    const { data: userProfile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!userProfile?.role || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get data summary
    const { data: summaryData, error: summaryError } = await supabase.rpc('get_data_summary');
    if (summaryError) {
      console.error('Error getting data summary:', summaryError);
      return NextResponse.json({ error: 'An unexpected error occurred while retrieving data summary' }, { status: 500 });
    }

    return NextResponse.json(summaryData);

  } catch (error) {
    console.error('Admin get summary error:', error);
    return NextResponse.json({ 
      error: 'An unexpected error occurred' 
    }, { status: 500 });
  }
} 