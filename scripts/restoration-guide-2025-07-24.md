# Database Restoration Guide

## Generated: 2025-07-24T00:40:58.591Z

### Files Created:
- `final-backup-2025-07-24.sql` - Complete database backup (structure + data)
- `complete-backup-2025-07-24.sql` - Database structure only
- `data-backup-2025-07-24.sql` - Current data only
- `complete-backup-2025-07-24.json` - Structure summary
- `data-backup-2025-07-24.json` - Data summary

### How to Restore:

#### Option 1: Complete Restoration
1. Create a new Supabase project
2. Go to SQL Editor
3. Run the `final-backup-2025-07-24.sql` file
4. Configure your environment variables

#### Option 2: Structure Only
1. Create a new Supabase project
2. Run the `complete-backup-2025-07-24.sql` file
3. This will create all tables, policies, and functions

#### Option 3: Data Only (after structure is created)
1. Run the `data-backup-2025-07-24.sql` file
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
