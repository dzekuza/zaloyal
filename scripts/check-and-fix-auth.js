const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkAndFixAuth() {
  console.log('🔍 Checking Auth functions...');
  
  try {
    // Check if the trigger function exists
    const { data: functions, error: funcError } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public')
      .eq('routine_name', 'handle_new_user');
    
    if (funcError) {
      console.log('❌ Error checking functions:', funcError);
    } else {
      console.log('📋 Found functions:', functions);
    }

    // Check if the trigger exists
    const { data: triggers, error: triggerError } = await supabase
      .from('information_schema.triggers')
      .select('trigger_name')
      .eq('trigger_schema', 'auth')
      .eq('event_object_table', 'users')
      .eq('trigger_name', 'on_auth_user_created');
    
    if (triggerError) {
      console.log('❌ Error checking triggers:', triggerError);
    } else {
      console.log('📋 Found triggers:', triggers);
    }

    // Check users table RLS
    const { data: policies, error: policyError } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('schemaname', 'public')
      .eq('tablename', 'users');
    
    if (policyError) {
      console.log('❌ Error checking policies:', policyError);
    } else {
      console.log('📋 Found RLS policies:', policies);
    }

    console.log('\n🔧 If any of the above are missing, run this SQL in Supabase SQL Editor:');
    console.log('\n' + '='.repeat(60));
    
    const fixSQL = [
      "-- Fix missing Auth functions that might be causing signup issues",
      "",
      "-- Create function to handle new user creation",
      "CREATE OR REPLACE FUNCTION public.handle_new_user()",
      "RETURNS trigger AS $$",
      "BEGIN",
      "  INSERT INTO public.users (id, email, username, role, total_xp, level, completed_quests)",
      "  VALUES (",
      "    NEW.id,",
      "    NEW.email,",
      "    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),",
      "    'participant',",
      "    0,",
      "    1,",
      "    0",
      "  );",
      "  RETURN NEW;",
      "END;",
      "$$ LANGUAGE plpgsql SECURITY DEFINER;",
      "",
      "-- Create trigger to automatically create user profile",
      "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;",
      "CREATE TRIGGER on_auth_user_created",
      "  AFTER INSERT ON auth.users",
      "  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();",
      "",
      "-- Grant necessary permissions",
      "GRANT USAGE ON SCHEMA public TO anon, authenticated;",
      "GRANT ALL ON public.users TO anon, authenticated;",
      "GRANT ALL ON public.social_accounts TO anon, authenticated;",
      "GRANT ALL ON public.oauth_states TO anon, authenticated;",
      "",
      "-- Enable RLS on users table if not already enabled",
      "ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;",
      "",
      "-- Create RLS policies for users table",
      "DROP POLICY IF EXISTS \"Users can view own profile\" ON public.users;",
      "DROP POLICY IF EXISTS \"Users can update own profile\" ON public.users;",
      "DROP POLICY IF EXISTS \"Users can insert own profile\" ON public.users;",
      "",
      "CREATE POLICY \"Users can view own profile\" ON public.users",
      "  FOR SELECT USING (auth.uid() = id);",
      "",
      "CREATE POLICY \"Users can update own profile\" ON public.users",
      "  FOR UPDATE USING (auth.uid() = id);",
      "",
      "CREATE POLICY \"Users can insert own profile\" ON public.users",
      "  FOR INSERT WITH CHECK (auth.uid() = id);",
      "",
      "-- Create function to get user profile",
      "CREATE OR REPLACE FUNCTION public.get_user_profile(user_id uuid DEFAULT auth.uid())",
      "RETURNS TABLE (",
      "  id uuid,",
      "  email text,",
      "  username text,",
      "  avatar_url text,",
      "  role text,",
      "  total_xp integer,",
      "  level integer,",
      "  completed_quests integer,",
      "  bio text,",
      "  social_links jsonb,",
      "  created_at timestamptz,",
      "  updated_at timestamptz",
      ") AS $$",
      "BEGIN",
      "  RETURN QUERY",
      "  SELECT",
      "    u.id,",
      "    u.email,",
      "    u.username,",
      "    u.avatar_url,",
      "    u.role,",
      "    u.total_xp,",
      "    u.level,",
      "    u.completed_quests,",
      "    u.bio,",
      "    u.social_links,",
      "    u.created_at,",
      "    u.updated_at",
      "  FROM public.users u",
      "  WHERE u.id = user_id;",
      "END;",
      "$$ LANGUAGE plpgsql SECURITY DEFINER;",
      "",
      "-- Grant execute permission",
      "GRANT EXECUTE ON FUNCTION public.get_user_profile TO authenticated;"
    ];

    console.log(fixSQL.join('\n'));
    console.log('\n' + '='.repeat(60));
    console.log('\n🎯 After applying the SQL, test signup again!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAndFixAuth().catch(console.error); 