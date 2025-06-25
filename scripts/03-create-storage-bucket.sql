-- Create storage bucket for quest images, user avatars, and other assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'quest-assets',
    'quest-assets',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'application/pdf']
);

-- Create storage policies
CREATE POLICY "Anyone can view quest assets" ON storage.objects FOR SELECT USING (bucket_id = 'quest-assets');

CREATE POLICY "Authenticated users can upload quest assets" ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'quest-assets' AND 
    auth.role() = 'authenticated'
);

CREATE POLICY "Users can update own uploads" ON storage.objects FOR UPDATE USING (
    bucket_id = 'quest-assets' AND 
    auth.uid()::text = owner
);

CREATE POLICY "Users can delete own uploads" ON storage.objects FOR DELETE USING (
    bucket_id = 'quest-assets' AND 
    auth.uid()::text = owner
);
