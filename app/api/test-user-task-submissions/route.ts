import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

export async function GET(request: NextRequest) {
  try {
    console.log('Testing user_task_submissions table structure with admin client...')

    // Try to get a sample record from user_task_submissions using admin client
    const { data: submissions, error } = await supabaseAdmin
      .from('user_task_submissions')
      .select('*')
      .limit(5)

    if (error) {
      console.error('Error fetching user_task_submissions:', error)
      return NextResponse.json({ 
        error: "Failed to fetch user_task_submissions", 
        details: error,
        message: error.message,
        code: error.code
      }, { status: 500 })
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No submissions found",
        availableFields: [],
        sampleData: null,
        totalSubmissions: 0
      })
    }

    return NextResponse.json({ 
      success: true, 
      message: "Found existing submissions",
      availableFields: submissions?.[0] ? Object.keys(submissions[0]) : [],
      sampleData: submissions?.[0] || null,
      allSubmissions: submissions,
      totalSubmissions: submissions?.length || 0
    })

  } catch (error) {
    console.error('Error in test-user-task-submissions:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 