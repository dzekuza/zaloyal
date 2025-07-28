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
    const body: { taskId: string } = await request.json();
    console.log('DEBUG: Incoming request body:', body);
    const { taskId } = body;

    if (!taskId) {
      console.log('DEBUG: Missing taskId parameter');
      return NextResponse.json({ error: "Missing taskId parameter" }, { status: 400 });
    }

    // 🔥 BEST PRACTICE: Get user from session using Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('DEBUG: Auth header:', authHeader ? 'Present' : 'Missing');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('DEBUG: Invalid or missing Authorization header');
      return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
    }
    
    const token = authHeader.replace('Bearer ', '');
    console.log('DEBUG: Token extracted:', token ? 'Present' : 'Missing');
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.log('DEBUG: Authentication failed:', authError);
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    console.log('DEBUG: Authenticated user:', user.id);

    // 🔥 BEST PRACTICE: Get X identity using admin API
    const { data: { user: userWithIdentities }, error: identitiesError } = await supabaseAdmin.auth.admin.getUserById(user.id);
    
    if (identitiesError) {
      console.log('DEBUG: Failed to get user identities:', identitiesError);
      return NextResponse.json({ error: "Failed to get user identities" }, { status: 500 });
    }

    const xIdentity = userWithIdentities?.identities?.find(
      (identity: any) => identity.provider === 'twitter'
    );

    if (!xIdentity) {
      console.log('DEBUG: No X identity found');
      return NextResponse.json(
        { 
          error: 'No X account linked. Please connect your X account in your profile.',
          action: 'connect_twitter',
          message: 'Please connect your X account in your profile settings.'
        },
        { status: 400 }
      );
    }

    console.log('DEBUG: Found X identity:', xIdentity.identity_id);

    // 🔥 BEST PRACTICE: Use X identity data from Auth
    const twitterUserId = xIdentity.identity_id;
    const twitterUsername = xIdentity.identity_data?.user_name || xIdentity.identity_data?.screen_name;
    
    if (!twitterUsername) {
      console.log('DEBUG: No X username found in identity data');
      return NextResponse.json(
        { error: 'X username not found in identity data' },
        { status: 400 }
      );
    }

    console.log('DEBUG: Using X account:', { twitterUserId, twitterUsername });
    
    // Get task from database
    const { data: task, error: taskError } = await supabaseAdmin.from("tasks").select("*").eq("id", taskId).single();
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

    // 🔥 BEST PRACTICE: Get project owner's X identity from Auth (not social_accounts)
    const { data: { user: ownerUser }, error: ownerAuthError } = await supabaseAdmin.auth.admin.getUserById(project.owner_id);
    
    if (ownerAuthError || !ownerUser) {
      console.log('DEBUG: Failed to get project owner from Auth:', ownerAuthError);
      return NextResponse.json({ error: "Project owner not found" }, { status: 404 });
    }

    // Get project owner's X identity from their user data
    const ownerXIdentity = ownerUser.identities?.find(
      (identity: any) => identity.provider === 'twitter'
    );

    if (!ownerXIdentity) {
      console.log('DEBUG: Project owner has no X identity');
      return NextResponse.json(
        { error: 'Project owner has not linked their X account' },
        { status: 400 }
      );
    }

    const projectXUsername = ownerXIdentity.identity_data?.user_name || ownerXIdentity.identity_data?.screen_name;
    const projectXId = ownerXIdentity.identity_id;
    
    if (!projectXUsername) {
      console.log('DEBUG: Project owner X username not found');
      return NextResponse.json(
        { error: 'Project owner X username not found' },
        { status: 400 }
      );
    }

    console.log('DEBUG: Project owner X account:', { projectXId, projectXUsername });
    
    return await performVerification(user, task, quest, project, twitterUserId, twitterUsername, projectXId, projectXUsername, taskId);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error('DEBUG: Exception in POST /api/verify/twitter-follow-real:', error);
    console.error('DEBUG: Error stack:', error.stack);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper function to perform the actual verification
async function performVerification(
  user: any, 
  task: any, 
  quest: any, 
  project: any, 
  twitterAccountId: string, 
  twitterUsername: string, 
  projectXId: string, 
  projectXUsername: string, 
  taskId: string
) {
  if (!user || !task) {
    return NextResponse.json({ error: "User or task not found" }, { status: 404 })
  }

  // Check if Twitter API credentials are configured
  const twitterApiKey = process.env.TWITTER_API_KEY;
  const twitterApiSecret = process.env.TWITTER_API_SECRET;
  const twitterBearer = process.env.TWITTER_BEARER_TOKEN;
  
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
    
    if (result.error && result.error.includes("Twitter API access denied")) {
      // Fallback: Since we can't verify via API, we'll provide a manual verification option
      // The user has X linked, so we can at least confirm they have the capability to follow
      verified = false;
      message = "Twitter API access is limited. Please manually verify that you followed the account, or contact support for API access upgrade.";
    } else {
      verified = result.verified;
      message = verified ? "Follow verified!" : result.error || "Please follow the account first";
    }
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
    
    // 🔥 BEST PRACTICE: For OAuth operations, we need the project owner's OAuth tokens
    // Since we can't get OAuth tokens from Auth identities, we need to get them from social_accounts
    // This is the ONLY legitimate use of social_accounts table - for OAuth tokens
    const { data: projectOwnerSocialAccount, error: socialAccountError } = await supabaseAdmin
      .from('social_accounts')
      .select('access_token, access_token_secret')
      .eq('user_id', project.owner_id)
      .eq('platform', 'x')
      .single();
    
    if (socialAccountError || !projectOwnerSocialAccount) {
      return NextResponse.json({ 
        error: "Project owner's X account OAuth tokens not available. Please re-link the account." 
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
    
    // 🔥 BEST PRACTICE: For OAuth operations, we need the project owner's OAuth tokens
    const { data: projectOwnerSocialAccount, error: socialAccountError } = await supabaseAdmin
      .from('social_accounts')
      .select('access_token, access_token_secret')
      .eq('user_id', project.owner_id)
      .eq('platform', 'x')
      .single();
    
    if (socialAccountError || !projectOwnerSocialAccount) {
      return NextResponse.json({ 
        error: "Project owner's X account OAuth tokens not available. Please re-link the account." 
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

// Helper: X API v2 follow verification with Application-Only auth
async function verifyTwitterFollowBasic(userAccountId: string, targetAccountId: string): Promise<{ verified: boolean, error?: string }> {
  try {
    console.log('DEBUG: Verifying follow with Application-Only auth - userAccountId:', userAccountId, 'targetAccountId:', targetAccountId);

    const bearerToken = process.env.TWITTER_BEARER_TOKEN;
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
      if (followResponse.status === 403) {
        return { verified: false, error: `Twitter API access denied. The API requires higher access level. Please contact support or try manual verification.` };
      }
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
