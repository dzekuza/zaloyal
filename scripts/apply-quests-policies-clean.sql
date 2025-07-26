-- Clean slate: Remove all existing quests policies and add new ones

-- First, check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'quests'
ORDER BY policyname;

-- Enable RLS on quests table if not already enabled
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

-- Remove ALL existing policies for quests table
DROP POLICY IF EXISTS "Allow public read access to active quests" ON quests;
DROP POLICY IF EXISTS "Allow authenticated users to read all quests" ON quests;
DROP POLICY IF EXISTS "Allow project owners to insert quests" ON quests;
DROP POLICY IF EXISTS "Allow project owners to update quests" ON quests;
DROP POLICY IF EXISTS "Allow project owners to delete quests" ON quests;
DROP POLICY IF EXISTS "Allow service role full access to quests" ON quests;
DROP POLICY IF EXISTS "Allow service role full access" ON quests;
DROP POLICY IF EXISTS "Allow quest creators to manage their quests" ON quests;
DROP POLICY IF EXISTS "Allow project owners to manage quests" ON quests;
DROP POLICY IF EXISTS "Allow authenticated users to read quests" ON quests;
DROP POLICY IF EXISTS "Project owners can insert quests" ON quests;
DROP POLICY IF EXISTS "Project owners can delete quests" ON quests;
DROP POLICY IF EXISTS "Anyone can view active quests" ON quests;
DROP POLICY IF EXISTS "Creators can manage own quests" ON quests;
DROP POLICY IF EXISTS "Creators can insert quests" ON quests;
DROP POLICY IF EXISTS "Project owners can manage project quests" ON quests;
DROP POLICY IF EXISTS "Project owners can insert quests" ON quests;
DROP POLICY IF EXISTS "Project owners can update quests" ON quests;
DROP POLICY IF EXISTS "Project owners can delete quests" ON quests;
DROP POLICY IF EXISTS "Anyone can view active project quests" ON quests;

-- Now add the new policies

-- Policy 1: Allow public read access to active quests
-- This allows anyone (including unauthenticated users) to see active quests
CREATE POLICY "Allow public read access to active quests" ON quests
    FOR SELECT
    TO public
    USING (status = 'active');

-- Policy 2: Allow authenticated users to read all quests
-- This allows authenticated users to see all quests (for better UX)
CREATE POLICY "Allow authenticated users to read all quests" ON quests
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Allow project owners to insert quests for their projects
-- This allows project owners to create quests for their own projects
CREATE POLICY "Allow project owners to insert quests" ON quests
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = quests.project_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 4: Allow project owners to update quests for their projects
-- This allows project owners to edit quests from their own projects
CREATE POLICY "Allow project owners to update quests" ON quests
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = quests.project_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = quests.project_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 5: Allow project owners to delete quests from their projects
-- This allows project owners to delete quests from their own projects
CREATE POLICY "Allow project owners to delete quests" ON quests
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects 
            WHERE projects.id = quests.project_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 6: Allow service role full access
-- This allows admin operations and data management
CREATE POLICY "Allow service role full access to quests" ON quests
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow public read access to active quests" ON quests IS 'Allows public access to active quests';
COMMENT ON POLICY "Allow authenticated users to read all quests" ON quests IS 'Allows authenticated users to see all quests';
COMMENT ON POLICY "Allow project owners to insert quests" ON quests IS 'Allows project owners to create quests for their own projects';
COMMENT ON POLICY "Allow project owners to update quests" ON quests IS 'Allows project owners to edit quests from their own projects';
COMMENT ON POLICY "Allow project owners to delete quests" ON quests IS 'Allows project owners to delete quests from their own projects';
COMMENT ON POLICY "Allow service role full access to quests" ON quests IS 'Allows admin operations and data management';

-- Verify the new policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'quests'
ORDER BY policyname;

-- Test the policies by checking if we can access quests
SELECT COUNT(*) as total_quests FROM quests;
SELECT COUNT(*) as active_quests FROM quests WHERE status = 'active'; 