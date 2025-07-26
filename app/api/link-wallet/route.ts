import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ethers } from 'ethers';
import nacl from 'tweetnacl';
import bs58 from 'bs58';

// Use correct env vars for Supabase service client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  // eslint-disable-next-line no-console
  console.error('[link-wallet] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars:', {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: SUPABASE_SERVICE_ROLE_KEY?.slice(0, 8) + '...' // redact
  });
}

const supabase = createClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const { walletAddress, signature, challenge, userId } = await request.json();
  console.log('[link-wallet] Incoming:', { walletAddress, signature, challenge, userId });

  // TODO: Secure this endpoint! Validate userId from a JWT or session if needed.
  if (!userId) {
    console.log('[link-wallet] Missing userId');
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  // EVM verification
  let isValid = false;
  if (walletAddress.startsWith('0x')) {
    try {
      const recovered = ethers.verifyMessage(challenge, signature);
      isValid = recovered.toLowerCase() === walletAddress.toLowerCase();
      console.log('[link-wallet] EVM verification:', { recovered, isValid });
    } catch (e) {
      console.error('[link-wallet] EVM verification error:', e);
      isValid = false;
    }
  } else {
    // Solana verification
    try {
      const pubkey = bs58.decode(walletAddress);
      const msgUint8 = new TextEncoder().encode(challenge);
      // Convert base64 signature to Uint8Array
      const sigUint8 = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
      isValid = nacl.sign.detached.verify(msgUint8, sigUint8, pubkey);
      console.log('[link-wallet] Solana verification:', { isValid });
    } catch (e) {
      console.error('[link-wallet] Solana verification error:', e);
      isValid = false;
    }
  }

  if (!isValid) {
    console.log('[link-wallet] Signature verification failed');
    return NextResponse.json({ error: 'Signature verification failed' }, { status: 400 });
  }

  // Upsert users table (create if missing, update if exists)
  const now = new Date().toISOString();
  // Fetch the real email first
  const { data: existingUser } = await supabase
    .from('users')
    .select('email')
    .eq('id', userId)
    .single();

  const { error } = await supabase
    .from('users')
    .upsert({
      id: userId, // <-- Correct field
      wallet_address: walletAddress,
      username: walletAddress.slice(0, 8),
      email: existingUser?.email || `${walletAddress}@wallet.zaloyal`, // Use real email if exists
      role: 'participant',
      level: 1,
      total_xp: 0,
      completed_quests: 0,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id' }); // <-- Correct conflict target

  if (error) {
    console.error('[link-wallet] Supabase upsert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Upsert profiles table (create if missing, update if exists)
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: userId, // <-- Use id instead of user_id
      username: walletAddress.slice(0, 8),
      email: `${walletAddress}@wallet.zaloyal`,
      role: 'participant',
      level: 1,
      total_xp: 0,
      completed_quests: 0,
      created_at: now,
      updated_at: now,
    }, { onConflict: 'id' }); // <-- Use id as conflict target

  if (profileError) {
    console.error('[link-wallet] Supabase profile upsert error:', profileError);
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }
  console.log('[link-wallet] Wallet linked successfully');
  return NextResponse.json({ success: true });
} 