-- Fix the storage helper functions
-- Remove the problematic get_storage_url function and create a simpler version

-- Drop the problematic function
DROP FUNCTION IF EXISTS get_storage_url(TEXT, TEXT);

-- Create a simpler version that doesn't rely on configuration parameters
CREATE OR REPLACE FUNCTION get_storage_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    -- Return a template URL that can be used with the actual Supabase URL
    -- The frontend will need to construct the full URL
    RETURN bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Test the fixed function
SELECT 
    'Helper functions fixed successfully' as status,
    generate_unique_filename('test-image.jpg') as sample_filename,
    get_storage_url('quest-images', 'test-file.jpg') as sample_path; 