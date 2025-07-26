# ZaLoyal Storage Setup Guide

## Overview
This guide covers the complete storage setup for the ZaLoyal application, including buckets, policies, and usage examples.

## Storage Buckets Created

### 1. `quest-images` (Public)
- **Purpose**: Quest cover images and quest-related media
- **Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, WebP, GIF
- **Access**: Public read, authenticated upload

### 2. `project-logos` (Public)
- **Purpose**: Project logos and branding images
- **Size Limit**: 2MB
- **Allowed Types**: JPEG, PNG, WebP, SVG
- **Access**: Public read, authenticated upload

### 3. `user-avatars` (Public)
- **Purpose**: User profile pictures
- **Size Limit**: 1MB
- **Allowed Types**: JPEG, PNG, WebP
- **Access**: Public read, users can only upload to their own folder

### 4. `quest-responses` (Private)
- **Purpose**: User-submitted quest responses and evidence
- **Size Limit**: 10MB
- **Allowed Types**: Images, videos, PDFs
- **Access**: Private - only authenticated users can access

### 5. `project-covers` (Public)
- **Purpose**: Project cover images and banners
- **Size Limit**: 5MB
- **Allowed Types**: JPEG, PNG, WebP
- **Access**: Public read, authenticated upload

## File Path Structure

### Recommended File Paths:
```
quest-images/
├── {quest_id}/
│   ├── cover.jpg
│   └── gallery/
│       ├── image1.jpg
│       └── image2.png

project-logos/
├── {project_id}/
│   └── logo.png

user-avatars/
├── {user_id}/
│   └── avatar.jpg

quest-responses/
├── {quest_id}/
│   └── {user_id}/
│       ├── response1.jpg
│       └── evidence.pdf

project-covers/
├── {project_id}/
│   └── cover.jpg
```

## Usage Examples

### Frontend Upload Example (Next.js)
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Upload quest image
const uploadQuestImage = async (file: File, questId: string) => {
  const fileName = `${questId}/cover.${file.name.split('.').pop()}`
  
  const { data, error } = await supabase.storage
    .from('quest-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })
    
  if (error) throw error
  return data
}

// Upload user avatar
const uploadUserAvatar = async (file: File, userId: string) => {
  const fileName = `${userId}/avatar.${file.name.split('.').pop()}`
  
  const { data, error } = await supabase.storage
    .from('user-avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true
    })
    
  if (error) throw error
  return data
}
```

### Get Public URL
```typescript
// Get public URL for quest image
const getQuestImageUrl = (questId: string, fileName: string) => {
  const { data } = supabase.storage
    .from('quest-images')
    .getPublicUrl(`${questId}/${fileName}`)
  
  return data.publicUrl
}
```

## Security Features

### RLS Policies Implemented:
1. **Authentication Required**: All uploads require authenticated users
2. **User Isolation**: Users can only access their own avatar files
3. **Public Read Access**: Quest images, project logos, and covers are publicly readable
4. **Private Responses**: Quest responses are private and only accessible to authenticated users
5. **File Type Validation**: Only allowed MIME types can be uploaded
6. **Size Limits**: Each bucket has appropriate file size limits

### Helper Functions Available:
- `generate_unique_filename()` - Creates unique filenames with timestamps
- `get_storage_url()` - Generates public URLs for files
- `validate_file_upload()` - Validates file uploads against bucket rules
- `cleanup_old_files()` - Removes old files for maintenance

## Setup Instructions

### 1. Run the SQL Scripts
Execute these scripts in your Supabase SQL editor:
1. `setup-storage-buckets.sql` - Creates buckets and policies
2. `create-storage-helper-functions.sql` - Creates helper functions

### 2. Update Environment Variables
Make sure your `.env.local` includes:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### 3. Test the Setup
```sql
-- Verify buckets were created
SELECT id, name, public, file_size_limit FROM storage.buckets;

-- Test helper functions
SELECT generate_unique_filename('test.jpg');
```

## Maintenance

### Regular Cleanup
```sql
-- Clean up old files (run monthly)
SELECT cleanup_old_files('quest-responses', 90); -- Remove files older than 90 days
```

### Monitor Storage Usage
```sql
-- Check storage usage by bucket
SELECT 
    bucket_id,
    COUNT(*) as file_count,
    SUM(metadata->>'size')::bigint as total_size_bytes
FROM storage.objects 
GROUP BY bucket_id;
```

## Best Practices

1. **Use Descriptive File Names**: Include context in filenames
2. **Organize by ID**: Use quest/project/user IDs in file paths
3. **Validate on Frontend**: Check file size and type before upload
4. **Handle Errors**: Implement proper error handling for upload failures
5. **Optimize Images**: Compress images before upload for better performance
6. **Backup Important Files**: Consider backing up critical project assets

## Troubleshooting

### Common Issues:
1. **403 Forbidden**: Check RLS policies and user authentication
2. **File Too Large**: Verify file size against bucket limits
3. **Invalid File Type**: Check MIME type against allowed types
4. **Storage Quota**: Monitor your Supabase storage usage

### Debug Queries:
```sql
-- Check bucket policies
SELECT * FROM pg_policies WHERE tablename = 'objects';

-- Check storage usage
SELECT bucket_id, COUNT(*) FROM storage.objects GROUP BY bucket_id;
``` 