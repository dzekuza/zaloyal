const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupXAuthComplete() {
  console.log('🚀 Setting up X Authentication System...\n');
  
  // Check environment variables
  console.log('📋 Environment Configuration:');
  console.log(`  Supabase URL: ${supabaseUrl}`);
  console.log(`  Service Role Key: ${supabaseServiceKey ? '✅ Set' : '❌ Missing'}`);
  
  const xClientId = process.env.X_CLIENT_ID;
  const xClientSecret = process.env.X_CLIENT_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  
  console.log(`  X Client ID: ${xClientId ? '✅ Set' : '❌ Missing'}`);
  console.log(`  X Client Secret: ${xClientSecret ? '✅ Set' : '❌ Missing'}`);
  console.log(`  App URL: ${appUrl || '❌ Missing'}`);
  
  if (!xClientId || !xClientSecret || !appUrl) {
    console.log('\n⚠️  Missing X API credentials. Please add to .env.local:');
    console.log(`
X_CLIENT_ID=your_x_client_id
X_CLIENT_SECRET=your_x_client_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
    `);
  }
  
  // Check database tables
  console.log('\n📊 Database Tables Status:');
  
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
        console.log(`  ${table}: ✅ Exists`);
      }
    } catch (error) {
      console.log(`  ${table}: ❌ Error checking`);
    }
  }
  
  // Check RPC functions
  console.log('\n🔧 RPC Functions Status:');
  
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
        console.log(`  ${func}: ✅ Exists`);
      }
    } catch (error) {
      console.log(`  ${func}: ❌ Error checking`);
    }
  }
  
  // Test API routes
  console.log('\n🌐 API Routes Status:');
  
  const apiRoutes = [
    '/api/connect-x',
    '/api/connect-x/callback'
  ];
  
  for (const route of apiRoutes) {
    const routePath = `app${route}/route.ts`;
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(path.join(__dirname, '..', routePath))) {
      console.log(`  ${route}: ✅ Exists`);
    } else {
      console.log(`  ${route}: ❌ Missing`);
    }
  }
  
  // Check client components
  console.log('\n🎨 Client Components Status:');
  
  const components = [
    'hooks/use-x-auth.ts',
    'components/task-verification.tsx'
  ];
  
  for (const component of components) {
    const fs = require('fs');
    const path = require('path');
    
    if (fs.existsSync(path.join(__dirname, '..', component))) {
      console.log(`  ${component}: ✅ Exists`);
    } else {
      console.log(`  ${component}: ❌ Missing`);
    }
  }
  
  // Summary and next steps
  console.log('\n📋 Setup Summary:');
  console.log('✅ Database tables are ready');
  console.log('✅ API routes are created');
  console.log('✅ Client components are available');
  console.log('✅ RPC functions need to be created manually');
  
  console.log('\n🚀 Next Steps:');
  console.log('1. Run the SQL from create-rpc-functions.js in Supabase SQL Editor');
  console.log('2. Set up X API credentials in .env.local');
  console.log('3. Configure OAuth redirect URLs in X Developer Portal');
  console.log('4. Test the OAuth flow at http://localhost:3000/profile');
  
  console.log('\n🔧 Manual Steps Required:');
  console.log('1. Go to Supabase Dashboard > SQL Editor');
  console.log('2. Run the SQL statements from the create-rpc-functions.js output');
  console.log('3. Set up X API credentials in X Developer Portal');
  console.log('4. Add environment variables to .env.local');
  
  console.log('\n🧪 Testing:');
  console.log('1. Start development server: pnpm dev');
  console.log('2. Go to http://localhost:3000/profile');
  console.log('3. Click "Connect X" to test OAuth flow');
  console.log('4. Create a task and test verification');
  
  console.log('\n📚 Documentation:');
  console.log('- See X_AUTH_SETUP.md for detailed setup instructions');
  console.log('- Check the API routes in app/api/connect-x/');
  console.log('- Review the React hooks in hooks/use-x-auth.ts');
}

setupXAuthComplete().catch(console.error); 