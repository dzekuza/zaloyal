import { NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST() {
  try {
    // Create telegram_verification_codes table using direct SQL
    const { error: createTableError } = await supabaseAdmin
      .from('telegram_verification_codes')
      .select('*')
      .limit(1)
      .then(() => ({ error: null })) // Table exists
      .catch(async () => {
        // Table doesn't exist, create it
        const { error } = await supabaseAdmin.rpc('create_telegram_verification_table')
        return { error }
      })

    if (createTableError) {
      console.error('Error creating table:', createTableError)
      return NextResponse.json({ 
        error: "Failed to create telegram_verification_codes table",
        details: createTableError 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: "telegram_verification_codes table created successfully" 
    })

  } catch (error) {
    console.error('Error:', error)
    return NextResponse.json({ 
      error: "Failed to create telegram verification table",
      details: error 
    }, { status: 500 })
  }
} 