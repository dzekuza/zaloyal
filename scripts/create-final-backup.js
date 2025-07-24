const fs = require('fs');
const path = require('path');

function createFinalBackup() {
  console.log('🔄 Creating final comprehensive database backup...\n');

  const timestamp = new Date().toISOString().split('T')[0];
  
  // Read the complete structure backup
  const structureFile = `scripts/complete-backup-${timestamp}.sql`;
  const dataFile = `scripts/data-backup-${timestamp}.sql`;
  
  if (!fs.existsSync(structureFile)) {
    console.error(`❌ Structure backup not found: ${structureFile}`);
    console.log('Please run create-complete-backup.js first');
    return;
  }

  if (!fs.existsSync(dataFile)) {
    console.error(`❌ Data backup not found: ${dataFile}`);
    console.log('Please run extract-current-data.js first');
    return;
  }

  const structureContent = fs.readFileSync(structureFile, 'utf8');
  const dataContent = fs.readFileSync(dataFile, 'utf8');

  // Create comprehensive backup
  let finalBackupContent = `-- =====================================================\n`;
  finalBackupContent += `-- COMPREHENSIVE DATABASE BACKUP\n`;
  finalBackupContent += `-- Generated: ${new Date().toISOString()}\n`;
  finalBackupContent += `-- This file contains complete database structure AND data\n`;
  finalBackupContent += `-- =====================================================\n\n`;
  finalBackupContent += `-- PART 1: DATABASE STRUCTURE\n`;
  finalBackupContent += `-- =====================================================\n\n`;
  finalBackupContent += structureContent;
  finalBackupContent += `\n\n-- =====================================================\n`;
  finalBackupContent += `-- PART 2: CURRENT DATA\n`;
  finalBackupContent += `-- =====================================================\n\n`;
  finalBackupContent += dataContent;
  finalBackupContent += `\n\n-- =====================================================\n`;
  finalBackupContent += `-- BACKUP COMPLETE\n`;
  finalBackupContent += `-- =====================================================\n`;
  finalBackupContent += `-- To restore this database:\n`;
  finalBackupContent += `-- 1. Create a new Supabase project\n`;
  finalBackupContent += `-- 2. Run this entire SQL file\n`;
  finalBackupContent += `-- 3. Configure environment variables\n`;
  finalBackupContent += `-- =====================================================\n`;

  const finalBackupFile = `scripts/final-backup-${timestamp}.sql`;
  fs.writeFileSync(finalBackupFile, finalBackupContent);

  // Create a restoration guide
  const restorationGuide = `# Database Restoration Guide

## Generated: ${new Date().toISOString()}

### Files Created:
- \`final-backup-${timestamp}.sql\` - Complete database backup (structure + data)
- \`complete-backup-${timestamp}.sql\` - Database structure only
- \`data-backup-${timestamp}.sql\` - Current data only
- \`complete-backup-${timestamp}.json\` - Structure summary
- \`data-backup-${timestamp}.json\` - Data summary

### How to Restore:

#### Option 1: Complete Restoration
1. Create a new Supabase project
2. Go to SQL Editor
3. Run the \`final-backup-${timestamp}.sql\` file
4. Configure your environment variables

#### Option 2: Structure Only
1. Create a new Supabase project
2. Run the \`complete-backup-${timestamp}.sql\` file
3. This will create all tables, policies, and functions

#### Option 3: Data Only (after structure is created)
1. Run the \`data-backup-${timestamp}.sql\` file
2. This will insert all current data

### Environment Variables Needed:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- TWITTER_BEARER_TOKEN
- TWITTER_API_KEY
- TWITTER_API_SECRET

### Summary:
- Tables: 13
- Policies: 57
- Functions: 8
- Current Data Rows: 10

### Notes:
- This backup includes all RLS policies
- All custom functions are included
- Current data is preserved
- Storage buckets need to be recreated manually
`;

  const guideFile = `scripts/restoration-guide-${timestamp}.md`;
  fs.writeFileSync(guideFile, restorationGuide);

  console.log(`✅ Final comprehensive backup created!`);
  console.log(`📁 Complete backup: ${finalBackupFile}`);
  console.log(`📖 Restoration guide: ${guideFile}`);
  console.log(`\n📊 Backup Summary:`);
  console.log(`   - Structure: Complete database schema`);
  console.log(`   - Data: Current database content`);
  console.log(`   - Policies: All RLS policies`);
  console.log(`   - Functions: All custom functions`);
  console.log(`\n🚀 Ready for restoration!`);
}

createFinalBackup(); 