import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const { channelId, taskId, userId } = await request.json()

    if (!taskId) {
      return NextResponse.json({ error: "Missing taskId parameter" }, { status: 400 });
    }

    let user: any = null;

    // First try to get user from provided userId (for wallet auth)
    if (userId) {
      console.log('DEBUG: Using provided userId:', userId);
      const { data: userData, error: userLookupError } = await supabaseAdmin
        .from("users")
        .select("id, wallet_address")
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
      
      if (authError || !authUser) {
        return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
      }

      const { data: userData, error: userError } = await supabaseAdmin
        .from("users")
        .select("id, wallet_address")
        .eq("id", authUser.id)
        .single();

      if (!userData || userError) {
        return NextResponse.json({ error: "User not found in database", userError }, { status: 404 });
      }

      user = userData;
      console.log('DEBUG: Found user by Supabase Auth:', user.id);
    }

    console.log('DEBUG: Using user:', user.id);

    // Get user's Telegram account details
    const { data: socialAccount, error: socialError } = await supabaseAdmin
      .from('social_accounts')
      .select('telegram_account_id, telegram_username, telegram_access_token')
      .eq('user_id', user.id)
      .eq('platform', 'telegram')
      .single();

    if (socialError || !socialAccount) {
      console.error('Social account not found:', socialError);
      return NextResponse.json(
        { 
          error: 'No Telegram account found. Please link your Telegram account first.',
          action: 'connect_telegram',
          message: 'Please connect your Telegram account in your profile settings.'
        },
        { status: 400 }
      );
    }

    const telegramUserId = socialAccount.telegram_account_id;
    const telegramUsername = socialAccount.telegram_username;
    console.log('DEBUG: Using Telegram account:', { accountId: telegramUserId, username: telegramUsername });

    // Get task from database
    const { data: task, error: taskError } = await supabaseAdmin.from("tasks").select("*", { count: "exact" }).eq("id", taskId).single();
    if (!task || taskError) {
      return NextResponse.json({ error: "Task not found", taskError }, { status: 404 });
    }

    // Get quest and then project
    const { data: quest, error: questError } = await supabaseAdmin.from("quests").select("project_id").eq("id", task.quest_id).single();
    if (!quest || questError) {
      return NextResponse.json({ error: "Quest not found", questError }, { status: 404 });
    }

    // Get project and its owner
    const { data: project, error: projectError } = await supabaseAdmin.from("projects").select("id, owner_id").eq("id", quest.project_id).single();
    if (!project || projectError) {
      return NextResponse.json({ error: "Project not found", projectError }, { status: 404 });
    }
    const { data: owner, error: ownerError } = await supabaseAdmin.from("users").select("telegram_id, telegram_username, telegram_avatar_url").eq("id", project.owner_id).single();
    if (!owner || ownerError) {
      return NextResponse.json({ error: "Project owner not found", ownerError }, { status: 404 });
    }
    // Use owner's Telegram identity as project's Telegram identity
    const projectTelegramId = owner.telegram_id;
    const projectTelegramUsername = owner.telegram_username;
    const projectTelegramAvatarUrl = owner.telegram_avatar_url;

    if (!user || !task) {
      return NextResponse.json({ error: "User or task not found" }, { status: 404 })
    }

    // Verify Telegram membership using multiple methods
    const verificationResult = await verifyTelegramMembership(telegramUserId, telegramUsername, channelId)

    if (verificationResult.verified) {
      // Check if already submitted
      const { data: existingSubmission } = await supabaseAdmin
        .from("user_task_submissions")
        .select("id")
        .eq("user_id", user.id)
        .eq("task_id", taskId)
        .single()

      if (existingSubmission) {
        return NextResponse.json({ 
          verified: true, 
          message: "Task already completed!",
          xpEarned: 0 
        })
      }

      // Create submission
      await supabaseAdmin.from("user_task_submissions").upsert({
        user_id: user.id,
        task_id: taskId,
        quest_id: task.quest_id,
        status: "verified",
        submission_data: { 
          telegram_user_id: telegramUserId,
          telegram_username: telegramUsername, 
          channel_id: channelId, 
          verified_at: new Date().toISOString() 
        },
        verification_data: { 
          method: "telegram_bot_api", 
          verified: true,
          verification_method: verificationResult.method
        },
        xp_earned: task.xp_reward,
        verified_at: new Date().toISOString(),
      })

      // Update user XP
      await supabaseAdmin.rpc("increment_user_xp", {
        user_wallet: user.wallet_address.toLowerCase(),
        xp_amount: task.xp_reward,
      })

      return NextResponse.json({
        verified: true,
        message: "Channel membership verified!",
        xpEarned: task.xp_reward,
      })
    } else {
      return NextResponse.json({
        verified: false,
        message: verificationResult.error || "Please join the channel first",
        xpEarned: 0,
      })
    }
  } catch (error) {
    console.error("Telegram verification error:", error)
    return NextResponse.json({ 
      error: "Verification failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 })
  }
}

async function verifyTelegramMembership(
  telegramUserId: number, 
  telegramUsername: string, 
  channelId: string
): Promise<{ verified: boolean; method?: string; error?: string }> {
  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN

    if (!botToken) {
      throw new Error("Telegram Bot Token not configured")
    }

    // Method 1: Direct channel membership check (if bot is admin of the channel)
    try {
      const memberResponse = await fetch(
        `https://api.telegram.org/bot${botToken}/getChatMember?chat_id=${channelId}&user_id=${telegramUserId}`,
        { method: 'GET' }
      )

      if (memberResponse.ok) {
        const memberData = await memberResponse.json()
        
        if (memberData.ok) {
          const status = memberData.result?.status
          const isMember = ["member", "administrator", "creator"].includes(status)
          
          if (isMember) {
            return { verified: true, method: "direct_channel_check" }
          } else {
            return { verified: false, error: "User is not a member of the channel" }
          }
        }
      }
    } catch (error) {
      console.log("Direct channel check failed, trying alternative methods:", error)
    }

    // Method 2: Check if user has recent activity in the channel
    try {
      const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates`)
      const updatesData = await updatesResponse.json()

      // Look for recent messages from this user in the target channel
      for (const update of updatesData.result || []) {
        if (update.message?.from?.id === telegramUserId && 
            update.message?.chat?.id?.toString() === channelId) {
          return { verified: true, method: "recent_activity_check" }
        }
      }
    } catch (error) {
      console.log("Recent activity check failed:", error)
    }

    // Method 3: Check if user has the channel in their recent chats (requires user to interact with bot)
    try {
      // This would require the user to send a message to the bot first
      // For now, we'll return false and ask user to interact with bot
      return { 
        verified: false, 
        error: "Please send a message to @YourBotName first, then try again" 
      }
    } catch (error) {
      console.log("Bot interaction check failed:", error)
    }

    return { verified: false, error: "Unable to verify channel membership" }
  } catch (error) {
    console.error("Telegram API error:", error)
    return { verified: false, error: "Telegram API error" }
  }
}
