import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('DEBUG: Incoming request body:', body);
    const { userWallet, userEmail, taskId } = body;

    if ((!userWallet && !userEmail) || !taskId) {
      console.log('DEBUG: Missing required parameters');
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 });
    }

    // Get user from database by wallet or email
    let userQuery = supabase.from("users").select("id, wallet_address, email");
    if (userWallet) {
      userQuery = userQuery.ilike("wallet_address", userWallet);
    } else if (userEmail) {
      userQuery = userQuery.eq("email", userEmail.toLowerCase());
    }
    const { data: user, error: userError } = await userQuery.single();
    console.log('DEBUG: User lookup result:', user, userError);
    if (!user || userError) {
      return NextResponse.json({ error: "User not found", userError }, { status: 404 });
    }

    // Fetch X (Twitter) username from Supabase Auth identities using the new get_twitter_identity RPC function
    const { data: identityData, error: twitterIdentityError } = await supabaseAdmin
      .rpc('get_twitter_identity', { user_id: user.id });
    if (twitterIdentityError) {
      console.log('DEBUG: Error fetching identities:', twitterIdentityError);
      return NextResponse.json({ error: "Failed to fetch user identities", twitterIdentityError }, { status: 500 });
    }
    const x_username = identityData && identityData[0]?.user_name;
    console.log('DEBUG: get_twitter_identity result:', identityData, 'x_username:', x_username);
    if (!x_username) {
      return NextResponse.json({ error: "No X (Twitter) username found in identity data" }, { status: 400 });
    }

    // Get task from database
    const { data: task, error: taskError } = await supabase.from("tasks").select("*").eq("id", taskId).single();
    console.log('DEBUG: Task lookup result:', task, taskError);
    if (!task || taskError) {
      return NextResponse.json({ error: "Task not found", taskError }, { status: 404 });
    }

    if (!user || !task) {
      return NextResponse.json({ error: "User or task not found" }, { status: 404 })
    }

    // Use the user's linked X (Twitter) username
    const xUsername = x_username
    if (!xUsername) {
      return NextResponse.json({ error: "No linked X (Twitter) account found for this user" }, { status: 400 })
    }

    // Real Twitter API v2 verification
    const isFollowing = await verifyTwitterFollow(xUsername, task.social_username)

    if (isFollowing) {
      // Create task submission
      await supabase.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { x_username: xUsername, verified_at: new Date().toISOString() },
        verification_data: { method: "twitter_api_v2", verified: true },
        xp_earned: task.xp_reward,
        verified_at: new Date().toISOString(),
      })

      // Update user XP
      if (user.wallet_address) {
        await supabase.rpc("increment_user_xp", {
          user_wallet: user.wallet_address.toLowerCase(),
          xp_amount: task.xp_reward,
        })
      }
    }

    return NextResponse.json({
      verified: isFollowing,
      message: isFollowing ? "Follow verified!" : "Please follow the account first",
      xpEarned: isFollowing ? task.xp_reward : 0,
    })
  } catch (err: any) {
    console.error('DEBUG: Exception in POST /api/verify/twitter-follow-real:', err);
    return NextResponse.json({ error: err.message || String(err) }, { status: 500 });
  }
}

async function verifyTwitterFollow(userHandle: string, targetHandle: string): Promise<boolean> {
  try {
    // Twitter API v2 requires Bearer Token
    const bearerToken = process.env.TWITTER_BEARER_TOKEN

    if (!bearerToken) {
      throw new Error("Twitter Bearer Token not configured")
    }

    // Step 1: Get user ID from username
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const userData = await userResponse.json()
    console.log('DEBUG: Twitter user lookup response:', userData)
    if (!userResponse.ok) {
      throw new Error("User not found on Twitter")
    }
    const userId = userData.data?.id
    if (!userId) {
      return false
    }

    // Step 2: Get target user ID
    const targetResponse = await fetch(`https://api.twitter.com/2/users/by/username/${targetHandle}`, {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    })

    const targetData = await targetResponse.json()
    console.log('DEBUG: Twitter target lookup response:', targetData)
    if (!targetResponse.ok) {
      throw new Error("Target user not found on Twitter")
    }
    const targetUserId = targetData.data?.id
    if (!targetUserId) {
      return false
    }

    // Step 3: Check if user follows target
    const followResponse = await fetch(
      `https://api.twitter.com/2/users/${userId}/following?user.fields=id&max_results=1000`,
      {
        headers: {
          Authorization: `Bearer ${bearerToken}`,
        },
      },
    )

    const followData = await followResponse.json()
    console.log('DEBUG: Twitter following list response:', followData)
    if (!followResponse.ok) {
      throw new Error("Failed to check following status")
    }
    const following = followData.data || []

    // Check if target user is in the following list
    return following.some((user: any) => user.id === targetUserId)
  } catch (error) {
    console.error("Twitter API error:", error)
    return false
  }
}

console.log('DEBUG: Is service role key defined?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
