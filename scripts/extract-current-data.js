const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function extractCurrentData() {
  console.log('🔄 Extracting current database data...\n');

  // List of tables to extract data from
  const tables = [
    'users',
    'projects', 
    'quests',
    'tasks',
    'user_task_submissions',
    'user_quest_progress',
    'user_badges',
    'telegram_verifications',
    'discord_verifications',
    'twitter_verifications'
  ];

  const dataBackup = {
    timestamp: new Date().toISOString(),
    tables: {},
    summary: {
      totalRows: 0,
      tableCount: 0
    }
  };

  try {
    for (const tableName of tables) {
      console.log(`📋 Extracting data from: ${tableName}`);
      
      try {
        const { data, error } = await supabase
          .from(tableName)
          .select('*');

        if (error) {
          console.log(`  ⚠️  Error extracting ${tableName}:`, error.message);
          dataBackup.tables[tableName] = {
            error: error.message,
            data: []
          };
        } else {
          dataBackup.tables[tableName] = {
            data: data || [],
            rowCount: data?.length || 0
          };
          dataBackup.summary.totalRows += data?.length || 0;
          console.log(`  ✅ Found ${data?.length || 0} rows`);
        }
      } catch (err) {
        console.log(`  ❌ Failed to extract ${tableName}:`, err.message);
        dataBackup.tables[tableName] = {
          error: err.message,
          data: []
        };
      }
    }

    dataBackup.summary.tableCount = Object.keys(dataBackup.tables).length;

    // Save JSON backup
    const fs = require('fs');
    const backupFileName = `data-backup-${new Date().toISOString().split('T')[0]}.json`;
    const backupPath = `scripts/${backupFileName}`;
    
    fs.writeFileSync(backupPath, JSON.stringify(dataBackup, null, 2));
    
    console.log(`\n✅ Data extraction completed!`);
    console.log(`📁 Data backup saved to: ${backupPath}`);
    console.log(`📊 Summary:`);
    console.log(`   - Tables processed: ${dataBackup.summary.tableCount}`);
    console.log(`   - Total rows: ${dataBackup.summary.totalRows}`);

    // Create SQL insert statements
    const sqlFileName = `data-backup-${new Date().toISOString().split('T')[0]}.sql`;
    const sqlPath = `scripts/${sqlFileName}`;
    
    let sqlContent = `-- Data Backup - ${new Date().toISOString()}\n`;
    sqlContent += `-- This file contains INSERT statements for all current data\n\n`;
    
    for (const [tableName, tableData] of Object.entries(dataBackup.tables)) {
      if (tableData.error) {
        sqlContent += `-- Table: ${tableName} (ERROR: ${tableData.error})\n`;
        sqlContent += `-- No data extracted due to error\n\n`;
        continue;
      }

      if (tableData.data.length === 0) {
        sqlContent += `-- Table: ${tableName} (No data)\n\n`;
        continue;
      }

      sqlContent += `-- Table: ${tableName} (${tableData.rowCount} rows)\n`;
      
      for (const row of tableData.data) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(val => {
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
          return val;
        });
        
        sqlContent += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlContent += '\n';
    }
    
    fs.writeFileSync(sqlPath, sqlContent);
    console.log(`📄 SQL data backup saved to: ${sqlPath}`);

    // Create a summary report
    const reportFileName = `data-summary-${new Date().toISOString().split('T')[0]}.txt`;
    const reportPath = `scripts/${reportFileName}`;
    
    let reportContent = `Database Data Summary - ${new Date().toISOString()}\n`;
    reportContent += `================================================\n\n`;
    reportContent += `Total Tables: ${dataBackup.summary.tableCount}\n`;
    reportContent += `Total Rows: ${dataBackup.summary.totalRows}\n\n`;
    
    for (const [tableName, tableData] of Object.entries(dataBackup.tables)) {
      if (tableData.error) {
        reportContent += `${tableName}: ERROR - ${tableData.error}\n`;
      } else {
        reportContent += `${tableName}: ${tableData.rowCount} rows\n`;
      }
    }
    
    fs.writeFileSync(reportPath, reportContent);
    console.log(`📊 Summary report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Data extraction failed:', error);
    process.exit(1);
  }
}

extractCurrentData(); 