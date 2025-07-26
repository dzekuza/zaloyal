-- 01-rls-policies.sql
-- Enable Row Level Security and define policies for social_accounts and project_members

-- SOCIAL ACCOUNTS TABLE POLICIES
ALTER TABLE social_accounts ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own social accounts
CREATE POLICY "Users can view their social accounts"
  ON social_accounts
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to insert their own social accounts
CREATE POLICY "Users can insert their own social accounts"
  ON social_accounts
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own social accounts
CREATE POLICY "Users can update their own social accounts"
  ON social_accounts
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow users to delete their own social accounts
CREATE POLICY "Users can delete their own social accounts"
  ON social_accounts
  FOR DELETE
  USING (auth.uid() = user_id);


-- PROJECT MEMBERS TABLE POLICIES
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own project memberships
CREATE POLICY "Users can view their project memberships"
  ON project_members
  FOR SELECT
  USING (auth.uid() = user_id);

-- Allow users to add themselves as members (for auto-add logic or self-join)
CREATE POLICY "Users can add themselves as members"
  ON project_members
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Allow users to remove themselves from a project
CREATE POLICY "Users can remove themselves from a project"
  ON project_members
  FOR DELETE
  USING (auth.uid() = user_id);

-- End of RLS policies for social_accounts and project_members 