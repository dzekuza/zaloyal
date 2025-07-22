require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

const token = process.env.TELEGRAM_BOT_TOKEN;
const backendApiUrl = process.env.BACKEND_API_URL;
const bot = new TelegramBot(token, { polling: true });

bot.on('chat_join_request', async (msg) => {
  const userId = msg.from.id;
  const channelId = msg.chat.id;
  const username = msg.from.username;

  // 1. Approve the join request
  await bot.approveChatJoinRequest(channelId, userId);

  // 2. Notify the user
  await bot.sendMessage(userId, 'You have been approved to join the channel! Quest task complete.');

  // 3. Notify your backend (for quest verification)
  try {
    await axios.post(backendApiUrl, {
      telegramUserId: userId,
      telegramUsername: username,
      channelId: channelId,
    });
    console.log(`Verified and notified backend for user ${username} (${userId})`);
  } catch (err) {
    console.error('Failed to notify backend:', err.message);
  }
});

console.log('Telegram bot is running...'); 