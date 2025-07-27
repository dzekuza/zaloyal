export function getDiscordOAuthUrl() {
  const DISCORD_CLIENT_ID = process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID;
  const DISCORD_REDIRECT_URI = process.env.NEXT_PUBLIC_APP_URL + '/api/connect-discord/callback';
  const DISCORD_SCOPE = 'identify connections guilds.join guilds.channels.read email guilds.members.read gdm.join';
  
  if (!DISCORD_CLIENT_ID) {
    console.error('Discord Client ID not configured');
    return '#';
  }
  
  return `https://discord.com/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&scope=${encodeURIComponent(DISCORD_SCOPE)}`;
} 