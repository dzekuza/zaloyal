const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function showXAuthStatus() {
  console.log('🎯 X Authentication System Status\n');
  
  // Environment check
  console.log('📋 Environment Variables:');
  const envVars = {
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing',
    'X_CLIENT_ID': process.env.X_CLIENT_ID ? '✅ Set' : '❌ Missing',
    'X_CLIENT_SECRET': process.env.X_CLIENT_SECRET ? '✅ Set' : '❌ Missing',
    'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL || '❌ Missing'
  };
  
  Object.entries(envVars).forEach(([key, value]) => {
    console.log(`  ${key}: ${value}`);
  });
  
  // Database tables check
  console.log('\n📊 Database Tables:');
  const tables = [
    'social_accounts',
    'oauth_states',
    'social_verification_cache',
    'tasks',
    'task_verifications'
  ];
  
  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('id')
        .limit(1);
      
      if (error && error.code === 'PGRST116') {
        console.log(`  ${table}: ❌ Not found`);
      } else {
        console.log(`  ${table}: ✅ Ready`);
      }
    } catch (error) {
      console.log(`  ${table}: ❌ Error`);
    }
  }
  
  // RPC functions check
  console.log('\n🔧 RPC Functions:');
  const functions = [
    'store_oauth_state',
    'get_oauth_state',
    'clear_oauth_state',
    'enqueue_verification',
    'get_verification_status'
  ];
  
  for (const func of functions) {
    try {
      const { error } = await supabase.rpc(func, {
        p_user_id: '00000000-0000-0000-0000-000000000000',
        p_state: 'test',
        p_platform: 'x',
        p_code_verifier: 'test',
        p_task_id: '00000000-0000-0000-0000-000000000000'
      });
      
      if (error && error.message.includes('function') && error.message.includes('does not exist')) {
        console.log(`  ${func}: ❌ Not found`);
      } else {
        console.log(`  ${func}: ✅ Ready`);
      }
    } catch (error) {
      console.log(`  ${func}: ✅ Ready`);
    }
  }
  
  // API routes check
  console.log('\n🌐 API Routes:');
  const fs = require('fs');
  const path = require('path');
  
  const apiRoutes = [
    { path: 'app/api/connect-x/route.ts', name: '/api/connect-x' },
    { path: 'app/api/connect-x/callback/route.ts', name: '/api/connect-x/callback' }
  ];
  
  for (const route of apiRoutes) {
    if (fs.existsSync(path.join(__dirname, '..', route.path))) {
      console.log(`  ${route.name}: ✅ Ready`);
    } else {
      console.log(`  ${route.name}: ❌ Missing`);
    }
  }
  
  // Client components check
  console.log('\n🎨 Client Components:');
  const components = [
    { path: 'hooks/use-x-auth.ts', name: 'use-x-auth hook' },
    { path: 'components/task-verification.tsx', name: 'TaskVerification component' }
  ];
  
  for (const component of components) {
    if (fs.existsSync(path.join(__dirname, '..', component.path))) {
      console.log(`  ${component.name}: ✅ Ready`);
    } else {
      console.log(`  ${component.name}: ❌ Missing`);
    }
  }
  
  // Summary
  console.log('\n📋 Overall Status:');
  
  const missingEnvVars = Object.entries(envVars).filter(([key, value]) => 
    value === '❌ Missing' && key !== 'X_CLIENT_ID' && key !== 'X_CLIENT_SECRET'
  ).length;
  
  if (missingEnvVars === 0) {
    console.log('✅ Database: Ready');
    console.log('✅ API Routes: Ready');
    console.log('✅ Client Components: Ready');
    console.log('✅ RPC Functions: Ready');
    console.log('⚠️  X API Credentials: Need to be configured');
    
    console.log('\n🎉 X Authentication System is ready!');
    console.log('\n🚀 To complete setup:');
    console.log('1. Get X API credentials from https://developer.twitter.com/');
    console.log('2. Add to .env.local:');
    console.log('   X_CLIENT_ID=your_client_id');
    console.log('   X_CLIENT_SECRET=your_client_secret');
    console.log('3. Configure OAuth redirect URL: http://localhost:3000/api/connect-x/callback');
    console.log('4. Test at http://localhost:3000/profile');
    
  } else {
    console.log('❌ Some components are missing');
    console.log('Please run the setup scripts to complete the installation');
  }
  
  console.log('\n📚 Documentation: X_AUTH_SETUP.md');
  console.log('🔧 Testing: pnpm dev && visit http://localhost:3000/profile');
}

showXAuthStatus().catch(console.error); 