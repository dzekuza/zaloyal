import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function POST(request: NextRequest) {
  try {
    console.log('Adding XP removal fields to user_task_submissions table...')

    // Test if the fields already exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('user_task_submissions')
      .select('id, xp_earned, xp_removed, xp_removal_reason')
      .limit(1)

    if (!testError) {
      console.log('XP removal fields already exist')
      return NextResponse.json({ 
        success: true, 
        message: "XP removal fields already exist",
        fields_added: {
          xp_removed: false,
          xp_removal_reason: false
        }
      })
    }

    // If we get here, the fields don't exist, so we need to add them
    console.log('XP removal fields do not exist, adding them...')

    // For now, we'll just return a message indicating manual setup is needed
    return NextResponse.json({ 
      success: false, 
      message: "XP removal fields need to be added manually to the database. Please add the following columns to the user_task_submissions table: xp_removed (integer, default 0) and xp_removal_reason (text, nullable)",
      manual_setup_required: true,
      sql_commands: [
        "ALTER TABLE user_task_submissions ADD COLUMN IF NOT EXISTS xp_removed INTEGER DEFAULT 0;",
        "ALTER TABLE user_task_submissions ADD COLUMN IF NOT EXISTS xp_removal_reason TEXT;"
      ]
    })

  } catch (error) {
    console.error('Error checking XP removal fields:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 