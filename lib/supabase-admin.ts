import { createClient } from "@supabase/supabase-js"

// The service-role key is **only** ever used on the server.
export const supabaseAdmin = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { autoRefreshToken: false, persistSession: false },
})
