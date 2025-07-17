export function getDiscordOAuthUrl(guildId: string, taskId?: string) {
  const state = taskId ? `${guildId}:${taskId}` : guildId;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!,
    response_type: "code",
    scope: "identify guilds",
    state: state,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
} 