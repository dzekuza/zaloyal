import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin";

interface TwitterUserResponse {
  data?: {
    id: string;
    name: string;
    username: string;
  };
  errors?: unknown[];
}

interface TwitterFollowResponse {
  data?: Array<{ id: string }>;
  errors?: unknown[];
}

export async function POST(request: NextRequest) {
  try {
    const body: { userWallet?: string; userEmail?: string; taskId: string } = await request.json();
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
    let x_username = identityData && identityData[0]?.user_name;
    console.log('DEBUG: get_twitter_identity result:', identityData, 'x_username:', x_username);
    // Fallback: try users.x_username if not found in identities
    if (!x_username) {
      const { data: userProfile } = await supabase.from("users").select("x_username").eq("id", user.id).single();
      x_username = userProfile?.x_username;
      console.log('DEBUG: Fallback users.x_username:', x_username);
    }
    if (!x_username) {
      return NextResponse.json({ error: "No X (Twitter) username found. Please link your Twitter account in your profile before verifying this task." }, { status: 400 });
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

    // Determine which verification to run
    let verified = false;
    let message = "";
    if (task.social_action === "follow") {
      const result = await verifyTwitterFollow(xUsername, task.social_username);
      verified = result.verified;
      message = verified ? "Follow verified!" : result.error || "Please follow the account first";
    } else if (task.social_action === "like") {
      verified = await verifyTwitterLike(xUsername, task.social_post_id);
      message = verified ? "Like verified!" : "Please like the tweet first";
    } else if (task.social_action === "retweet") {
      verified = await verifyTwitterRetweet(xUsername, task.social_post_id);
      message = verified ? "Retweet verified!" : "Please retweet the tweet first";
    } else {
      return NextResponse.json({ error: "Unsupported social action" }, { status: 400 });
    }

    if (verified) {
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
      verified,
      message,
      xpEarned: verified ? task.xp_reward : 0,
    })
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('DEBUG: Exception in POST /api/verify/twitter-follow-real:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Twitter API v2 follow verification
async function verifyTwitterFollow(userHandle: string, targetHandle: string): Promise<{ verified: boolean, error?: string }> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) throw new Error("Twitter Bearer Token not configured");
    // Get user ID
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const userData: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: Twitter user lookup status:', userResponse.status);
    console.log('DEBUG: Twitter user lookup body:', userData);
    if (!userResponse.ok) return { verified: false, error: `Twitter user lookup failed: ${userResponse.status} ${JSON.stringify(userData)}` };
    const userId = userData.data?.id;
    if (!userId) return { verified: false, error: "User ID not found in Twitter response" };
    // Get target user ID
    const targetResponse = await fetch(`https://api.twitter.com/2/users/by/username/${targetHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const targetData: TwitterUserResponse = await targetResponse.json();
    console.log('DEBUG: Twitter target lookup status:', targetResponse.status);
    console.log('DEBUG: Twitter target lookup body:', targetData);
    if (!targetResponse.ok) return { verified: false, error: `Twitter target lookup failed: ${targetResponse.status} ${JSON.stringify(targetData)}` };
    const targetUserId = targetData.data?.id;
    if (!targetUserId) return { verified: false, error: "Target user ID not found in Twitter response" };
    // Check if user follows target
    const followResponse = await fetch(`https://api.twitter.com/2/users/${userId}/following`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const followData: TwitterFollowResponse = await followResponse.json();
    console.log('DEBUG: Twitter /following response status:', followResponse.status);
    console.log('DEBUG: Twitter /following response body:', followData);
    if (!followResponse.ok) return { verified: false, error: `Failed to check following status: ${followResponse.status} ${JSON.stringify(followData)}` };
    const following = followData.data || [];
    const isFollowing = following.some((user) => user.id === targetUserId);
    if (!isFollowing) return { verified: false, error: `User is not following the target account.` };
    return { verified: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Twitter API error (follow):", errMsg);
    return { verified: false, error: errMsg };
  }
}

// Helper: Twitter API v2 like verification
async function verifyTwitterLike(userHandle: string, tweetId: string): Promise<boolean> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) throw new Error("Twitter Bearer Token not configured");
    // Get user ID
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const userData: TwitterUserResponse = await userResponse.json();
    if (!userResponse.ok) throw new Error("User not found on Twitter");
    const userId = userData.data?.id;
    if (!userId) return false;
    // Get liked tweets
    const likesResponse = await fetch(`https://api.twitter.com/2/users/${userId}/liked_tweets`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const likesData: { data?: Array<{ id: string }> } = await likesResponse.json();
    if (!likesResponse.ok) throw new Error("Failed to fetch liked tweets");
    const likedTweets = likesData.data || [];
    return likedTweets.some((tweet) => tweet.id === tweetId);
  } catch (error) {
    console.error("Twitter API error (like):", error);
    return false;
  }
}

// Helper: Twitter API v2 retweet verification
async function verifyTwitterRetweet(userHandle: string, tweetId: string): Promise<boolean> {
  try {
    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
    if (!bearerToken) throw new Error("Twitter Bearer Token not configured");
    // Get user ID
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const userData: TwitterUserResponse = await userResponse.json();
    if (!userResponse.ok) throw new Error("User not found on Twitter");
    const userId = userData.data?.id;
    if (!userId) return false;
    // Get user's tweets (retweets included)
    const tweetsResponse = await fetch(`https://api.twitter.com/2/users/${userId}/tweets?expansions=referenced_tweets.id&tweet.fields=referenced_tweets`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const tweetsData: { data?: Array<{ referenced_tweets?: Array<{ type: string; id: string }> }> } = await tweetsResponse.json();
    if (!tweetsResponse.ok) throw new Error("Failed to fetch user tweets");
    const tweets = tweetsData.data || [];
    // Check if any tweet is a retweet of the target tweetId
    return tweets.some((tweet) => tweet.referenced_tweets?.some((ref) => ref.type === "retweeted" && ref.id === tweetId));
  } catch (error) {
    console.error("Twitter API error (retweet):", error);
    return false;
  }
}

console.log('DEBUG: Is service role key defined?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
