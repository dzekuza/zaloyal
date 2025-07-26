-- Storage Helper Functions for ZaLoyal App
-- These functions help with file path generation and storage operations

-- Function to generate a unique filename with timestamp
CREATE OR REPLACE FUNCTION generate_unique_filename(
    original_name TEXT,
    user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT AS $$
DECLARE
    file_extension TEXT;
    timestamp TEXT;
    unique_filename TEXT;
BEGIN
    -- Extract file extension
    file_extension := CASE 
        WHEN original_name LIKE '%.%' THEN 
            '.' || split_part(original_name, '.', -1)
        ELSE ''
    END;
    
    -- Generate timestamp
    timestamp := to_char(now(), 'YYYYMMDD_HH24MISS');
    
    -- Create unique filename
    unique_filename := user_id::text || '_' || timestamp || file_extension;
    
    RETURN unique_filename;
END;
$$ LANGUAGE plpgsql;

-- Function to get storage URL for a file
CREATE OR REPLACE FUNCTION get_storage_url(
    bucket_name TEXT,
    file_path TEXT
)
RETURNS TEXT AS $$
BEGIN
    RETURN 'https://' || current_setting('app.settings.supabase_url') || '/storage/v1/object/public/' || bucket_name || '/' || file_path;
END;
$$ LANGUAGE plpgsql;

-- Function to validate file upload
CREATE OR REPLACE FUNCTION validate_file_upload(
    bucket_id TEXT,
    file_name TEXT,
    file_size BIGINT,
    mime_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    bucket_record RECORD;
BEGIN
    -- Get bucket configuration
    SELECT * INTO bucket_record 
    FROM storage.buckets 
    WHERE id = bucket_id;
    
    -- Check if bucket exists
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Bucket % does not exist', bucket_id;
    END IF;
    
    -- Check file size limit
    IF bucket_record.file_size_limit IS NOT NULL AND file_size > bucket_record.file_size_limit THEN
        RAISE EXCEPTION 'File size % exceeds limit of %', file_size, bucket_record.file_size_limit;
    END IF;
    
    -- Check MIME type
    IF bucket_record.allowed_mime_types IS NOT NULL AND NOT (mime_type = ANY(bucket_record.allowed_mime_types)) THEN
        RAISE EXCEPTION 'MIME type % is not allowed. Allowed types: %', mime_type, bucket_record.allowed_mime_types;
    END IF;
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old files (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_files(
    bucket_id TEXT,
    days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = cleanup_old_files.bucket_id 
    AND created_at < now() - (days_old || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Test the helper functions
SELECT 
    'Helper functions created successfully' as status,
    generate_unique_filename('test-image.jpg') as sample_filename,
    get_storage_url('quest-images', 'test-file.jpg') as sample_url; 