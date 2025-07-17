# Telegram Bot Setup Guide

## Step 1: Create Your Bot

1. **Open Telegram** and search for `@BotFather`
2. **Start the conversation** by sending `/start`
3. **Create a new bot** by sending `/newbot`
4. **Choose a name**: "Zaloyal Verification Bot"
5. **Choose a username**: "zaloyal_verification_bot" (must end with 'bot')
6. **Save the bot token** that looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`

## Step 2: Configure Bot Commands

Send these commands to @BotFather:

```
/setcommands
```

Then send:
```
verify - Verify your channel membership
help - Show help information
start - Start the bot
```

## Step 3: Set Up Your Channel

1. **Create a new channel** in Telegram
2. **Add your bot as admin**:
   - Go to your channel
   - Click channel name → Edit → Administrators
   - Click "Add Admin"
   - Search for your bot's username
   - Enable these permissions:
     - ✅ Read Messages
     - ✅ Read Message History
     - ✅ View Channel Info

## Step 4: Get Channel Information

1. **Send a message** to your channel
2. **Forward that message** to `@userinfobot`
3. **Note the channel ID** (negative number like `-1001234567890`)

## Step 5: Update Environment Variables

Add to your `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your_actual_bot_token
TELEGRAM_BOT_USERNAME=your_bot_username
TELEGRAM_DEFAULT_CHANNEL_ID=-1001234567890
TELEGRAM_DEFAULT_CHANNEL_USERNAME=@your_channel_name
```

## Step 6: Set Up Webhook (Optional)

For production, set up a webhook:

```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://yourdomain.com/api/telegram-bot",
    "allowed_updates": ["message", "callback_query"]
  }'
```

## Step 7: Test Your Bot

1. **Start your bot**: Send `/start` to your bot
2. **Join your channel**
3. **Test verification**: Send `/verify` to your bot

## Step 8: Database Setup

Run the SQL migration:

```sql
-- Run scripts/12-create-telegram-verifications.sql in your Supabase dashboard
```

## Bot Commands

- `/start` - Welcome message and instructions
- `/help` - Show available commands
- `/verify` - Check channel membership

## Troubleshooting

### Bot not responding?
- Check if bot token is correct
- Make sure bot is not blocked
- Verify webhook is set up correctly (if using webhooks)

### Can't verify membership?
- Ensure bot is admin of the channel
- Check channel ID is correct
- Make sure user has joined the channel

### Environment variables not working?
- Restart your development server
- Check variable names match exactly
- Verify no extra spaces or quotes

## Security Notes

- Keep your bot token secret
- Use environment variables for all sensitive data
- Regularly rotate bot tokens if needed
- Monitor bot usage for abuse 