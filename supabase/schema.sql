-- ==============================================================================
-- KANBANFLOW SECURE DATABASE SCHEMA & AUTH TRIGGERS
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
-- Automatically makes the 1st registered user an 'admin', and all subsequent users 'member'
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  user_count integer;
  assigned_role text;
  user_name text;
begin
  -- Check existing profile count
  select count(*) into user_count from public.profiles;

  -- 1st user is automatically assigned 'admin', subsequent users default to 'member'
  if user_count = 0 then
    assigned_role := 'admin';
  else
    assigned_role := 'member';
  end if;

  user_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'name',
    new.raw_user_meta_data->>'display_name',
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, email, role, job_title, avatar_url)
  values (
    new.id,
    user_name,
    new.email,
    assigned_role,
    coalesce(new.raw_user_meta_data->>'job_title', case when assigned_role = 'admin' then 'Workspace Owner' else 'Team Member' end),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do update set
    full_name = excluded.full_name,
    email = excluded.email,
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    job_title = coalesce(excluded.job_title, profiles.job_title),
    updated_at = now();

  return new;
end;
$$;

-- Trigger to execute whenever a new auth user is created
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. PREVENT ROLE SELF-ESCALATION TRIGGER
-- Ensures members cannot promote themselves to 'admin' via client-side updates
-- ------------------------------------------------------------------------------
create or replace function public.prevent_role_self_escalation()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.role is distinct from old.role then
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    ) then
      raise exception 'Unauthorized: Only workspace admins may change member roles.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_profile_role on public.profiles;
create trigger guard_profile_role
  before update on public.profiles
  for each row execute function public.prevent_role_self_escalation();

-- ------------------------------------------------------------------------------
-- 4. WORKSPACES TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.workspaces (
  id text primary key,
  name text not null,
  description text default '',
  accent_color text default '#4f46e5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 5. BOARDS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.boards (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-1',
  title text not null,
  description text default '',
  color text default '#4f46e5',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 6. COLUMNS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.columns (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  title text not null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 7. TASKS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.tasks (
  id text primary key,
  board_id text references public.boards(id) on delete cascade not null,
  column_id text references public.columns(id) on delete cascade not null,
  title text not null,
  description text default '',
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date text,
  assignee_id uuid references auth.users(id) on delete set null,
  "order" integer not null default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 8. TASK COMMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_comments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  user_name text not null,
  user_avatar text default '',
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 9. TASK ATTACHMENTS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.task_attachments (
  id text primary key,
  task_id text references public.tasks(id) on delete cascade not null,
  name text not null,
  size integer not null default 0,
  type text default '',
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 10. NOTIFICATIONS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.notifications (
  id text primary key,
  recipient_id uuid references auth.users(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null,
  sender_avatar text default '',
  type text not null check (type in ('task_assigned', 'status_changed', 'comment_added', 'due_date_approaching')),
  message text not null,
  task_id text,
  task_title text,
  board_id text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 11. ACTIVITY LOGS TABLE
-- ------------------------------------------------------------------------------
create table if not exists public.activity_logs (
  id text primary key,
  workspace_id text references public.workspaces(id) on delete cascade default 'ws-1',
  user_id uuid references auth.users(id) on delete set null,
  user_name text not null,
  user_avatar text default '',
  action text not null,
  entity_title text not null,
  board_title text default '',
  details text default '',
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

-- ------------------------------------------------------------------------------
-- 12. ROW LEVEL SECURITY (RLS) POLICIES
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

-- Helper function to check if current user is admin
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$ language sql security definer set search_path = public, pg_temp;

-- Drop existing policies if re-running
drop policy if exists "Allow authenticated read on profiles" on public.profiles;
drop policy if exists "Allow profile self update" on public.profiles;
drop policy if exists "Allow admin update on profiles" on public.profiles;
drop policy if exists "Allow authenticated all on workspaces" on public.workspaces;
drop policy if exists "Allow authenticated read on workspaces" on public.workspaces;
drop policy if exists "Allow admin modify on workspaces" on public.workspaces;
drop policy if exists "Allow authenticated all on boards" on public.boards;
drop policy if exists "Allow authenticated all on columns" on public.columns;
drop policy if exists "Allow authenticated all on tasks" on public.tasks;
drop policy if exists "Allow authenticated all on task_comments" on public.task_comments;
drop policy if exists "Allow authenticated all on task_attachments" on public.task_attachments;
drop policy if exists "Allow authenticated all on notifications" on public.notifications;
drop policy if exists "Allow recipient read on notifications" on public.notifications;
drop policy if exists "Allow authenticated insert notifications" on public.notifications;
drop policy if exists "Allow recipient update notifications" on public.notifications;
drop policy if exists "Allow recipient delete notifications" on public.notifications;
drop policy if exists "Allow authenticated all on activity_logs" on public.activity_logs;

-- Policies for Authenticated users
create policy "Allow authenticated read on profiles" on public.profiles for select using (auth.role() = 'authenticated');
create policy "Allow profile self update" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "Allow admin update on profiles" on public.profiles for update using (public.is_admin());

-- Workspace Policies
create policy "Allow authenticated read on workspaces" on public.workspaces for select using (auth.role() = 'authenticated');
create policy "Allow admin modify on workspaces" on public.workspaces for all using (public.is_admin());

-- Boards, Columns, Tasks, Comments, Attachments
create policy "Allow authenticated all on boards" on public.boards for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on columns" on public.columns for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on tasks" on public.tasks for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on task_comments" on public.task_comments for all using (auth.role() = 'authenticated');
create policy "Allow authenticated all on task_attachments" on public.task_attachments for all using (auth.role() = 'authenticated');

-- Targeted Notification Policies (recipient-scoped)
create policy "Allow recipient read on notifications" on public.notifications for select using (auth.uid() = recipient_id);
create policy "Allow authenticated insert notifications" on public.notifications for insert with check (auth.role() = 'authenticated');
create policy "Allow recipient update notifications" on public.notifications for update using (auth.uid() = recipient_id);
create policy "Allow recipient delete notifications" on public.notifications for delete using (auth.uid() = recipient_id);

-- Activity Logs (readable & insertable by workspace members)
create policy "Allow authenticated all on activity_logs" on public.activity_logs for all using (auth.role() = 'authenticated');

-- ------------------------------------------------------------------------------
-- 13. STORAGE BUCKETS & POLICIES
-- ------------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('attachments', 'attachments', true), ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "Read attachments" on storage.objects;
drop policy if exists "Public read avatars" on storage.objects;
drop policy if exists "Authenticated upload objects" on storage.objects;
drop policy if exists "Owner deletes own objects" on storage.objects;

create policy "Read attachments" on storage.objects for select using (bucket_id = 'attachments' and auth.role() = 'authenticated');
create policy "Public read avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Authenticated upload objects" on storage.objects for insert with check (bucket_id in ('attachments', 'avatars') and auth.role() = 'authenticated');
create policy "Owner deletes own objects" on storage.objects for delete using (bucket_id in ('attachments', 'avatars') and (owner = auth.uid() or public.is_admin()));

