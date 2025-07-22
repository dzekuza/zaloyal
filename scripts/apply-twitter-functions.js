const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyFunctionsIndividually() {
  try {
    console.log('Testing database connection...');

    // Test if we can connect to the database
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('Cannot connect to database:', error);
      console.log('\n📋 Please apply the SQL functions manually in your Supabase dashboard:');
      console.log('1. Go to your Supabase project dashboard');
      console.log('2. Navigate to SQL Editor');
      console.log('3. Copy and paste the contents of scripts/15-twitter-identity-functions.sql');
      console.log('4. Execute the SQL');
      return;
    }

    console.log('✅ Database connection successful');
    console.log('\n📋 Please apply the SQL functions manually in your Supabase dashboard:');
    console.log('1. Go to your Supabase project dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the contents of scripts/15-twitter-identity-functions.sql');
    console.log('4. Execute the SQL');
    console.log('\n📄 SQL content:');
    console.log('----------------------------------------');
    
    // Read and display the SQL content
    const sqlPath = path.join(process.cwd(), 'scripts', '15-twitter-identity-functions.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    console.log(sqlContent);
    console.log('----------------------------------------');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the script
applyFunctionsIndividually(); 