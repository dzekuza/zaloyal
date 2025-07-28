# Discord Bot Setup for Server Verification

## Overview
To enable Discord server membership verification, you need to set up a Discord bot that can check if users are members of specific servers.

## Step 1: Create Discord Bot

### 1.1 Create Bot Application
1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Name your bot (e.g., "ZaLoyal Verification Bot")
4. Save the application

### 1.2 Configure Bot
1. Go to "Bot" section in your Discord application
2. Click "Add Bot"
3. Copy the **Bot Token** (you'll need this for environment variables)
4. Under "Privileged Gateway Intents", enable:
   - **Server Members Intent** (required to check member status)
   - **Message Content Intent** (if needed for future features)

### 1.3 Bot Permissions
The bot needs these permissions:
- **Read Messages/View Channels** (1024) - To access server information
- **View Server Insights** (524288) - To read member lists
- **Send Messages** (2048) - For future features (optional)

**Total Permission Integer: 527360**

## Step 2: Add Bot to Your Server

### 2.1 Generate Invite Link
1. Go to "OAuth2" → "URL Generator"
2. Select scopes: `bot`
3. Select bot permissions:
   - Read Messages/View Channels
   - View Server Insights
4. Copy the generated URL and open it in a browser
5. Select your server and authorize the bot

### 2.2 Verify Bot Access
1. Check that the bot appears in your server's member list
2. The bot should have the permissions you selected

## Step 3: Environment Variables

Add this to your `.env.local`:

```env
# Discord Bot Token
DISCORD_BOT_TOKEN=your_bot_token_here
```

## Step 4: Testing

### 4.1 Test Bot Access
1. Go to `/admin/test-discord-verification`
2. Enter test parameters:
   - Task ID: A Discord task ID from your database
   - User ID: A user ID with Discord connected
   - Quest ID: The quest ID containing the Discord task
3. Click "Test Discord Verification"

### 4.2 Expected Results
- **Success**: User is verified as a member of the Discord server
- **Failure**: User is not a member or bot doesn't have access

## Troubleshooting

### Common Issues

1. **"Discord bot token not configured"**
   - Add `DISCORD_BOT_TOKEN` to your environment variables
   - Restart your development server

2. **"User not found in Discord server"**
   - Ensure the user has joined the Discord server
   - Check that the invite URL is correct
   - Verify the bot has proper permissions

3. **"Discord API error"**
   - Check that the bot token is valid
   - Ensure the bot is in the target server
   - Verify Server Members Intent is enabled

4. **"Invalid Discord invite URL"**
   - Make sure the task has a valid Discord invite URL
   - Format should be: `https://discord.gg/abc123` or `https://discord.com/invite/abc123`

### Debug Steps

1. **Check Bot Status**
   ```bash
   # Test bot token validity
   curl -H "Authorization: Bot YOUR_BOT_TOKEN" https://discord.com/api/v10/users/@me
   ```

2. **Check Server Access**
   ```bash
   # Test if bot can access server (replace GUILD_ID and USER_ID)
   curl -H "Authorization: Bot YOUR_BOT_TOKEN" https://discord.com/api/v10/guilds/GUILD_ID/members/USER_ID
   ```

3. **Verify Environment**
   - Check that `DISCORD_BOT_TOKEN` is set
   - Restart the development server after adding the token

## Security Considerations

1. **Bot Token Security**
   - Never expose the bot token in client-side code
   - Keep the token secure and rotate it if compromised
   - Use environment variables for all sensitive data

2. **Server Permissions**
   - Only grant the minimum permissions needed
   - Regularly audit bot permissions
   - Consider using role-based access for sensitive servers

3. **User Privacy**
   - Only verify membership, don't store additional user data
   - Respect Discord's privacy policies
   - Inform users about verification process

## Advanced Configuration

### Custom Bot Features
You can extend the bot to:
- Send welcome messages to new members
- Track join/leave events
- Provide server statistics
- Manage roles automatically

### Multiple Server Support
The current implementation supports verification across multiple servers. Each task can target a different Discord server.

## Support

If you encounter issues:
1. Check the Discord Developer Portal for bot status
2. Verify environment variables are set correctly
3. Test with the admin verification page
4. Check server logs for detailed error messages 