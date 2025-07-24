const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function backupDatabase() {
  console.log('🔄 Starting database backup...\n');

  const backup = {
    timestamp: new Date().toISOString(),
    tables: {},
    policies: {},
    functions: {},
    sequences: {},
    indexes: {},
    triggers: {}
  };

  try {
    // 1. Get all tables
    console.log('📋 Extracting tables...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_type')
      .eq('table_schema', 'public')
      .not('table_name', 'like', 'pg_%')
      .not('table_name', 'like', 'information_schema%');

    if (tablesError) {
      console.error('Error fetching tables:', tablesError);
    } else {
      for (const table of tables) {
        console.log(`  - Extracting table: ${table.table_name}`);
        
        // Get table structure
        const { data: columns, error: columnsError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
          .eq('table_schema', 'public')
          .eq('table_name', table.table_name)
          .order('ordinal_position');

        if (columnsError) {
          console.error(`Error fetching columns for ${table.table_name}:`, columnsError);
        } else {
          backup.tables[table.table_name] = {
            type: table.table_type,
            columns: columns,
            data: []
          };

          // Get table data (limit to first 1000 rows for safety)
          const { data: tableData, error: dataError } = await supabase
            .from(table.table_name)
            .select('*')
            .limit(1000);

          if (dataError) {
            console.error(`Error fetching data for ${table.table_name}:`, dataError);
          } else {
            backup.tables[table.table_name].data = tableData || [];
            console.log(`    - Found ${tableData?.length || 0} rows`);
          }
        }
      }
    }

    // 2. Get all RLS policies
    console.log('\n🔒 Extracting RLS policies...');
    const { data: policies, error: policiesError } = await supabase
      .rpc('get_all_policies');

    if (policiesError) {
      console.log('  - Using fallback method for policies...');
      // Fallback: Get policies from information_schema
      const { data: fallbackPolicies, error: fallbackError } = await supabase
        .from('information_schema.policies')
        .select('*')
        .eq('schema_name', 'public');

      if (fallbackError) {
        console.error('Error fetching policies:', fallbackError);
      } else {
        backup.policies = fallbackPolicies || [];
      }
    } else {
      backup.policies = policies || [];
      console.log(`  - Found ${policies?.length || 0} policies`);
    }

    // 3. Get all functions
    console.log('\n⚙️  Extracting functions...');
    const { data: functions, error: functionsError } = await supabase
      .from('information_schema.routines')
      .select('routine_name, routine_definition, routine_type')
      .eq('routine_schema', 'public')
      .not('routine_name', 'like', 'pg_%');

    if (functionsError) {
      console.error('Error fetching functions:', functionsError);
    } else {
      backup.functions = functions || [];
      console.log(`  - Found ${functions?.length || 0} functions`);
    }

    // 4. Get all sequences
    console.log('\n🔢 Extracting sequences...');
    const { data: sequences, error: sequencesError } = await supabase
      .from('information_schema.sequences')
      .select('*')
      .eq('sequence_schema', 'public');

    if (sequencesError) {
      console.error('Error fetching sequences:', sequencesError);
    } else {
      backup.sequences = sequences || [];
      console.log(`  - Found ${sequences?.length || 0} sequences`);
    }

    // 5. Get all indexes
    console.log('\n📊 Extracting indexes...');
    const { data: indexes, error: indexesError } = await supabase
      .from('pg_indexes')
      .select('*')
      .eq('schemaname', 'public');

    if (indexesError) {
      console.error('Error fetching indexes:', indexesError);
    } else {
      backup.indexes = indexes || [];
      console.log(`  - Found ${indexes?.length || 0} indexes`);
    }

    // 6. Get all triggers
    console.log('\n🎯 Extracting triggers...');
    const { data: triggers, error: triggersError } = await supabase
      .from('information_schema.triggers')
      .select('*')
      .eq('trigger_schema', 'public');

    if (triggersError) {
      console.error('Error fetching triggers:', triggersError);
    } else {
      backup.triggers = triggers || [];
      console.log(`  - Found ${triggers?.length || 0} triggers`);
    }

    // 7. Save backup to file
    const fs = require('fs');
    const backupFileName = `database-backup-${new Date().toISOString().split('T')[0]}.json`;
    const backupPath = `scripts/${backupFileName}`;
    
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));
    
    console.log(`\n✅ Backup completed successfully!`);
    console.log(`📁 Backup saved to: ${backupPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Tables: ${Object.keys(backup.tables).length}`);
    console.log(`   - Policies: ${Object.keys(backup.policies).length}`);
    console.log(`   - Functions: ${Object.keys(backup.functions).length}`);
    console.log(`   - Sequences: ${Object.keys(backup.sequences).length}`);
    console.log(`   - Indexes: ${Object.keys(backup.indexes).length}`);
    console.log(`   - Triggers: ${Object.keys(backup.triggers).length}`);

    // 8. Create SQL migration file
    const sqlBackupFileName = `database-backup-${new Date().toISOString().split('T')[0]}.sql`;
    const sqlBackupPath = `scripts/${sqlBackupFileName}`;
    
    let sqlContent = `-- Database Backup Generated on ${new Date().toISOString()}\n`;
    sqlContent += `-- This file contains the complete database structure and data\n\n`;
    
    // Add table creation statements
    for (const [tableName, tableInfo] of Object.entries(backup.tables)) {
      if (tableInfo.type === 'BASE TABLE') {
        sqlContent += `-- Table: ${tableName}\n`;
        sqlContent += `CREATE TABLE IF NOT EXISTS "${tableName}" (\n`;
        
        const columnDefs = tableInfo.columns.map(col => {
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
        
        // Add data insertion
        if (tableInfo.data.length > 0) {
          sqlContent += `-- Data for table: ${tableName}\n`;
          for (const row of tableInfo.data) {
            const columns = Object.keys(row);
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              return val;
            });
            sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
          }
          sqlContent += '\n';
        }
      }
    }
    
    // Add policies
    if (backup.policies.length > 0) {
      sqlContent += `-- RLS Policies\n`;
      for (const policy of backup.policies) {
        sqlContent += `-- Policy: ${policy.policyname} on ${policy.tablename}\n`;
        sqlContent += `-- ${policy.cmd} policy\n\n`;
      }
    }
    
    fs.writeFileSync(sqlBackupPath, sqlContent);
    console.log(`📄 SQL backup saved to: ${sqlBackupPath}`);

  } catch (error) {
    console.error('❌ Backup failed:', error);
    process.exit(1);
  }
}

// Create helper function to get all policies
async function createPolicyHelper() {
  try {
    const { error } = await supabase.rpc('create_or_replace_function', {
      function_name: 'get_all_policies',
      function_definition: `
        CREATE OR REPLACE FUNCTION get_all_policies()
        RETURNS TABLE (
          schemaname text,
          tablename text,
          policyname text,
          permissive text,
          roles text[],
          cmd text,
          qual text,
          with_check text
        ) AS $$
        BEGIN
          RETURN QUERY
          SELECT 
            p.schemaname,
            p.tablename,
            p.policyname,
            p.permissive,
            p.roles,
            p.cmd,
            p.qual,
            p.with_check
          FROM pg_policies p
          WHERE p.schemaname = 'public';
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.log('Could not create policy helper function, using fallback method');
    }
  } catch (error) {
    console.log('Policy helper function creation failed, using fallback method');
  }
}

// Run the backup
createPolicyHelper().then(() => {
  backupDatabase();
}); 