import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(req: NextRequest) {
  try {
    const { walletAddress, username } = await req.json()

    if (!walletAddress) {
      return NextResponse.json({ error: "walletAddress is required" }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from("users")
      .upsert(
        {
          wallet_address: walletAddress.toLowerCase(),
          username: username || `User${walletAddress.slice(-6)}`,
          total_xp: 0,
          level: 1,
          completed_quests: 0,
          role: "participant",
        },
        { onConflict: "wallet_address" },
      )
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user: data })
  } catch (e: any) {
    console.error("User upsert failed:", e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
