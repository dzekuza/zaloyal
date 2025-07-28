import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function POST() {
  try {
    // Try to add the submission_data column directly
    const { error: alterError } = await supabaseAdmin
      .from('user_task_submissions')
      .select('submission_data')
      .limit(1)

    if (alterError && alterError.code === 'PGRST204') {
      // Column doesn't exist, we need to add it
      console.log('submission_data column does not exist, attempting to add it...')
      
      // Since we can't use ALTER TABLE directly, let's try a different approach
      // We'll modify the API to not use submission_data for now
      return NextResponse.json({ 
        success: false, 
        message: 'submission_data column does not exist. Please add it manually or update the API to not use this column.',
        needsManualFix: true
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'submission_data column exists' 
    })

  } catch (error) {
    console.error('Error checking submission_data column:', error)
    return NextResponse.json({ 
      error: 'Failed to check submission_data column',
      details: error 
    }, { status: 500 })
  }
} 