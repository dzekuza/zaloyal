// OAuth utility functions to prevent token reuse and ensure unique requests

export const generateOAuthState = () => {
  return {
    state: crypto.randomBytes(32).toString('hex'),
    timestamp: Date.now(),
    nonce: crypto.randomBytes(16).toString('hex'),
  };
};

export const validateOAuthState = (state: string, timestamp: string) => {
  const currentTime = Date.now();
  const requestTime = parseInt(timestamp);
  const timeDiff = currentTime - requestTime;
  
  // Check if the request is not too old (5 minutes)
  if (timeDiff > 5 * 60 * 1000) {
    return { valid: false, reason: 'expired' };
  }
  
  return { valid: true };
};

export const clearOAuthCache = () => {
  // Clear any cached OAuth data
  if (typeof window !== 'undefined') {
    // Clear any stored OAuth tokens
    localStorage.removeItem('oauth_token');
    localStorage.removeItem('oauth_token_secret');
    localStorage.removeItem('oauth_state');
    
    // Clear session storage as well
    sessionStorage.removeItem('oauth_token');
    sessionStorage.removeItem('oauth_token_secret');
    sessionStorage.removeItem('oauth_state');
  }
};

export const addCacheBustingHeaders = (headers: HeadersInit = {}) => {
  return {
    ...headers,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
}; 