-- Fix storage bucket creation and policies
DO $$
BEGIN
    -- Check if bucket exists, if not create it
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'quest-assets') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'quest-assets',
            'quest-assets',
            true,
            10485760, -- 10MB limit
            ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']
        );
    END IF;
END $$;

-- Drop existing storage policies if they exist
DROP POLICY IF EXISTS "Anyone can view quest assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload quest assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own uploads" ON storage.objects;

-- Create storage policies
CREATE POLICY "Anyone can view quest assets" ON storage.objects FOR SELECT USING (bucket_id = 'quest-assets');

CREATE POLICY "Authenticated users can upload quest assets" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'quest-assets'
);

CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (
    bucket_id = 'quest-assets'
);

CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (
    bucket_id = 'quest-assets'
);
