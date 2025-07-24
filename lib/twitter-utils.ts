/**
 * Extract tweet ID from various Twitter/X URL formats
 * @param url Twitter/X URL
 * @returns tweet ID or null if not found
 */
export function extractTweetIdFromUrl(url: string): string | null {
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

/**
 * Extract username from Twitter/X URL
 * @param url Twitter/X URL
 * @returns username or null if not found
 */
export function extractUsernameFromUrl(url: string): string | null {
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

/**
 * Validate if a string is a valid tweet ID (numeric)
 * @param tweetId Tweet ID to validate
 * @returns boolean
 */
export function isValidTweetId(tweetId: string): boolean {
  return /^\d+$/.test(tweetId);
} 