const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAuthConfig() {
  console.log('🔍 Testing Supabase Auth Configuration...');
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n📋 Test 1: Basic connection...');
    const { data: testData, error: testError } = await supabase.from('users').select('count').limit(1);
    if (testError) {
      console.log('❌ Connection error:', testError);
    } else {
      console.log('✅ Connection successful');
    }

    // Test 2: Try a simple signup with a test email
    console.log('\n📋 Test 2: Simple signup test...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testPassword = 'testpassword123';
    
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: 'testuser',
        },
      },
    });

    if (signupError) {
      console.log('❌ Signup error:', signupError);
      console.log('Error code:', signupError.code);
      console.log('Error message:', signupError.message);
      
      if (signupError.code === 'unexpected_failure') {
        console.log('\n🔧 This suggests an issue with:');
        console.log('1. Supabase Auth configuration');
        console.log('2. Email confirmation settings');
        console.log('3. Database permissions');
        console.log('4. Missing trigger functions');
      }
    } else {
      console.log('✅ Signup successful:', signupData);
      
      // Clean up test user
      if (signupData.user) {
        console.log('🧹 Cleaning up test user...');
        // Note: We can't delete the user from the client side
        // It will need to be cleaned up manually or via admin
      }
    }

    // Test 3: Check if users table exists and is accessible
    console.log('\n📋 Test 3: Users table check...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('id, email, username')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table accessible');
    }

    console.log('\n🎯 Recommendations:');
    console.log('1. Check Supabase Auth settings in your dashboard');
    console.log('2. Ensure email confirmation is properly configured');
    console.log('3. Run the complete auth fix SQL if not done yet');
    console.log('4. Check if the users table exists and has proper permissions');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAuthConfig().catch(console.error); 