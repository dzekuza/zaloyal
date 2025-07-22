-- 14-create-task-verifications.sql

create table if not exists task_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  task_id uuid not null,
  quest_id uuid,
  type text not null,
  status text not null default 'pending', -- pending, success, failed
  attempts int not null default 0,
  last_attempt timestamptz,
  result jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_task_verifications_user_task on task_verifications (user_id, task_id); 

-- Enable RLS
alter table task_verifications enable row level security;

-- Policy: Allow users to insert their own verification attempts
create policy "Allow insert for own user_id" on task_verifications
  for insert using (auth.uid() = user_id);

-- Policy: Allow users to select their own verification records
create policy "Allow select for own user_id" on task_verifications
  for select using (auth.uid() = user_id);

-- Policy: Allow admins to update status (example: role = 'admin')
create policy "Allow admin update" on task_verifications
  for update using (exists (select 1 from auth.users where id = auth.uid() and raw_user_meta_data->>'role' = 'admin'));

-- Block all other access by default 