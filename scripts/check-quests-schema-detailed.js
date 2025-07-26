const { createClient } = require('@supabase/supabase-js')
require('dotenv').config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkQuestsSchema() {
  try {
    console.log('🔍 Checking quests table schema...')
    
    const { data: columns, error } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_name', 'quests')
      .eq('table_schema', 'public')
      .order('ordinal_position')
    
    if (error) {
      console.error('❌ Error:', error)
      return
    }
    
    console.log('📋 Quests table columns:')
    columns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? '(NOT NULL)' : '(nullable)'} ${col.column_default ? `DEFAULT: ${col.column_default}` : ''}`)
    })
    
    // Check for NOT NULL columns without defaults
    const requiredColumns = columns.filter(col => 
      col.is_nullable === 'NO' && !col.column_default
    )
    
    console.log('\n🔍 Required columns (NOT NULL, no default):')
    requiredColumns.forEach(col => {
      console.log(`  ${col.column_name}: ${col.data_type}`)
    })
    
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

checkQuestsSchema() 