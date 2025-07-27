import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/verify/discord-join';

// Validate environment variables
if (!CLIENT_ID || !CLIENT_SECRET) {
  throw new Error('DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET environment variables are required');
}

// After validation, we know these are defined
const validatedClientId = CLIENT_ID;
const validatedClientSecret = CLIENT_SECRET;

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
  features: string[];
  permissions_new: string;
}

export async function POST(req: NextRequest) {
  try {
    const { code, guildId, taskId }: { code: string; guildId: string; taskId?: string } = await req.json();
    if (!code || !guildId) {
      return NextResponse.json({ error: "Missing code or guildId" }, { status: 400 });
    }

    // 1. Exchange code for access token
    const params = new URLSearchParams();
    params.append("client_id", validatedClientId);
    params.append("client_secret", validatedClientSecret);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("scope", "guilds.join email guilds guilds.members.read");

    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      body: params,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.json();
      return NextResponse.json({ error: "Failed to get Discord token", details: err }, { status: 400 });
    }

    const { access_token }: { access_token?: string } = await tokenRes.json();
    if (!access_token) {
      return NextResponse.json({ error: "No access token received from Discord" }, { status: 400 });
    }

    // 2. Fetch user guilds
    const guildsRes = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!guildsRes.ok) {
      const err = await guildsRes.json();
      return NextResponse.json({ error: "Failed to fetch user guilds", details: err }, { status: 400 });
    }

    const guilds: Guild[] = await guildsRes.json();
    if (!Array.isArray(guilds)) {
      return NextResponse.json({ error: "Unexpected response from Discord guilds API" }, { status: 400 });
    }

    // 3. Check if user is in the provided guild
    const isMember = guilds.some((guild) => guild.id === guildId);
    
    // If this is a task verification, update the task submission
    if (taskId && isMember) {
      const supabase = await createServerClient(req);
      
      // Get user from the session
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Get task details
        const { data: task } = await supabase.from("tasks").select("*").eq("id", taskId).single();
        if (task) {
          // Create task submission
          await supabase.from("user_task_submissions").upsert({
            user_id: user.id,
            task_id: taskId,
            quest_id: task.quest_id,
            status: "verified",
            submission_data: { guild_id: guildId, verified_at: new Date().toISOString() },
            verification_data: { method: "discord_oauth", verified: true },
            xp_earned: task.xp_reward,
            verified_at: new Date().toISOString(),
          });

          // Update user XP using email as identifier
          await supabase.rpc("increment_user_xp", {
            user_email: user.email, // Use email as identifier
            xp_amount: task.xp_reward,
          });
        }
      }
    }
    
    return NextResponse.json({ isMember });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", details: errMsg }, { status: 500 });
  }
} 