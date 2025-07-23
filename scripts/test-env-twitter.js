// scripts/test-env-twitter.js

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const requiredEnv = [
  'SUPABASE_TWITTER_API_KEY',
  'SUPABASE_TWITTER_API_SECRET',
  'SUPABASE_NEXT_PUBLIC_TWITTER_REDIRECT_URI',
  'TWITTER_API_KEY',
  'TWITTER_API_SECRET',
  'TWITTER_BEARER',
  'NEXT_PUBLIC_TWITTER_REDIRECT_URI',
  'NEXT_PUBLIC_APP_URL',
];

console.log('--- Twitter/X & Supabase Auth Environment Check ---');
let allGood = true;
for (const key of requiredEnv) {
  const value = process.env[key];
  if (!value) {
    console.error(`❌ MISSING: ${key}`);
    allGood = false;
  } else {
    // Print only first and last 4 chars for secrets
    const display = value.length > 16 ? value.slice(0, 4) + '...' + value.slice(-4) : value;
    console.log(`✅ ${key} = ${display}`);
  }
}
if (allGood) {
  console.log('\nAll required environment variables are set!');
} else {
  console.error('\nSome required environment variables are missing or empty.');
  process.exit(1);
} 