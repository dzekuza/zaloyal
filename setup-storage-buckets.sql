-- Setup Storage Buckets and Policies for ZaLoyal App
-- This script creates organized storage buckets with proper RLS policies

-- 1. Create specific buckets for different content types
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
    ('quest-images', 'quest-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
    ('project-logos', 'project-logos', true, 2097152, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('user-avatars', 'user-avatars', true, 1048576, ARRAY['image/jpeg', 'image/png', 'image/webp']),
    ('quest-responses', 'quest-responses', false, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm', 'application/pdf']),
    ('project-covers', 'project-covers', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Create RLS policies for quest-images bucket
-- Allow authenticated users to upload quest images
CREATE POLICY "Users can upload quest images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'quest-images' 
        AND auth.role() = 'authenticated'
    );

-- Allow public read access to quest images
CREATE POLICY "Public read access to quest images" ON storage.objects
    FOR SELECT USING (bucket_id = 'quest-images');

-- Allow quest creators to update/delete their quest images
CREATE POLICY "Quest creators can update quest images" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'quest-images' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Quest creators can delete quest images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'quest-images' 
        AND auth.role() = 'authenticated'
    );

-- 3. Create RLS policies for project-logos bucket
-- Allow authenticated users to upload project logos
CREATE POLICY "Users can upload project logos" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-logos' 
        AND auth.role() = 'authenticated'
    );

-- Allow public read access to project logos
CREATE POLICY "Public read access to project logos" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-logos');

-- Allow project owners to update/delete their project logos
CREATE POLICY "Project owners can update project logos" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-logos' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Project owners can delete project logos" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-logos' 
        AND auth.role() = 'authenticated'
    );

-- 4. Create RLS policies for user-avatars bucket
-- Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- Allow public read access to user avatars
CREATE POLICY "Public read access to user avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');

-- Allow users to update/delete their own avatars
CREATE POLICY "Users can update their avatars" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'user-avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

CREATE POLICY "Users can delete their avatars" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'user-avatars' 
        AND auth.role() = 'authenticated'
        AND (storage.foldername(name))[1] = auth.uid()::text
    );

-- 5. Create RLS policies for quest-responses bucket (private)
-- Allow authenticated users to upload quest responses
CREATE POLICY "Users can upload quest responses" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'quest-responses' 
        AND auth.role() = 'authenticated'
    );

-- Allow users to read their own quest responses and quest creators to read responses
CREATE POLICY "Users can read quest responses" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'quest-responses' 
        AND auth.role() = 'authenticated'
    );

-- Allow users to update/delete their own quest responses
CREATE POLICY "Users can update quest responses" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'quest-responses' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Users can delete quest responses" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'quest-responses' 
        AND auth.role() = 'authenticated'
    );

-- 6. Create RLS policies for project-covers bucket
-- Allow authenticated users to upload project covers
CREATE POLICY "Users can upload project covers" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'project-covers' 
        AND auth.role() = 'authenticated'
    );

-- Allow public read access to project covers
CREATE POLICY "Public read access to project covers" ON storage.objects
    FOR SELECT USING (bucket_id = 'project-covers');

-- Allow project owners to update/delete their project covers
CREATE POLICY "Project owners can update project covers" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'project-covers' 
        AND auth.role() = 'authenticated'
    );

CREATE POLICY "Project owners can delete project covers" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'project-covers' 
        AND auth.role() = 'authenticated'
    );

-- 7. Verify the setup
SELECT 
    'Storage buckets created:' as info,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id IN ('quest-images', 'project-logos', 'user-avatars', 'quest-responses', 'project-covers')
ORDER BY id; 