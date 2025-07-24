const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function directBackup() {
  console.log('🔄 Starting direct database backup...\n');

  try {
    // 1. Get all tables using direct SQL
    console.log('📋 Extracting table structures...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE 'pg_%'
          AND table_name NOT LIKE 'information_schema%'
          ORDER BY table_name;
        `
      });

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
      return;
    }

    console.log(`Found ${tables.length} tables:`, tables.map(t => t.table_name));

    // 2. Get table schemas
    const tableSchemas = {};
    for (const table of tables) {
      const { data: columns, error: columnsError } = await supabase
        .rpc('exec_sql', {
          sql_query: `
            SELECT 
              column_name, 
              data_type, 
              is_nullable, 
              column_default, 
              character_maximum_length
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = '${table.table_name}'
            ORDER BY ordinal_position;
          `
        });

      if (!columnsError) {
        tableSchemas[table.table_name] = columns;
      }
    }

    // 3. Get RLS policies
    console.log('\n🔒 Extracting RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT * FROM pg_policies 
          WHERE schemaname = 'public';
        `
      });

    // 4. Get functions
    console.log('\n⚙️  Extracting functions...');
    const { data: functions, error: functionsError } = await supabase
      .rpc('exec_sql', {
        sql_query: `
          SELECT 
            routine_name, 
            routine_definition 
          FROM information_schema.routines 
          WHERE routine_schema = 'public' 
          AND routine_name NOT LIKE 'pg_%';
        `
      });

    // 5. Create backup object
    const backup = {
      timestamp: new Date().toISOString(),
      tables: tableSchemas,
      policies: policies || [],
      functions: functions || [],
      summary: {
        tableCount: tables.length,
        policyCount: policies?.length || 0,
        functionCount: functions?.length || 0
      }
    };

    // 6. Save to file
    const fs = require('fs');
    const backupFileName = `direct-backup-${new Date().toISOString().split('T')[0]}.json`;
    const backupPath = `scripts/${backupFileName}`;
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Direct backup completed!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Tables: ${backup.summary.tableCount}`);
    console.log(`   - Policies: ${backup.summary.policyCount}`);
    console.log(`   - Functions: ${backup.summary.functionCount}`);

    // 7. Create SQL file
    const sqlFileName = `direct-backup-${new Date().toISOString().split('T')[0]}.sql`;
    const sqlPath = `scripts/${sqlFileName}`;
    
    let sqlContent = `-- Direct Database Backup - ${new Date().toISOString()}\n\n`;
    
    // Add table creation statements
    for (const [tableName, columns] of Object.entries(tableSchemas)) {
      sqlContent += `-- Table: ${tableName}\n`;
      sqlContent += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
      
      const columnDefs = columns.map(col => {
        let def = `  "${col.column_name}" ${col.data_type}`;
        if (col.character_maximum_length) {
          def += `(${col.character_maximum_length})`;
        }
        if (col.is_nullable === 'NO') {
          def += ' NOT NULL';
        }
        if (col.column_default) {
          def += ` DEFAULT ${col.column_default}`;
        }
        return def;
      });
      
      sqlContent += columnDefs.join(',\n') + '\n);\n\n';
    }
    
    // Add policies
    if (policies && policies.length > 0) {
      sqlContent += `-- RLS Policies\n`;
      for (const policy of policies) {
        sqlContent += `-- Policy: ${policy.policyname} on ${policy.tablename}\n`;
        sqlContent += `-- ${policy.cmd} policy\n\n`;
      }
    }
    
    // Add functions
    if (functions && functions.length > 0) {
      sqlContent += `-- Functions\n`;
      for (const func of functions) {
        sqlContent += `-- Function: ${func.routine_name}\n`;
        sqlContent += `-- ${func.routine_definition.substring(0, 100)}...\n\n`;
      }
    }
    
    fs.writeFileSync(sqlPath, sqlContent);
    console.log(`📄 SQL backup saved to: ${sqlPath}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

directBackup(); 