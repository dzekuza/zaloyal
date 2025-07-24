const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function troubleshootAuth() {
  console.log('🔍 Troubleshooting Supabase Auth Configuration...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  console.log('Service Role exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  console.log('\n📋 The "Error creating identity" issue suggests:');
  console.log('1. Supabase Auth configuration issues in the dashboard');
  console.log('2. Email confirmation settings');
  console.log('3. Missing required database functions');
  console.log('4. Auth schema corruption');
  
  console.log('\n🔧 Troubleshooting Steps:');
  console.log('\n1. Check Supabase Dashboard Auth Settings:');
  console.log('   - Go to your Supabase project dashboard');
  console.log('   - Navigate to Authentication > Settings');
  console.log('   - Check if "Enable email confirmations" is properly configured');
  console.log('   - Verify the site URL is correct');
  
  console.log('\n2. Check Email Provider Settings:');
  console.log('   - Go to Authentication > Email Templates');
  console.log('   - Ensure email templates are configured');
  console.log('   - Check if SMTP settings are correct');
  
  console.log('\n3. Database Schema Issues:');
  console.log('   - The auth schema might be corrupted');
  console.log('   - Try creating a new Supabase project');
  console.log('   - Or contact Supabase support');
  
  console.log('\n4. Alternative Solution - Disable Email Confirmation:');
  console.log('   - Go to Authentication > Settings');
  console.log('   - Disable "Enable email confirmations" temporarily');
  console.log('   - This will allow signup without email verification');
  
  console.log('\n5. Test with a Simple Signup:');
  console.log('   - Try signing up with a simple email/password');
  console.log('   - Check if the issue is with the username field');
  
  console.log('\n🎯 Immediate Action:');
  console.log('1. Go to your Supabase dashboard');
  console.log('2. Navigate to Authentication > Settings');
  console.log('3. Disable "Enable email confirmations"');
  console.log('4. Try signup again');
  console.log('5. If it works, the issue is with email confirmation');
  
  console.log('\n⚠️  If the issue persists:');
  console.log('- Consider creating a new Supabase project');
  console.log('- Or contact Supabase support');
  console.log('- The "Error creating identity" is often a Supabase configuration issue');
}

troubleshootAuth().catch(console.error); 