import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'User not authenticated' },
        { status: 401 }
      );
    }

    // Get the X username from the request body
    const { xUsername } = await request.json();
    
    if (!xUsername) {
      return NextResponse.json(
        { error: 'X username is required' },
        { status: 400 }
      );
    }

    // Update user profile with X username
    const { error: updateError } = await supabase
      .from('users')
      .update({
        x_username: xUsername,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating X username:', updateError);
      return NextResponse.json(
        { error: 'Failed to update X username' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'X username updated successfully'
    });

  } catch (error) {
    console.error('X link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 