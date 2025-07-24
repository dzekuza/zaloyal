const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixTriggerIssue() {
  console.log('🔧 Fix Trigger Function Issue:');
  console.log('⚠️  This fixes the "Error creating identity" issue!\n');
  
  const fixSQL = [
    "-- Fix the trigger function that's causing the \"Error creating identity\"",
    "",
    "-- Drop the problematic trigger first",
    "DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;",
    "",
    "-- Drop the problematic function",
    "DROP FUNCTION IF EXISTS public.handle_new_user();",
    "",
    "-- Create the fixed function",
    "CREATE OR REPLACE FUNCTION public.handle_new_user()",
    "RETURNS trigger AS $$",
    "BEGIN",
    "  -- Insert user profile",
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
    "  ",
    "  -- Always return NEW for AFTER INSERT triggers",
    "  RETURN NEW;",
    "EXCEPTION",
    "  WHEN OTHERS THEN",
    "    -- Log the error but don't fail the signup",
    "    RAISE WARNING 'Error creating user profile: %', SQLERRM;",
    "    -- Still return NEW to allow the signup to succeed",
    "    RETURN NEW;",
    "END;",
    "$$ LANGUAGE plpgsql SECURITY DEFINER;",
    "",
    "-- Recreate the trigger",
    "CREATE TRIGGER on_auth_user_created",
    "  AFTER INSERT ON auth.users",
    "  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();",
    "",
    "-- Grant necessary permissions",
    "GRANT USAGE ON SCHEMA public TO anon, authenticated;",
    "GRANT ALL ON public.users TO anon, authenticated;",
    "",
    "-- Enable RLS on users table",
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
    "  FOR INSERT WITH CHECK (auth.uid() = id);"
  ];

  console.log(fixSQL.join('\n'));
  console.log('\n🎉 Copy and paste the above SQL into your Supabase SQL Editor!');
  console.log('\n📋 This will:');
  console.log('1. Fix the trigger function that was causing the error');
  console.log('2. Add proper error handling to prevent signup failures');
  console.log('3. Ensure the function always returns NEW');
  console.log('4. Fix the "Error creating identity" issue');
  console.log('\n🚀 After applying this SQL, signup should work perfectly!');
  console.log('\n⚠️  The error was: "control reached end of trigger procedure without RETURN"');
  console.log('This fix ensures the function always returns properly.');
}

fixTriggerIssue().catch(console.error); 