-- ==============================================================================
-- KANBANFLOW FULL DATABASE SCHEMA & AUTH TRIGGERS
-- Paste this entire file into the Supabase SQL Editor and click 'Run'.
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (Linked directly to auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null unique,
  avatar_url text default '',
  role text not null default 'member' check (role in ('admin', 'member')),
  job_title text default 'Team Member',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 2. AUTOMATIC FIRST-USER ADMIN TRIGGER FUNCTION
-- Automatically makes the 1st registered user an 'admin', and others 'member'
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as 
declare
  user_count integer;
  assigned_role text;
  user_name text;
begin
  -- Check existing profile count
  select count(*) into user_count from public.profiles;

  -- 1st user is automatically assigned 'admin', subsequent users get 'member' (or metadata role if provided)
  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := coalesce(new.raw_user_meta_data->>'role', 'member');
  end if;

  user_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));

  insert into public.profiles (id, full_name, email, role, job_title, avatar_url)
  values (
    new.id,
    user_name,
    new.email,
    assigned_role,
    coalesce(new.raw_user_meta_data->>'job_title', 'Team Member'),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = excluded.avatar_url,
    job_title = excluded.job_title,
    updated_at = now();

  return new;
end;
 language plpgsql security definer;

-- Trigger to execute whenever a new auth user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. WORKSPACES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.workspaces (
  id text primary key default ('ws-' || extract(epoch from now())::text),
  name text not null,
  description text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Insert default workspace if not exists
insert into public.workspaces (id, name, description)
values ('ws-default', 'Acme Product Team', 'Collaborative engineering and product management workspace.')
on conflict (id) do nothing;

-- ------------------------------------------------------------------------------
-- 4. BOARDS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.boards (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete set null default 'ws-default',
  title text not null,
  description text default '',
  color text default '#4f46e5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 5. COLUMNS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.columns (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  title text not null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. TASKS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.tasks (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  column_id text references public.columns(id) on delete cascade not null,
  title text not null,
  description text default '',
  assignee_id text,
  due_date text,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 7. TASK COMMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_comments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  user_id text not null,
  user_name text not null,
  user_avatar text default '',
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 8. TASK ATTACHMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  name text not null,
  size bigint not null default 0,
  type text not null default 'application/octet-stream',
  url text not null,
  uploaded_by text not null,
  uploaded_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 9. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_id text not null,
  sender_id text not null,
  sender_name text not null,
  sender_avatar text default '',
  task_id text,
  task_title text,
  board_id text,
  type text not null default 'task_assigned',
  message text not null,
  is_read boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 10. ACTIVITY LOGS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id text primary key,
  user_id text not null,
  user_name text not null,
  user_avatar text default '',
  action text not null,
  entity_title text not null,
  board_title text,
  details text,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.workspaces enable row level security;
alter table public.boards enable row level security;
alter table public.columns enable row level security;
alter table public.tasks enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_attachments enable row level security;
alter table public.notifications enable row level security;
alter table public.activity_logs enable row level security;

-- Authenticated users policies
create policy "Allow authenticated read on profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Allow profile self update" on public.profiles for update using (auth.uid() = id);

create policy "Allow authenticated all on workspaces" on public.workspaces for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on boards" on public.boards for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on columns" on public.columns for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on tasks" on public.tasks for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on task_comments" on public.task_comments for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on task_attachments" on public.task_attachments for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on notifications" on public.notifications for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on activity_logs" on public.activity_logs for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 12. STORAGE BUCKETS
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

create policy "Public Access to Attachments" on storage.objects for select using (bucket_id in ('attachments', 'avatars'));
create policy "Authenticated Upload to Attachments" on storage.objects for insert with check (bucket_id in ('attachments', 'avatars') and auth.role() = 'authenticated');
create policy "Authenticated Delete on Attachments" on storage.objects for delete using (bucket_id in ('attachments', 'avatars') and auth.role() = 'authenticated');
