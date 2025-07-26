# Database Schema Documentation

This folder contains the complete database schema for the Zaloyal platform, structured as JSON files for easy reference and context.

## Files Overview

### 📊 `overview.json`
Comprehensive overview of the entire database schema including:
- Project summary and statistics
- Table summaries with relationships
- Function categories and descriptions
- Trigger summaries
- Security overview
- Key features list

### 🗂️ `tables.json`
Complete table definitions including:
- All 9 tables with full column details
- Primary keys and relationships
- RLS settings and metadata
- Column types, constraints, and comments

### ⚙️ `functions.json`
All 17 database functions with:
- Complete function definitions
- Source code
- Descriptions and purposes
- Categorized by functionality

### 🔄 `triggers.json`
All 5 database triggers including:
- Trigger definitions and timing
- Associated tables and functions
- Descriptions of automation logic

### 🔒 `rls-policies.json`
All 40 Row Level Security policies with:
- Policy definitions and conditions
- Target tables and operations
- Role-based access control details
- Security descriptions

## Database Summary

**Zaloyal** is a quest and engagement platform with:
- **9 tables** with comprehensive relationships
- **17 functions** for automation and business logic
- **5 triggers** for data consistency
- **40 RLS policies** for security
- Multi-platform social media integration
- Wallet connectivity (Solana)
- Quest and task management system
- XP and leveling system

## Key Tables

1. **users** - User profiles with social integrations
2. **projects** - Project information and metadata
3. **quests** - Quest definitions and metadata
4. **tasks** - Individual tasks within quests
5. **user_task_submissions** - Task completion records
6. **social_accounts** - Linked social media accounts
7. **project_members** - Project membership management
8. **oauth_states** - OAuth authentication state
9. **quest_categories** - Quest categorization

## Usage

These JSON files can be used for:
- **Development reference** - Understanding the database structure
- **API documentation** - Knowing available data and relationships
- **Security auditing** - Reviewing RLS policies and access control
- **Migration planning** - Understanding current schema state
- **Integration development** - Knowing available functions and triggers

## Last Updated

**2025-01-27T00:00:00Z**

All schema information was pulled directly from the live Supabase database using the MCP Supabase integration. 