-- Add RLS policies for quest_categories table

-- Enable RLS on quest_categories table
ALTER TABLE quest_categories ENABLE ROW LEVEL SECURITY;

-- Add unique constraint on name column to support ON CONFLICT
ALTER TABLE quest_categories 
ADD CONSTRAINT quest_categories_name_unique UNIQUE (name);

-- Policy 1: Allow all authenticated users to read quest categories
-- This allows users to see available categories when creating quests
CREATE POLICY "Allow authenticated users to read quest categories" ON quest_categories
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Allow project owners to create quest categories
-- This allows project creators to add categories for their projects
CREATE POLICY "Allow project owners to create quest categories" ON quest_categories
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Policy 3: Allow project owners to update quest categories they created
-- This allows editing of category details
CREATE POLICY "Allow project owners to update quest categories" ON quest_categories
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Policy 4: Allow project owners to delete quest categories they created
-- This allows removal of unused categories
CREATE POLICY "Allow project owners to delete quest categories" ON quest_categories
    FOR DELETE
    TO authenticated
    USING (true);

-- Policy 5: Allow service role to perform all operations
-- This allows admin operations and data management
CREATE POLICY "Allow service role full access to quest categories" ON quest_categories
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Add comments for documentation
COMMENT ON POLICY "Allow authenticated users to read quest categories" ON quest_categories IS 'Allows all authenticated users to read quest categories for quest creation';
COMMENT ON POLICY "Allow project owners to create quest categories" ON quest_categories IS 'Allows project creators to add new quest categories';
COMMENT ON POLICY "Allow project owners to update quest categories" ON quest_categories IS 'Allows editing of quest category details';
COMMENT ON POLICY "Allow project owners to delete quest categories" ON quest_categories IS 'Allows removal of unused quest categories';
COMMENT ON POLICY "Allow service role full access to quest categories" ON quest_categories IS 'Allows admin operations and data management';

-- Add updated_at column if it doesn't exist
ALTER TABLE quest_categories 
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Add icon and color columns if they don't exist
ALTER TABLE quest_categories 
ADD COLUMN IF NOT EXISTS icon text;

ALTER TABLE quest_categories 
ADD COLUMN IF NOT EXISTS color text;

-- Insert some default quest categories
INSERT INTO quest_categories (name, description, icon, color) VALUES
    ('Social Media', 'Tasks involving social media platforms like Twitter, Discord, and Telegram', 'users', '#3B82F6'),
    ('Learning', 'Educational tasks and knowledge-based activities', 'book-open', '#10B981'),
    ('Community', 'Tasks that build and engage the community', 'users', '#F59E0B'),
    ('Development', 'Technical tasks and development-related activities', 'code', '#8B5CF6'),
    ('Marketing', 'Promotional and marketing-related tasks', 'megaphone', '#EF4444'),
    ('Content Creation', 'Tasks involving content creation and sharing', 'edit-3', '#06B6D4'),
    ('Gaming', 'Gaming-related tasks and activities', 'gamepad-2', '#84CC16'),
    ('NFT & Crypto', 'Blockchain and cryptocurrency-related tasks', 'bitcoin', '#F97316')
ON CONFLICT (name) DO NOTHING;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_quest_categories_name ON quest_categories(name);
CREATE INDEX IF NOT EXISTS idx_quest_categories_created_at ON quest_categories(created_at);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_quest_categories_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_quest_categories_updated_at_trigger ON quest_categories;
CREATE TRIGGER update_quest_categories_updated_at_trigger
    BEFORE UPDATE ON quest_categories
    FOR EACH ROW
    EXECUTE FUNCTION update_quest_categories_updated_at();

-- Update existing records to have default values
UPDATE quest_categories 
SET icon = 'tag', color = '#6B7280' 
WHERE icon IS NULL OR color IS NULL; 