import { NextRequest, NextResponse } from "next/server";
import { sign } from "jsonwebtoken";
import { PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import nacl from "tweetnacl";

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, signature, message } = await req.json();
    // signature should be base58 encoded

    // 1. Verify the signature
    const pubkey = new PublicKey(walletAddress);
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);

    const isValid = nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      pubkey.toBytes()
    );
    if (!isValid) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    // 2. Issue a Supabase JWT
    const payload = {
      sub: walletAddress,
      wallet_address: walletAddress,
      role: "authenticated",
    };
    const token = sign(payload, SUPABASE_JWT_SECRET, { expiresIn: "1h" });

    return NextResponse.json({ token });
  } catch (e: unknown) {
    console.error("Wallet login error:", e);
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
} 