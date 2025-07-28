import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({
      error: 'Missing Supabase configuration',
      configured: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
      }
    });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  try {
    // Test Discord OAuth URL generation
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'discord',
      options: {
        redirectTo: `${supabaseUrl}/auth/v1/callback`,
        scopes: 'identify email'
      }
    });

    if (error) {
      return NextResponse.json({
        error: error.message,
        code: error.status,
        details: error
      });
    }

    return NextResponse.json({
      success: true,
      oauthUrl: data.url,
      configured: {
        supabaseUrl: !!supabaseUrl,
        supabaseAnonKey: !!supabaseAnonKey,
      }
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Failed to generate Discord OAuth URL',
      details: error
    });
  }
} 