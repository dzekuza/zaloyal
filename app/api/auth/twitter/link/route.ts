
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

    // Get the Twitter username from the request body
    const { twitterUsername } = await request.json();
    
    if (!twitterUsername) {
      return NextResponse.json(
        { error: 'Twitter username is required' },
        { status: 400 }
      );
    }

    // Update user profile with Twitter username
    const { error: updateError } = await supabase
      .from('users')
      .update({
        twitter_username: twitterUsername,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Error updating Twitter username:', updateError);
      return NextResponse.json(
        { error: 'Failed to update Twitter username' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Twitter username updated successfully'
    });

  } catch (error) {
    console.error('Twitter link error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 
