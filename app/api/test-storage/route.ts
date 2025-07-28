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

    console.log('Testing storage access for user:', user.id)

    // Test listing buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

    if (bucketsError) {
      console.error('Error listing buckets:', bucketsError)
      return NextResponse.json({ 
        error: 'Failed to list buckets',
        details: bucketsError 
      }, { status: 500 })
    }

    // Test uploading a small test file to project-logos
    const testFileName = `test/${user.id}/test-logo-${Date.now()}.txt`
    const testContent = 'This is a test file for storage verification'
    const testFile = new Blob([testContent], { type: 'text/plain' })

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('project-logos')
      .upload(testFileName, testFile, {
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading test file:', uploadError)
      return NextResponse.json({ 
        error: 'Failed to upload test file',
        details: uploadError 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('project-logos')
      .getPublicUrl(testFileName)

    // Clean up test file
    await supabase.storage
      .from('project-logos')
      .remove([testFileName])

    return NextResponse.json({ 
      success: true,
      message: 'Storage test passed',
      buckets: buckets?.map(b => b.name) || [],
      testUpload: uploadData,
      testUrl: publicUrl
    })

  } catch (error) {
    console.error('Test storage error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 })
  }
} 