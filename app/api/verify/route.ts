import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function verifyTwitterFollow(userTwitterId: string, targetAccountId: string) {
  const url = `https://api.twitter.com/2/users/${userTwitterId}/following`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.data?.some((u: any) => u.id === targetAccountId);
}

async function verifyTwitterLike(userTwitterId: string, tweetId: string) {
  const url = `https://api.twitter.com/2/users/${userTwitterId}/liked_tweets`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.data?.some((t: any) => t.id === tweetId);
}

async function verifyTwitterRetweet(userTwitterId: string, tweetId: string) {
  const url = `https://api.twitter.com/2/users/${userTwitterId}/retweeted_tweets`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${TWITTER_BEARER_TOKEN}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.data?.some((t: any) => t.id === tweetId);
}

async function verifyDiscordJoin(userDiscordId: string, guildId: string, userAccessToken: string) {
  // Discord API: GET /users/@me/guilds
  const url = 'https://discord.com/api/users/@me/guilds';
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${userAccessToken}` },
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data.some((guild: any) => guild.id === guildId);
}

async function verifyTelegramJoin(userTelegramId: string, groupId: string) {
  // Telegram API: getChatMember
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChatMember?chat_id=${groupId}&user_id=${userTelegramId}`;
  const res = await fetch(url);
  if (!res.ok) return false;
  const data = await res.json();
  return data.ok && data.result && data.result.status !== 'left' && data.result.status !== 'kicked';
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { taskId, userId, type, userTwitterId, targetAccountId, tweetId, userDiscordId, guildId, userAccessToken, userTelegramId, groupId, ...rest } = body;

  switch (type) {
    case 'twitter-follow': {
      const ok = await verifyTwitterFollow(userTwitterId, targetAccountId);
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'twitter-like': {
      const ok = await verifyTwitterLike(userTwitterId, tweetId);
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'twitter-retweet': {
      const ok = await verifyTwitterRetweet(userTwitterId, tweetId);
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'discord-join': {
      const ok = await verifyDiscordJoin(userDiscordId, guildId, userAccessToken);
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'telegram-join': {
      const ok = await verifyTelegramJoin(userTelegramId, groupId);
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'learn':
      // TODO: Call quiz/learn verification logic
      return NextResponse.json({ success: false, message: 'Quiz verification not implemented yet.' }, { status: 501 });
    case 'manual':
      // TODO: Call manual verification logic
      return NextResponse.json({ success: false, message: 'Manual verification not implemented yet.' }, { status: 501 });
    case 'visit': {
      // Check if user has a visit record for this task
      const { data, error } = await supabaseAdmin
        .from('visit_tracking')
        .select('id')
        .eq('id', userId)
        .eq('task_id', taskId)
        .maybeSingle();
      const ok = !!data && !error;
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'form': {
      // Check if user has submitted the form for this task
      const { data, error } = await supabaseAdmin
        .from('form_submissions')
        .select('id')
        .eq('id', userId)
        .eq('task_id', taskId)
        .maybeSingle();
      const ok = !!data && !error;
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    case 'download': {
      // Check if user has a download record for this task
      const { data, error } = await supabaseAdmin
        .from('download_tracking')
        .select('id')
        .eq('id', userId)
        .eq('task_id', taskId)
        .maybeSingle();
      const ok = !!data && !error;
      return NextResponse.json({ success: ok }, { status: ok ? 200 : 400 });
    }
    default:
      return NextResponse.json({ success: false, message: 'Verification type not implemented.' }, { status: 501 });
  }
} 