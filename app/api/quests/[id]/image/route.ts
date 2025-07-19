import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { imageUrl, userWallet } = await request.json()
    const { id: questId } = await context.params

    if (!userWallet || !questId) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }

    // Get user from database
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("wallet_address", userWallet.toLowerCase())
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify user owns the quest
    const { data: quest, error: questError } = await supabase
      .from("quests")
      .select("creator_id")
      .eq("id", questId)
      .eq("creator_id", user.id)
      .single()

    if (questError || !quest) {
      return NextResponse.json({ error: "Quest not found or unauthorized" }, { status: 404 })
    }

    // Update quest image
    const { error: updateError } = await supabase
      .from("quests")
      .update({
        image_url: imageUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", questId)

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: "Quest image updated successfully",
      imageUrl,
    })
  } catch (error) {
    console.error("Quest image update error:", error)
    return NextResponse.json({ error: "Failed to update quest image" }, { status: 500 })
  }
}
