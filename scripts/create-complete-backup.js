const fs = require('fs');
const path = require('path');

// List of migration files in order
const migrationFiles = [
  '01-create-tables.sql',
  '02-create-policies-fixed.sql',
  '03-create-storage-bucket.sql',
  '04-seed-data.sql',
  '05-create-functions.sql',
  '06-fix-storage-bucket.sql',
  '07-update-existing-data.sql',
  '08-fix-rls-policies.sql',
  '09-add-projects-and-auth.sql',
  '10-lowercase-wallet-addresses.sql',
  '11-add-twitter-to-users.sql',
  '11-add-missing-task-fields.sql',
  '12-create-telegram-verifications.sql',
  '12-fix-project-ownership.sql',
  '13-add-response-management-columns.sql',
  '14-create-task-verifications.sql',
  '15-twitter-identity-functions.sql',
  '16-add-x-columns-to-users.sql',
  '17-add-twitter-url-to-projects.sql'
];

function createCompleteBackup() {
  console.log('🔄 Creating complete database backup from migration files...\n');

  let completeSQL = `-- Complete Database Backup Generated on ${new Date().toISOString()}\n`;
  completeSQL += `-- This file contains all tables, policies, and functions from migration files\n\n`;
  completeSQL += `-- =====================================================\n`;
  completeSQL += `-- DATABASE STRUCTURE BACKUP\n`;
  completeSQL += `-- =====================================================\n\n`;

  let tableCount = 0;
  let policyCount = 0;
  let functionCount = 0;

  for (const file of migrationFiles) {
    const filePath = path.join(__dirname, file);
    
    if (fs.existsSync(filePath)) {
      console.log(`📄 Processing: ${file}`);
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Count different types of SQL statements
      const tableMatches = content.match(/CREATE TABLE/g) || [];
      const policyMatches = content.match(/CREATE POLICY/g) || [];
      const functionMatches = content.match(/CREATE OR REPLACE FUNCTION/g) || [];
      
      tableCount += tableMatches.length;
      policyCount += policyMatches.length;
      functionCount += functionMatches.length;
      
      completeSQL += `-- =====================================================\n`;
      completeSQL += `-- FROM: ${file}\n`;
      completeSQL += `-- =====================================================\n\n`;
      completeSQL += content;
      completeSQL += `\n\n`;
    } else {
      console.log(`⚠️  File not found: ${file}`);
    }
  }

  // Add summary
  completeSQL += `-- =====================================================\n`;
  completeSQL += `-- BACKUP SUMMARY\n`;
  completeSQL += `-- =====================================================\n`;
  completeSQL += `-- Generated: ${new Date().toISOString()}\n`;
  completeSQL += `-- Tables: ${tableCount}\n`;
  completeSQL += `-- Policies: ${policyCount}\n`;
  completeSQL += `-- Functions: ${functionCount}\n`;
  completeSQL += `-- Migration Files: ${migrationFiles.length}\n`;
  completeSQL += `-- =====================================================\n`;

  // Save complete backup
  const backupFileName = `complete-backup-${new Date().toISOString().split('T')[0]}.sql`;
  const backupPath = path.join(__dirname, backupFileName);
  
  fs.writeFileSync(backupPath, completeSQL);
  
  console.log(`\n✅ Complete backup created!`);
  console.log(`📁 Backup saved to: ${backupPath}`);
  console.log(`📊 Summary:`);
  console.log(`   - Migration files processed: ${migrationFiles.length}`);
  console.log(`   - Tables: ${tableCount}`);
  console.log(`   - Policies: ${policyCount}`);
  console.log(`   - Functions: ${functionCount}`);

  // Also create a JSON summary
  const summary = {
    timestamp: new Date().toISOString(),
    migrationFiles: migrationFiles,
    summary: {
      tableCount,
      policyCount,
      functionCount,
      migrationFileCount: migrationFiles.length
    },
    description: 'Complete database backup created from existing migration files'
  };

  const jsonFileName = `complete-backup-${new Date().toISOString().split('T')[0]}.json`;
  const jsonPath = path.join(__dirname, jsonFileName);
  
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));
  console.log(`📄 JSON summary saved to: ${jsonPath}`);

  // Create a simplified version for easy reading
  const simpleFileName = `simple-backup-${new Date().toISOString().split('T')[0]}.sql`;
  const simplePath = path.join(__dirname, simpleFileName);
  
  let simpleSQL = `-- Simple Database Backup - ${new Date().toISOString()}\n\n`;
  simpleSQL += `-- This is a simplified version of the complete backup\n`;
  simpleSQL += `-- For the full backup with all migrations, see: ${backupFileName}\n\n`;
  simpleSQL += `-- Summary:\n`;
  simpleSQL += `-- - Tables: ${tableCount}\n`;
  simpleSQL += `-- - Policies: ${policyCount}\n`;
  simpleSQL += `-- - Functions: ${functionCount}\n`;
  simpleSQL += `-- - Migration Files: ${migrationFiles.length}\n\n`;
  simpleSQL += `-- To restore this database:\n`;
  simpleSQL += `-- 1. Run the complete backup SQL file\n`;
  simpleSQL += `-- 2. Or run the migration files in order\n\n`;
  
  fs.writeFileSync(simplePath, simpleSQL);
  console.log(`📄 Simple backup saved to: ${simplePath}`);
}

createCompleteBackup(); 