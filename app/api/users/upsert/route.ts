import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

interface UserData {
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
}

export async function POST(request: NextRequest) {
  const { walletAddress, username, email, avatar_url, bio } = await request.json();
  
  if (!walletAddress) {
    return NextResponse.json({ error: "Missing wallet address" }, { status: 400 });
  }

  try {
    const supabase = await createServerClient(request);
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    // Prepare user data (without wallet_address since it's now in social_accounts)
    const userData: UserData = {};

    // Add optional fields if provided
    if (username) userData.username = username;
    if (email) userData.email = email.toLowerCase();
    if (avatar_url) userData.avatar_url = avatar_url;
    if (bio) userData.bio = bio;

    // Use a single transaction to update user profile and link wallet atomically
    const { data, error } = await supabase.rpc('update_user_and_link_wallet', {
      p_user_id: user.id,
      p_user_data: userData,
      p_wallet_address: walletAddress.toLowerCase()
    });

    if (error) {
      console.error("User update and wallet linking error:", error);
      return NextResponse.json({ error: "An unexpected error occurred while updating your profile" }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Unexpected error in user upsert:", error);
    return NextResponse.json({ error: "An unexpected error occurred" }, { status: 500 });
  }
}
