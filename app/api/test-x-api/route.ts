import { NextRequest, NextResponse } from 'next/server';

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

// Generate a unique transaction ID for X API calls
function generateTransactionId(): string {
  return `x_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export async function GET(req: NextRequest) {
  try {
    if (!TWITTER_BEARER_TOKEN) {
      return NextResponse.json({ 
        success: false, 
        error: 'TWITTER_BEARER_TOKEN not configured' 
      }, { status: 500 });
    }

    // Test X API by getting user info for a known account (Elon Musk's account)
    const testUserId = '44196397'; // Elon Musk's X ID
    const url = `https://api.x.com/2/users/${testUserId}`;
    const transactionId = generateTransactionId();
    
    console.log('Testing X API with:', { url, transactionId });
    
    const response = await fetch(url, {
      headers: { 
        'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        'x-twitter-client-transaction-id': transactionId,
        'Content-Type': 'application/json',
      },
    });

    console.log('X API response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('X API error:', response.status, errorText);
      return NextResponse.json({ 
        success: false, 
        error: `X API error: ${response.status} - ${errorText}`,
        status: response.status
      }, { status: 500 });
    }

    const data = await response.json();
    console.log('X API response data:', data);

    return NextResponse.json({ 
      success: true,
      message: 'X API is working correctly',
      data: data.data,
      transactionId
    });

  } catch (error) {
    console.error('Error testing X API:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error while testing X API' 
    }, { status: 500 });
  }
} 