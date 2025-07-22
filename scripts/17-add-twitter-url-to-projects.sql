-- Add twitter_url column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS twitter_url TEXT;

-- Add index for twitter_url column
CREATE INDEX IF NOT EXISTS idx_projects_twitter_url ON public.projects USING btree (twitter_url) TABLESPACE pg_default; 