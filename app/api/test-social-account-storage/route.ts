import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient(request)
    
    // Get the current user session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError || !user) {
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 })
    }

    // Test data for social account
    const testSocialAccount = {
      user_id: user.id,
      platform: 'test',
      account_id: 'test-account-id',
      username: 'test-username',
      access_token: 'test-token',
      verified: true,
      profile_data: {
        id: 'test-account-id',
        username: 'test-username',
        name: 'Test User'
      }
    }

    console.log('Testing social account storage with data:', testSocialAccount)

    // Try to insert the test social account
    const { data, error } = await supabase
      .from('social_accounts')
      .upsert(testSocialAccount, {
        onConflict: 'user_id,platform'
      })
      .select()

    if (error) {
      console.error('Test social account storage failed:', error)
      return NextResponse.json({ 
        error: 'Failed to store social account',
        details: error 
      }, { status: 500 })
    }

    console.log('Test social account storage successful:', data)

    // Clean up the test data
    await supabase
      .from('social_accounts')
      .delete()
      .eq('user_id', user.id)
      .eq('platform', 'test')

    return NextResponse.json({ 
      success: true, 
      message: 'Social account storage test passed',
      data 
    })

  } catch (error) {
    console.error('Test social account storage error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 })
  }
} 