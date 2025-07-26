-- Fix RLS policies for projects table to allow public access to approved projects

-- First, check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'projects';

-- Enable RLS on projects table if not already enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to approved projects" ON projects;
DROP POLICY IF EXISTS "Allow authenticated users to read all projects" ON projects;
DROP POLICY IF EXISTS "Allow project owners to manage their projects" ON projects;
DROP POLICY IF EXISTS "Allow service role full access" ON projects;

-- Policy 1: Allow public read access to approved projects
-- This allows anyone (including unauthenticated users) to see approved projects
CREATE POLICY "Allow public read access to approved projects" ON projects
    FOR SELECT
    TO public
    USING (status = 'approved');

-- Policy 2: Allow authenticated users to read all projects
-- This allows authenticated users to see all projects (for dashboard, etc.)
CREATE POLICY "Allow authenticated users to read all projects" ON projects
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Allow project owners to manage their projects
-- This allows project owners to update/delete their own projects
-- Fixed: Proper UUID comparison
CREATE POLICY "Allow project owners to manage their projects" ON projects
    FOR ALL
    TO authenticated
    USING (auth.uid()::text = owner_id::text)
    WITH CHECK (auth.uid()::text = owner_id::text);

-- Policy 4: Allow service role full access
-- This allows admin operations and data management
CREATE POLICY "Allow service role full access" ON projects
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow public read access to approved projects" ON projects IS 'Allows public access to approved projects for the main page';
COMMENT ON POLICY "Allow authenticated users to read all projects" ON projects IS 'Allows authenticated users to see all projects in their dashboard';
COMMENT ON POLICY "Allow project owners to manage their projects" ON projects IS 'Allows project owners to edit and delete their own projects';
COMMENT ON POLICY "Allow service role full access" ON projects IS 'Allows admin operations and data management';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'projects'
ORDER BY policyname; 