const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runVerificationWorker() {
  console.log('🔄 Starting verification worker...', new Date().toISOString());
  
  try {
    // Call the process_verifications RPC function
    const { data, error } = await supabase.rpc('process_verifications');
    
    if (error) {
      console.error('Verification worker error:', error);
      process.exit(1);
    }
    
    console.log('✅ Verification worker completed successfully');
    
    // Get stats
    const { data: stats } = await supabase
      .from('task_verifications')
      .select('status, count')
      .eq('status', 'verified')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
    
    console.log(`📊 Last 24 hours: ${stats?.length || 0} verifications processed`);
    
  } catch (error) {
    console.error('❌ Verification worker failed:', error);
    process.exit(1);
  }
}

// Run the worker
runVerificationWorker(); 