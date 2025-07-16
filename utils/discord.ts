export function getDiscordOAuthUrl(guildId: string) {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID!,
    redirect_uri: process.env.NEXT_PUBLIC_DISCORD_REDIRECT_URI!,
    response_type: "code",
    scope: "identify guilds",
    state: guildId,
  });
  return `https://discord.com/api/oauth2/authorize?${params.toString()}`;
} 