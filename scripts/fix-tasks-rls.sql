-- Fix RLS policies for tasks table

-- First, check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'tasks';

-- Enable RLS on tasks table if not already enabled
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to read tasks" ON tasks;
DROP POLICY IF EXISTS "Allow project owners to manage tasks" ON tasks;
DROP POLICY IF EXISTS "Allow service role full access" ON tasks;
DROP POLICY IF EXISTS "Project owners can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Project owners can delete tasks" ON tasks;
DROP POLICY IF EXISTS "Anyone can view active tasks" ON tasks;

-- Policy 1: Allow public read access to active tasks
-- This allows anyone (including unauthenticated users) to see active tasks
CREATE POLICY "Allow public read access to active tasks" ON tasks
    FOR SELECT
    TO public
    USING (status = 'pending' OR status = 'completed');

-- Policy 2: Allow authenticated users to read all tasks
-- This allows authenticated users to see all tasks (for better UX)
CREATE POLICY "Allow authenticated users to read all tasks" ON tasks
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 3: Allow project owners to insert tasks for their quests
-- This allows project owners to create tasks for their own quests
CREATE POLICY "Allow project owners to insert tasks" ON tasks
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quests 
            JOIN projects ON quests.project_id = projects.id
            WHERE quests.id = tasks.quest_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 4: Allow project owners to update tasks for their quests
-- This allows project owners to edit tasks from their own quests
CREATE POLICY "Allow project owners to update tasks" ON tasks
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quests 
            JOIN projects ON quests.project_id = projects.id
            WHERE quests.id = tasks.quest_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM quests 
            JOIN projects ON quests.project_id = projects.id
            WHERE quests.id = tasks.quest_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 5: Allow project owners to delete tasks from their quests
-- This allows project owners to delete tasks from their own quests
CREATE POLICY "Allow project owners to delete tasks" ON tasks
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM quests 
            JOIN projects ON quests.project_id = projects.id
            WHERE quests.id = tasks.quest_id 
            AND projects.owner_id::text = auth.uid()::text
        )
    );

-- Policy 6: Allow service role full access
-- This allows admin operations and data management
CREATE POLICY "Allow service role full access to tasks" ON tasks
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow public read access to active tasks" ON tasks IS 'Allows public access to active tasks';
COMMENT ON POLICY "Allow authenticated users to read all tasks" ON tasks IS 'Allows authenticated users to see all tasks';
COMMENT ON POLICY "Allow project owners to insert tasks" ON tasks IS 'Allows project owners to create tasks for their own quests';
COMMENT ON POLICY "Allow project owners to update tasks" ON tasks IS 'Allows project owners to edit tasks from their own quests';
COMMENT ON POLICY "Allow project owners to delete tasks" ON tasks IS 'Allows project owners to delete tasks from their own quests';
COMMENT ON POLICY "Allow service role full access to tasks" ON tasks IS 'Allows admin operations and data management';

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'tasks'
ORDER BY policyname; 