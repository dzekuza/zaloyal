import { NextRequest, NextResponse } from "next/server";

const CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;

interface Guild {
  id: string;
  name: string;
  icon?: string;
  owner?: boolean;
  permissions?: number;
  [key: string]: unknown;
}

export async function POST(req: NextRequest) {
  try {
    const { code, guildId }: { code: string; guildId: string } = await req.json();
    if (!code || !guildId) {
      return NextResponse.json({ error: "Missing code or guildId" }, { status: 400 });
    }

    // 1. Exchange code for access token
    const params = new URLSearchParams();
    params.append("client_id", CLIENT_ID);
    params.append("client_secret", CLIENT_SECRET);
    params.append("grant_type", "authorization_code");
    params.append("code", code);
    params.append("redirect_uri", REDIRECT_URI);
    params.append("scope", "identify guilds");

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
    return NextResponse.json({ isMember });
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: "Internal server error", details: errMsg }, { status: 500 });
  }
} 