// Simple test for tweet ID extraction without importing the module
// This tests the regex patterns directly

function extractTweetIdFromUrl(url) {
  if (!url) return null;
  
  // Remove any trailing slashes and whitespace
  const cleanUrl = url.trim().replace(/\/$/, '');
  
  // Match patterns like:
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  // https://twitter.com/i/status/1234567890
  // https://x.com/i/status/1234567890
  const patterns = [
    /(?:twitter\.com|x\.com)\/[^\/]+\/status\/(\d+)/,
    /(?:twitter\.com|x\.com)\/i\/status\/(\d+)/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  
  return null;
}

function extractUsernameFromUrl(url) {
  if (!url) return null;
  
  const cleanUrl = url.trim().replace(/\/$/, '');
  
  // Match patterns like:
  // https://twitter.com/username
  // https://x.com/username
  // https://twitter.com/username/status/1234567890
  // https://x.com/username/status/1234567890
  const patterns = [
    /(?:twitter\.com|x\.com)\/([^\/]+)(?:\/status\/\d+)?$/,
  ];
  
  for (const pattern of patterns) {
    const match = cleanUrl.match(pattern);
    if (match && match[1] && match[1] !== 'i') {
      return match[1];
    }
  }
  
  return null;
}

// Test cases
const testUrls = [
  'https://twitter.com/username/status/1234567890',
  'https://x.com/username/status/1234567890',
  'https://twitter.com/i/status/1234567890',
  'https://x.com/i/status/1234567890',
  'https://twitter.com/username',
  'https://x.com/username',
  'https://twitter.com/username/status/1862218987725083005',
  'invalid-url',
  '',
  null
];

console.log('🧪 Testing Tweet ID Extraction\n');

testUrls.forEach((url, index) => {
  const tweetId = extractTweetIdFromUrl(url);
  const username = extractUsernameFromUrl(url);
  
  console.log(`Test ${index + 1}:`);
  console.log(`  URL: ${url}`);
  console.log(`  Tweet ID: ${tweetId || 'null'}`);
  console.log(`  Username: ${username || 'null'}`);
  console.log('');
});

console.log('✅ Test completed!'); 