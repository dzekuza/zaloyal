import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    // First, let's check if the column already exists
    const { data: columns, error: columnsError } = await supabaseAdmin
      .from('user_task_submissions')
      .select('*')
      .limit(1)

    if (columnsError) {
      console.error('Error checking table structure:', columnsError)
      return NextResponse.json({ error: "Failed to check table structure" }, { status: 500 })
    }

    // Check if xp_earned column exists by looking at the first record
    const firstRecord = columns?.[0]
    const hasXpEarned = firstRecord && 'xp_earned' in firstRecord

    if (hasXpEarned) {
      return NextResponse.json({ 
        success: true, 
        message: "xp_earned column already exists" 
      })
    }

    // If column doesn't exist, we need to add it via migration
    // For now, let's just return that we need to add it manually
    return NextResponse.json({ 
      success: false, 
      message: "xp_earned column needs to be added manually via migration",
      note: "Please add the column manually in Supabase dashboard or via migration"
    })
  } catch (error) {
    console.error('Error in add-xp-earned-column:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 