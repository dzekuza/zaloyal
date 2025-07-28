import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Check if user can read from social_accounts
    const { data: existingAccounts, error: readError } = await supabase
      .from('social_accounts')
      .select('*')
      .eq('user_id', user.id)

    if (readError) {
      console.error('Error reading social accounts:', readError)
      return NextResponse.json({ 
        error: 'Failed to read social accounts',
        details: readError 
      }, { status: 500 })
    }

    // Test inserting a social account
    const testAccount = {
      user_id: user.id,
      platform: 'debug-test',
      account_id: 'debug-account-id',
      username: 'debug-username',
      access_token: 'debug-token',
      verified: true,
      profile_data: {
        id: 'debug-account-id',
        username: 'debug-username',
        name: 'Debug User'
      }
    }

    const { data: insertData, error: insertError } = await supabase
      .from('social_accounts')
      .upsert(testAccount, {
        onConflict: 'user_id,platform'
      })
      .select()

    if (insertError) {
      console.error('Error inserting test social account:', insertError)
      return NextResponse.json({ 
        error: 'Failed to insert social account',
        details: insertError 
      }, { status: 500 })
    }

    // Clean up test data
    await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'debug-test')

    return NextResponse.json({ 
      success: true,
      message: 'Social account storage test passed',
      existingAccounts,
      testInsert: insertData
    })

  } catch (error) {
    console.error('Debug social accounts error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 })
  }
} 