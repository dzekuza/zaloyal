// Enhanced test for tweet ID extraction
// This tests the regex patterns with the specific example from the user

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

// Test cases including the user's specific example
const testUrls = [
  'https://x.com/RichkaOuou/status/716262115208769537', // User's example
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

console.log('🧪 Testing Enhanced Tweet ID Extraction\n');
console.log('📋 Testing with user\'s specific example and other cases\n');

testUrls.forEach((url, index) => {
  const tweetId = extractTweetIdFromUrl(url);
  const username = extractUsernameFromUrl(url);
  
  console.log(`Test ${index + 1}:`);
  console.log(`  URL: ${url}`);
  console.log(`  Tweet ID: ${tweetId || 'null'}`);
  console.log(`  Username: ${username || 'null'}`);
  
  if (tweetId) {
    console.log(`  ✅ Successfully extracted tweet ID: ${tweetId}`);
  } else if (url && url.includes('twitter.com') || url && url.includes('x.com')) {
    console.log(`  ❌ Failed to extract tweet ID from valid Twitter URL`);
  }
  console.log('');
});

// Test the specific user example
console.log('🎯 Testing User\'s Specific Example:');
const userUrl = 'https://x.com/RichkaOuou/status/716262115208769537';
const userTweetId = extractTweetIdFromUrl(userUrl);
const userUsername = extractUsernameFromUrl(userUrl);

console.log(`URL: ${userUrl}`);
console.log(`Expected Tweet ID: 716262115208769537`);
console.log(`Extracted Tweet ID: ${userTweetId}`);
console.log(`Expected Username: RichkaOuou`);
console.log(`Extracted Username: ${userUsername}`);

if (userTweetId === '716262115208769537') {
  console.log('✅ SUCCESS: Tweet ID extraction works correctly!');
} else {
  console.log('❌ FAILED: Tweet ID extraction failed');
}

if (userUsername === 'RichkaOuou') {
  console.log('✅ SUCCESS: Username extraction works correctly!');
} else {
  console.log('❌ FAILED: Username extraction failed');
} 