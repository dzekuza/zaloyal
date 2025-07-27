import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"
import { generateTwitterTransactionId } from "@/lib/twitter-utils"
import OAuth from "oauth-1.0a"
import crypto from "crypto"

// Helper function to extract tweet ID from URL
function extractTweetIdFromUrl(url: string): string | null {
  const match = url.match(/twitter\.com\/\w+\/status\/(\d+)/) || url.match(/x\.com\/\w+\/status\/(\d+)/)
  return match ? match[1] : null
}

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
    const body: { userWallet?: string; userEmail?: string; taskId: string; userId?: string } = await request.json();
    console.log('DEBUG: Incoming request body:', body);
    const { userWallet, userEmail, taskId, userId } = body;

    if (!taskId) {
      console.log('DEBUG: Missing taskId parameter');
      return NextResponse.json({ error: "Missing taskId parameter" }, { status: 400 });
    }

    let user: any = null;
    let userError: any = null;

    // First try to get user from provided userId (for wallet auth)
    if (userId) {
      console.log('DEBUG: Using provided userId:', userId);
      const { data: userData, error: userLookupError } = await supabaseAdmin
        .from("users")
        .select("id, wallet_address, email")
        .eq("id", userId)
        .single();
      
      if (!userLookupError && userData) {
        user = userData;
        console.log('DEBUG: Found user by userId:', user.id);
      } else {
        console.log('DEBUG: User lookup by userId failed:', userLookupError);
      }
    }

    // If no user found by userId, try Supabase Auth
    if (!user) {
      console.log('DEBUG: Trying Supabase Auth...');
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      console.log('DEBUG: Auth user lookup:', { authUser: authUser?.id, authError });
      
      if (authError || !authUser) {
        console.log('DEBUG: Authentication failed, trying alternative method');
        
        // Try to get user from Authorization header
        const authHeader = request.headers.get('authorization');
        console.log('DEBUG: Authorization header:', authHeader ? 'Present' : 'Missing');
        
        if (authHeader && authHeader.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          console.log('DEBUG: Token length:', token.length);
          try {
            const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token);
            console.log('DEBUG: Token user lookup:', { tokenUser: tokenUser?.id, tokenError });
            
            if (!tokenError && tokenUser) {
              console.log('DEBUG: Got user from token:', tokenUser.id);
              const { data: userData, error: userLookupError } = await supabaseAdmin
                .from("users")
                .select("id, wallet_address, email")
                .eq("id", tokenUser.id)
                .single();
              
              if (!userLookupError && userData) {
                user = userData;
                console.log('DEBUG: Found user by token:', user.id);
              } else {
                console.log('DEBUG: User lookup by token failed:', userLookupError);
              }
            } else {
              console.log('DEBUG: Token verification failed:', tokenError);
            }
          } catch (tokenError) {
            console.error('DEBUG: Token verification failed:', tokenError);
          }
        } else {
          console.log('DEBUG: No Authorization header found');
        }
      } else {
        // Got user from Supabase Auth
        const { data: userData, error: userLookupError } = await supabaseAdmin
          .from("users")
          .select("id, wallet_address, email")
          .eq("id", authUser.id)
          .single();
        
        if (!userLookupError && userData) {
          user = userData;
          console.log('DEBUG: Found user by Supabase Auth:', user.id);
        } else {
          console.log('DEBUG: User lookup by Supabase Auth failed:', userLookupError);
        }
      }
    }

    if (!user) {
      console.log('DEBUG: No user found by any method');
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    console.log('DEBUG: Using user:', user.id);

    // Get user's X account details
    const { data: socialAccount, error: socialError } = await supabaseAdmin
      .from('social_accounts')
      .select('x_account_id, x_username, x_access_token, x_access_token_secret')
      .eq('user_id', user.id)
      .eq('platform', 'twitter')
      .single();

    if (socialError || !socialAccount) {
      console.error('Social account not found:', socialError);
      return NextResponse.json(
        { 
          error: 'No Twitter account found. Please link your Twitter account first.',
          action: 'connect_twitter',
          message: 'Please connect your Twitter account in your profile settings.'
        },
        { status: 400 }
      );
    }

    const twitterUserId = socialAccount.x_account_id;
    const twitterUsername = socialAccount.x_username;
    
    // Get task from database
    const { data: task, error: taskError } = await supabaseAdmin.from("tasks").select("*", { count: "exact" }).eq("id", taskId).single();
    console.log('DEBUG: Task lookup result:', task, taskError);
    if (!task || taskError) {
      return NextResponse.json({ error: "Task not found", taskError }, { status: 404 });
    }

    // Get quest and then project
    const { data: quest, error: questError } = await supabaseAdmin.from("quests").select("project_id").eq("id", task.quest_id).single();
    console.log('DEBUG: Quest lookup result:', quest, questError);
    if (!quest || questError) {
      return NextResponse.json({ error: "Quest not found", questError }, { status: 404 });
    }

    // Get project and its owner
    const { data: project, error: projectError } = await supabaseAdmin.from("projects").select("id, owner_id").eq("id", quest.project_id).single();
    console.log('DEBUG: Project lookup result:', project, projectError);
    if (!project || projectError) {
      return NextResponse.json({ error: "Project not found", projectError }, { status: 404 });
    }
    // Get project owner's X account details
    const { data: ownerSocialAccount, error: ownerSocialError } = await supabaseAdmin
      .from('social_accounts')
      .select('x_account_id, x_username, x_access_token, x_access_token_secret')
      .eq('user_id', project.owner_id)
      .eq('platform', 'twitter')
      .single();

    if (ownerSocialError || !ownerSocialAccount) {
      console.error('Project owner X account not found:', ownerSocialError);
      return NextResponse.json(
        { error: 'Project owner has not linked their X account' },
        { status: 400 }
      );
    }

    const projectXUsername = ownerSocialAccount.x_username;
    const projectXId = ownerSocialAccount.x_account_id;
    const projectXAccessToken = ownerSocialAccount.x_access_token;
    const projectXAccessTokenSecret = ownerSocialAccount.x_access_token_secret;
    
    return await performVerification(user, task, quest, project, ownerSocialAccount, twitterUserId, twitterUsername, taskId);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('DEBUG: Exception in POST /api/verify/twitter-follow-real:', error);
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to perform the actual verification
async function performVerification(user: any, task: any, quest: any, project: any, owner: any, twitterAccountId: string, twitterUsername: string, taskId: string) {
  // Use owner's X identity as project's X identity
  const projectXUsername = owner.x_username;
  const projectXId = owner.x_account_id;
  const projectXAvatarUrl = owner.profile_data?.profile_image_url || null;

  if (!user || !task) {
    return NextResponse.json({ error: "User or task not found" }, { status: 404 })
  }

  // Use the user's linked X (Twitter) username
  const xUsername = twitterUsername
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
    // For follow verification, use the user's Twitter account ID
    const result = await verifyTwitterFollowBasic(twitterAccountId, projectXId);
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
    
    // Get project owner's OAuth tokens from social_accounts
    const { data: projectOwnerSocialAccount, error: socialAccountError } = await supabase
      .from('social_accounts')
      .select('access_token, access_token_secret')
      .eq('user_id', project.owner_id)
      .eq('platform', 'x')
      .single();
    
    if (socialAccountError || !projectOwnerSocialAccount) {
      return NextResponse.json({ 
        error: "Project owner's X account not linked or OAuth tokens not available." 
      }, { status: 400 });
    }
    
    if (!projectOwnerSocialAccount.access_token || !projectOwnerSocialAccount.access_token_secret) {
      return NextResponse.json({ 
        error: "Project owner's X account OAuth tokens are incomplete. Please re-link the account." 
      }, { status: 400 });
    }
    
    // For like verification, use project owner's OAuth tokens
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
    
    // Verify like using project owner's tokens
    verified = await verifyTwitterLikeOAuth(
      oauth, 
      projectOwnerSocialAccount.access_token, 
      projectOwnerSocialAccount.access_token_secret, 
      twitterAccountId, 
      tweetId
    );
    
    message = verified ? "Like verified!" : "Please like the tweet first";
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
    
    // Get project owner's OAuth tokens from social_accounts
    const { data: projectOwnerSocialAccount, error: socialAccountError } = await supabase
      .from('social_accounts')
      .select('access_token, access_token_secret')
      .eq('user_id', project.owner_id)
      .eq('platform', 'x')
      .single();
    
    if (socialAccountError || !projectOwnerSocialAccount) {
      return NextResponse.json({ 
        error: "Project owner's X account not linked or OAuth tokens not available." 
      }, { status: 400 });
    }
    
    if (!projectOwnerSocialAccount.access_token || !projectOwnerSocialAccount.access_token_secret) {
      return NextResponse.json({ 
        error: "Project owner's X account OAuth tokens are incomplete. Please re-link the account." 
      }, { status: 400 });
    }
    
    // For retweet verification, use project owner's OAuth tokens
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
    
    // Verify retweet using project owner's tokens
    verified = await verifyTwitterRetweetOAuth(
      oauth, 
      projectOwnerSocialAccount.access_token, 
      projectOwnerSocialAccount.access_token_secret, 
      twitterAccountId, 
      tweetId
    );
    
    message = verified ? "Retweet verified!" : "Please retweet the tweet first";
  } else {
    return NextResponse.json({ error: "Unsupported social action" }, { status: 400 });
  }

  if (verified) {
    // Create task submission
    await supabaseAdmin.from("user_task_submissions").upsert({
      user_id: user.id,
      task_id: taskId,
      quest_id: task.quest_id,
      status: "verified",
      submission_data: { x_username: twitterUsername, verified_at: new Date().toISOString() },
      verification_data: { method: "twitter_oauth_v1", verified: true },
      xp_earned: task.xp_reward,
      verified_at: new Date().toISOString(),
    })

    // Update user XP
    if (user.wallet_address) {
      await supabaseAdmin.rpc("increment_user_xp", {
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
}

// Helper: Twitter API v2 follow verification with OAuth 1.0a
async function verifyTwitterFollowOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userHandle: string, targetHandle: string): Promise<{ verified: boolean, error?: string }> {
  try {
    console.log('DEBUG: Verifying follow with OAuth - userHandle:', userHandle, 'targetHandle:', targetHandle);
    
    // Generate a unique transaction ID for this request
    const transactionId = generateTwitterTransactionId();
    
    // Get user ID using OAuth
    const userData = {
      url: `https://api.x.com/2/users/by/username/${userHandle}`,
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
        'x-twitter-client-transaction-id': transactionId,
      },
    });
    const userResult: TwitterUserResponse = await userResponse.json();
    console.log('DEBUG: OAuth user lookup response:', userResponse.status, userResult);
    
    if (!userResponse.ok) return { verified: false, error: `Twitter user lookup failed: ${userResponse.status}` };
    const userId = userResult.data?.id;
    if (!userId) return { verified: false, error: "User ID not found in Twitter response" };
    
    // Get target user ID using OAuth
    const targetData = {
      url: `https://api.x.com/2/users/by/username/${targetHandle}`,
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
        'x-twitter-client-transaction-id': transactionId,
      },
    });
    const targetResult: TwitterUserResponse = await targetResponse.json();
    console.log('DEBUG: OAuth target lookup response:', targetResponse.status, targetResult);
    
    if (!targetResponse.ok) return { verified: false, error: `Twitter target lookup failed: ${targetResponse.status}` };
    const targetUserId = targetResult.data?.id;
    if (!targetUserId) return { verified: false, error: "Target user ID not found in Twitter response" };
    
    // Check if user follows target using OAuth
    const followData = {
      url: `https://api.x.com/2/users/${userId}/following`,
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
        'x-twitter-client-transaction-id': transactionId,
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

// Helper: X API v2 follow verification with Application-Only auth
async function verifyTwitterFollowBasic(userAccountId: string, targetAccountId: string): Promise<{ verified: boolean, error?: string }> {
  try {
    console.log('DEBUG: Verifying follow with Application-Only auth - userAccountId:', userAccountId, 'targetAccountId:', targetAccountId);

    const bearerToken = process.env.TWITTER_BEARER;
    if (!bearerToken) {
      return { verified: false, error: "Twitter Bearer Token not configured" };
    }

    // Generate a unique transaction ID for this request
    const transactionId = generateTwitterTransactionId();

    // Check if user follows target using the correct X API endpoint
    // https://api.x.com/2/users/:id/following
    const followResponse = await fetch(`https://api.x.com/2/users/${userAccountId}/following`, {
      headers: { 
        Authorization: `Bearer ${bearerToken}`,
        'x-twitter-client-transaction-id': transactionId,
      },
    });
    const followResult: TwitterFollowResponse = await followResponse.json();
    console.log('DEBUG: Follow response:', followResponse.status, followResult);

    if (!followResponse.ok) {
      return { verified: false, error: `Failed to check following status: ${followResponse.status}` };
    }
    
    const following = followResult.data || [];
    const isFollowing = following.some((user) => user.id === targetAccountId);
    console.log('DEBUG: Follow verification result:', isFollowing);
    
    if (!isFollowing) {
      return { verified: false, error: `User is not following the target account.` };
    }
    return { verified: true };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Twitter API error (follow):", errMsg);
    return { verified: false, error: errMsg };
  }
}

// Helper: X API v2 like verification with OAuth 1.0a
async function verifyTwitterLikeOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userAccountId: string, tweetId: string): Promise<boolean> {
  try {
    console.log('DEBUG: Verifying like with OAuth - userAccountId:', userAccountId, 'tweetId:', tweetId);
    
    // Generate a unique transaction ID for this request
    const transactionId = generateTwitterTransactionId();
    
    // Get liked tweets using the correct X API endpoint
    // https://api.x.com/2/users/:id/liked_tweets
    const likesData = {
      url: `https://api.x.com/2/users/${userAccountId}/liked_tweets`,
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
        'x-twitter-client-transaction-id': transactionId,
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

// Helper: X API v2 retweet verification with OAuth 1.0a
async function verifyTwitterRetweetOAuth(oauth: OAuth, oauthToken: string, oauthTokenSecret: string, userAccountId: string, tweetId: string): Promise<boolean> {
  try {
    console.log('DEBUG: Verifying retweet with OAuth - userAccountId:', userAccountId, 'tweetId:', tweetId);
    
    // Generate a unique transaction ID for this request
    const transactionId = generateTwitterTransactionId();
    
    // Get user's retweets using the correct X API endpoint
    // https://api.x.com/2/users/:id/retweets
    const retweetsData = {
      url: `https://api.x.com/2/users/${userAccountId}/retweets`,
      method: 'GET',
    };
    const retweetsHeaders = oauth.toHeader(oauth.authorize(retweetsData, {
      key: oauthToken,
      secret: oauthTokenSecret,
    }));
    
    const retweetsResponse = await fetch(retweetsData.url, {
      method: retweetsData.method,
      headers: {
        ...retweetsHeaders,
        'x-twitter-client-transaction-id': transactionId,
      },
    });
    const retweetsResult: { data?: Array<{ referenced_tweets?: Array<{ type: string; id: string }> }> } = await retweetsResponse.json();
    console.log('DEBUG: OAuth retweets lookup response:', retweetsResponse.status, retweetsResult);
    
    if (!retweetsResponse.ok) throw new Error(`Failed to fetch user retweets: ${retweetsResponse.status}`);
    const userRetweets = retweetsResult.data || [];
    const isRetweeted = userRetweets.some((tweet) => 
      tweet.referenced_tweets?.some((ref) => ref.type === 'retweeted' && ref.id === tweetId)
    );
    console.log('DEBUG: Retweet verification result:', isRetweeted);
    return isRetweeted;
  } catch (error) {
    console.error("Twitter OAuth API error (retweet):", error);
    return false;
  }
}



console.log('DEBUG: Is service role key defined?', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
