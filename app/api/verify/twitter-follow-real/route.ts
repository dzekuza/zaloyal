import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { extractTweetIdFromUrl, extractUsernameFromUrl } from "@/lib/twitter-utils"
import { supabaseAdmin } from "@/lib/supabase-admin";
import OAuth from 'oauth-1.0a';
import crypto from 'crypto';

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

    // Get user's Twitter credentials from the users table
    const { data: userProfile, error: profileError } = await supabase.from("users").select("x_username, x_id").eq("id", user.id).single();
    console.log('DEBUG: User profile lookup:', { userProfile, profileError });
    
    if (profileError || !userProfile?.x_username) {
      return NextResponse.json({ error: "No Twitter username found. Please link your Twitter account first." }, { status: 400 });
    }
    
    const twitterUsername = userProfile.x_username;
    console.log('DEBUG: Using Twitter username:', twitterUsername);

    // Get user's Twitter username
    let x_username = twitterUsername;
    console.log('DEBUG: Using Twitter username:', x_username);

    // Get task from database
    const { data: task, error: taskError } = await supabase.from("tasks").select("*", { count: "exact" }).eq("id", taskId).single();
    console.log('DEBUG: Task lookup result:', task, taskError);
    if (!task || taskError) {
      return NextResponse.json({ error: "Task not found", taskError }, { status: 404 });
    }

    // Get quest and then project
    const { data: quest, error: questError } = await supabase.from("quests").select("project_id").eq("id", task.quest_id).single();
    console.log('DEBUG: Quest lookup result:', quest, questError);
    if (!quest || questError) {
      return NextResponse.json({ error: "Quest not found", questError }, { status: 404 });
    }

    // Get project and its owner
    const { data: project, error: projectError } = await supabase.from("projects").select("id, owner_id").eq("id", quest.project_id).single();
    console.log('DEBUG: Project lookup result:', project, projectError);
    if (!project || projectError) {
      return NextResponse.json({ error: "Project not found", projectError }, { status: 404 });
    }
    const { data: owner, error: ownerError } = await supabase.from("users").select("x_username, x_id, x_avatar_url").eq("id", project.owner_id).single();
    if (!owner || ownerError) {
      return NextResponse.json({ error: "Project owner not found", ownerError }, { status: 404 });
    }
    // Use owner's X identity as project's X identity
    const projectXUsername = owner.x_username;
    const projectXId = owner.x_id;
    const projectXAvatarUrl = owner.x_avatar_url;

    if (!user || !task) {
      return NextResponse.json({ error: "User or task not found" }, { status: 404 })
    }

    // Use the user's linked X (Twitter) username
    const xUsername = x_username
    if (!xUsername) {
      return NextResponse.json({ error: "No linked X (Twitter) account found for this user" }, { status: 400 })
    }

    // Check if Twitter API credentials are configured
    const twitterApiKey = process.env.TWITTER_API_KEY;
    const twitterApiSecret = process.env.TWITTER_API_SECRET;
    const twitterBearer = process.env.TWITTER_BEARER;
    
    console.log('DEBUG: Twitter API credentials check:', {
      hasApiKey: !!twitterApiKey,
      hasApiSecret: !!twitterApiSecret,
      hasBearer: !!twitterBearer
    });
    
    if (!twitterApiKey || !twitterApiSecret || !twitterBearer) {
      return NextResponse.json({ 
        error: "Twitter API credentials not configured. Please check environment variables." 
      }, { status: 500 });
    }

    // Determine which verification to run
    let verified = false;
    let message = "";
    
    if (task.social_action === "follow") {
      // For follow verification, we can use Application-Only auth to check if the user exists
      const result = await verifyTwitterFollowBasic(xUsername, projectXUsername);
      verified = result.verified;
      message = verified ? "Follow verified!" : result.error || "Please follow the account first";
    } else if (task.social_action === "like") {
      // Extract tweet ID from social_url if social_post_id is not available
      let tweetId = task.social_post_id;
      if (!tweetId && task.social_url) {
        tweetId = extractTweetIdFromUrl(task.social_url);
      }
      
      if (!tweetId) {
        return NextResponse.json({ 
          error: "Tweet ID not found. Please check the task configuration." 
        }, { status: 400 });
      }
      
      // For like verification, we need OAuth 1.0a
      const oauth = new OAuth({
        consumer: {
          key: twitterApiKey,
          secret: twitterApiSecret,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string: string, key: string) {
          return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64');
        },
      });
      
      // Note: For OAuth 1.0a, we need user's access tokens which aren't available
      // For now, we'll use Application-Only auth and provide a clear message
      verified = false;
      message = "Like verification requires OAuth authentication. Please link your Twitter account through OAuth to verify likes.";
    } else if (task.social_action === "retweet") {
      // Extract tweet ID from social_url if social_post_id is not available
      let tweetId = task.social_post_id;
      if (!tweetId && task.social_url) {
        tweetId = extractTweetIdFromUrl(task.social_url);
      }
      
      if (!tweetId) {
        return NextResponse.json({ 
          error: "Tweet ID not found. Please check the task configuration." 
        }, { status: 400 });
      }
      
      // For retweet verification, we need OAuth 1.0a
      const oauth = new OAuth({
        consumer: {
          key: twitterApiKey,
          secret: twitterApiSecret,
        },
        signature_method: 'HMAC-SHA1',
        hash_function(base_string: string, key: string) {
          return crypto
            .createHmac('sha1', key)
            .update(base_string)
            .digest('base64');
        },
      });
      
      // Note: For OAuth 1.0a, we need user's access tokens which aren't available
      // For now, we'll use Application-Only auth and provide a clear message
      verified = false;
      message = "Retweet verification requires OAuth authentication. Please link your Twitter account through OAuth to verify retweets.";
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
        verification_data: { method: "twitter_oauth_v1", verified: true },
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
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper: Twitter API v2 follow verification with OAuth 1.0a
async function verifyTwitterFollowOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userHandle: string, targetHandle: string): Promise<{ verified: boolean, error?: string }> {
  try {
    console.log('DEBUG: Verifying follow with OAuth - userHandle:', userHandle, 'targetHandle:', targetHandle);
    
    // Get user ID using OAuth
    const userData = {
      url: `https://api.twitter.com/2/users/by/username/${userHandle}`,
      method: 'GET',
    };
    const userHeaders = oauth.toHeader(oauth.authorize(userData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const userResponse = await fetch(userData.url, {
      method: userData.method,
      headers: {
        ...userHeaders,
      },
    });
    const userResult: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: OAuth user lookup response:', userResponse.status, userResult);
    
    if (!userResponse.ok) return { verified: false, error: `Twitter user lookup failed: ${userResponse.status}` };
    const userId = userResult.data?.id;
    if (!userId) return { verified: false, error: "User ID not found in Twitter response" };
    
    // Get target user ID using OAuth
    const targetData = {
      url: `https://api.twitter.com/2/users/by/username/${targetHandle}`,
      method: 'GET',
    };
    const targetHeaders = oauth.toHeader(oauth.authorize(targetData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const targetResponse = await fetch(targetData.url, {
      method: targetData.method,
      headers: {
        ...targetHeaders,
      },
    });
    const targetResult: TwitterUserResponse = await targetResponse.json();
    console.log('DEBUG: OAuth target lookup response:', targetResponse.status, targetResult);
    
    if (!targetResponse.ok) return { verified: false, error: `Twitter target lookup failed: ${targetResponse.status}` };
    const targetUserId = targetResult.data?.id;
    if (!targetUserId) return { verified: false, error: "Target user ID not found in Twitter response" };
    
    // Check if user follows target using OAuth
    const followData = {
      url: `https://api.twitter.com/2/users/${userId}/following`,
      method: 'GET',
    };
    const followHeaders = oauth.toHeader(oauth.authorize(followData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const followResponse = await fetch(followData.url, {
      method: followData.method,
      headers: {
        ...followHeaders,
      },
    });
    const followResult: TwitterFollowResponse = await followResponse.json();
    console.log('DEBUG: OAuth following response:', followResponse.status, followResult);
    
    if (!followResponse.ok) return { verified: false, error: `Failed to check following status: ${followResponse.status}` };
    const following = followResult.data || [];
    const isFollowing = following.some((user) => user.id === targetUserId);
    console.log('DEBUG: Follow verification result:', isFollowing);
    
    if (!isFollowing) return { verified: false, error: `User is not following the target account.` };
    return { verified: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Twitter OAuth API error (follow):", errMsg);
    return { verified: false, error: errMsg };
  }
}

// Helper: Twitter API v2 follow verification with Application-Only auth
async function verifyTwitterFollowBasic(userHandle: string, targetHandle: string): Promise<{ verified: boolean, error?: string }> {
  try {
    console.log('DEBUG: Verifying follow with Application-Only auth - userHandle:', userHandle, 'targetHandle:', targetHandle);

    const bearerToken = process.env.TWITTER_BEARER;
    if (!bearerToken) {
      return { verified: false, error: "Twitter Bearer Token not configured" };
    }

    // Get user ID using Application-Only auth
    const userResponse = await fetch(`https://api.twitter.com/2/users/by/username/${userHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const userResult: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: User lookup response:', userResponse.status, userResult);

    if (!userResponse.ok) return { verified: false, error: `Twitter user lookup failed: ${userResponse.status}` };
    const userId = userResult.data?.id;
    if (!userId) return { verified: false, error: "User ID not found in Twitter response" };

    // Get target user ID using Application-Only auth
    const targetResponse = await fetch(`https://api.twitter.com/2/users/by/username/${targetHandle}`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const targetResult: TwitterUserResponse = await targetResponse.json();
    console.log('DEBUG: Target lookup response:', targetResponse.status, targetResult);

    if (!targetResponse.ok) return { verified: false, error: `Twitter target lookup failed: ${targetResponse.status}` };
    const targetUserId = targetResult.data?.id;
    if (!targetUserId) return { verified: false, error: "Target user ID not found in Twitter response" };

    // Check if user follows target using Application-Only auth
    // Note: This requires OAuth 1.0a user context, but we'll try with Application-Only auth
    const followResponse = await fetch(`https://api.twitter.com/2/users/${userId}/following`, {
      headers: { Authorization: `Bearer ${bearerToken}` },
    });
    const followResult: TwitterFollowResponse = await followResponse.json();
    console.log('DEBUG: Following response:', followResponse.status, followResult);

    if (!followResponse.ok) {
      console.log('DEBUG: Cannot check following status with Application-Only auth');
      return { verified: false, error: "Cannot verify follow status with Application-Only authentication. OAuth is required." };
    }

    const following = followResult.data || [];
    const isFollowing = following.some((user) => user.id === targetUserId);
    console.log('DEBUG: Follow verification result:', isFollowing);

    if (!isFollowing) {
      return { verified: false, error: "User is not following the target account." };
    }
    
    return { verified: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Twitter API error (follow):", errMsg);
    return { verified: false, error: errMsg };
  }
}

// Helper: Twitter API v2 like verification with OAuth 1.0a
async function verifyTwitterLikeOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userHandle: string, tweetId: string): Promise<boolean> {
  try {
    console.log('DEBUG: Verifying like with OAuth - userHandle:', userHandle, 'tweetId:', tweetId);
    
    // Get user ID using OAuth
    const userData = {
      url: `https://api.twitter.com/2/users/by/username/${userHandle}`,
      method: 'GET',
    };
    const userHeaders = oauth.toHeader(oauth.authorize(userData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const userResponse = await fetch(userData.url, {
      method: userData.method,
      headers: {
        ...userHeaders,
      },
    });
    const userResult: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: OAuth user lookup response:', userResponse.status, userResult);
    
    if (!userResponse.ok) throw new Error(`User not found on Twitter: ${userResponse.status}`);
    const userId = userResult.data?.id;
    if (!userId) return false;
    
    // Get liked tweets using OAuth
    const likesData = {
      url: `https://api.twitter.com/2/users/${userId}/liked_tweets`,
      method: 'GET',
    };
    const likesHeaders = oauth.toHeader(oauth.authorize(likesData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const likesResponse = await fetch(likesData.url, {
      method: likesData.method,
      headers: {
        ...likesHeaders,
      },
    });
    const likesResult: { data?: Array<{ id: string }> } = await likesResponse.json();
    console.log('DEBUG: OAuth likes lookup response:', likesResponse.status, likesResult);
    
    if (!likesResponse.ok) throw new Error(`Failed to fetch liked tweets: ${likesResponse.status}`);
    const likedTweets = likesResult.data || [];
    const isLiked = likedTweets.some((tweet) => tweet.id === tweetId);
    console.log('DEBUG: Like verification result:', isLiked);
    return isLiked;
  } catch (error) {
    console.error("Twitter OAuth API error (like):", error);
    return false;
  }
}

// Helper: Twitter API v2 retweet verification with OAuth 1.0a
async function verifyTwitterRetweetOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userHandle: string, tweetId: string): Promise<boolean> {
  try {
    console.log('DEBUG: Verifying retweet with OAuth - userHandle:', userHandle, 'tweetId:', tweetId);
    
    // Get user ID using OAuth
    const userData = {
      url: `https://api.twitter.com/2/users/by/username/${userHandle}`,
      method: 'GET',
    };
    const userHeaders = oauth.toHeader(oauth.authorize(userData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const userResponse = await fetch(userData.url, {
      method: userData.method,
      headers: {
        ...userHeaders,
      },
    });
    const userResult: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: OAuth user lookup response:', userResponse.status, userResult);
    
    if (!userResponse.ok) throw new Error(`User not found on Twitter: ${userResponse.status}`);
    const userId = userResult.data?.id;
    if (!userId) return false;
    
    // Get user's tweets (retweets included) using OAuth
    const tweetsData = {
      url: `https://api.twitter.com/2/users/${userId}/tweets?expansions=referenced_tweets.id&tweet.fields=referenced_tweets`,
      method: 'GET',
    };
    const tweetsHeaders = oauth.toHeader(oauth.authorize(tweetsData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const tweetsResponse = await fetch(tweetsData.url, {
      method: tweetsData.method,
      headers: {
        ...tweetsHeaders,
      },
    });
    const tweetsResult: { data?: Array<{ referenced_tweets?: Array<{ type: string; id: string }> }> } = await tweetsResponse.json();
    console.log('DEBUG: OAuth tweets lookup response:', tweetsResponse.status, tweetsResult);
    
    if (!tweetsResponse.ok) throw new Error(`Failed to fetch user tweets: ${tweetsResponse.status}`);
    const tweets = tweetsResult.data || [];
    const hasRetweeted = tweets.some((tweet) => 
      tweet.referenced_tweets?.some((ref) => ref.type === 'retweeted' && ref.id === tweetId)
    );
    console.log('DEBUG: Retweet verification result:', hasRetweeted);
    return hasRetweeted;
  } catch (error) {
    console.error("Twitter OAuth API error (retweet):", error);
    return false;
  }
}



console.log('DEBUG: Is service role key defined?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
