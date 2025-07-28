# Discord Bot Setup Guide

## Current Status
- ✅ Bot token is configured and valid
- ✅ Bot can authenticate with Discord API
- ❌ Bot is not in the Discord server

## How to Add Bot to Discord Server

### Step 1: Get Bot Invite Link
The bot needs to be invited to the Discord server. You can create an invite link with the following URL:

```
https://discord.com/api/oauth2/authorize?client_id=1397282925849874492&permissions=1024&scope=bot
```

### Step 2: Invite Bot to Server
1. Click the invite link above
2. Select the Discord server: `https://discord.gg/TeCwUsN9`
3. Grant the bot the following permissions:
   - Read Messages/View Channels
   - View Server Members
   - Send Messages (optional, for notifications)

### Step 3: Verify Bot is in Server
After adding the bot, test it again:
```bash
curl http://localhost:3000/api/test-discord-bot
```

You should see:
```json
{
  "success": true,
  "guildAccess": {
    "canAccess": true,
    "status": 200
  }
}
```

### Step 4: Test Verification
Once the bot is in the server, Discord task verification should work properly.

## Alternative: Manual Verification
If you can't add the bot to the server, the system will fall back to manual verification, which allows users to verify their Discord membership without the bot being present.

## Bot Permissions Required
- `guilds.members.read` - To check if users are members
- `guilds` - To access guild information

## Environment Variables
Make sure `DISCORD_BOT_TOKEN` is set in your `.env.local` file:
```
DISCORD_BOT_TOKEN=your_bot_token_here
``` 