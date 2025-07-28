import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const { userIds } = await request.json()

    if (!userIds || !Array.isArray(userIds)) {
      return NextResponse.json({ error: "userIds array is required" }, { status: 400 })
    }

    // Get all users from auth.users
    const { data: authUsersData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (authUsersError) {
      console.error('Error fetching auth users:', authUsersError)
      return NextResponse.json({ error: "Failed to fetch auth users" }, { status: 500 })
    }

    // Filter to only the requested user IDs
    const filteredUsers = authUsersData?.users?.filter(user => userIds.includes(user.id)) || []

    return NextResponse.json({ users: filteredUsers })
  } catch (error) {
    console.error('Error in get-auth-users:', error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 