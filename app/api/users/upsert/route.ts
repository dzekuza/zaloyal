import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

interface UserData {
  wallet_address: string;
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
    // Prepare user data
    const userData: UserData = { 
      wallet_address: walletAddress.toLowerCase(),
    };

    // Add optional fields if provided
    if (username) userData.username = username;
    if (email) userData.email = email.toLowerCase();
    if (avatar_url) userData.avatar_url = avatar_url;
    if (bio) userData.bio = bio;

    // Upsert user by wallet address
    const { data, error } = await supabase
      .from("users")
      .upsert(userData, {
        onConflict: "wallet_address",
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error("User upsert error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ user: data });
  } catch (error) {
    console.error("Unexpected error in user upsert:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
